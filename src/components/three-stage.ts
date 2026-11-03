// The Three.js half of <character-3d> (see character-3d.ts): a tiny scene
// that turns a flat character image into a living, parallaxing figure.
//
// There is no 3D model of André — only illustrations — so this builds a
// *depth-photo*: the image is mapped onto a finely subdivided plane, and each
// vertex is pushed toward the camera by the value in a depth map (generated
// offline by scripts/depth/make-depth.py: white = near). Tilting the plane
// with the pointer then moves the figure against its backdrop the way a real
// object would, a vertex shader adds a slow "breathing" swell, and a fragment
// shader derives a normal from the depth map to catch a moving light.
//
// This file is the only one that imports three.js, and it is built as a
// separate ES module (components/three-stage.js) that the custom element
// loads on demand with `import()` — visitors who never scroll to a character
// (or who prefer reduced motion) never download the ~500 KB renderer.
import {
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  TextureLoader,
  WebGLRenderer,
  type Texture,
} from 'three';

export interface StageOptions {
  canvas: HTMLCanvasElement;
  image: string;
  depth: string;
  /** How far the nearest point of the figure sits in front of the backdrop,
   *  in units of the image's height. */
  amp: number;
  /** Idle sway strength; 1 = the default gentle motion. */
  sway: number;
  /** Optional waving limb: the part of the image above `y0..y1` and left of
   *  `xFull..xFade` (all in image UV, y up) swings about the pivot (the
   *  elbow) — used for the contact portrait's goodbye wave. */
  wave?: { pivot: [number, number]; y0: number; y1: number; xFull: number; xFade: number; amp: number; speed: number };
}

export interface Stage {
  start(): void;
  stop(): void;
  /** Normalised pointer in [-1, 1] on both axes. */
  setPointer(x: number, y: number): void;
  resize(): void;
  onLost(cb: () => void): void;
  dispose(): void;
}

const VERT = /* glsl */ `
uniform sampler2D uDepth;
uniform float uAmp;
uniform float uTime;
uniform float uAspect;
uniform vec4 uWaveA; // pivot.xy, y0, y1
uniform vec4 uWaveB; // xFull, xFade, amp, speed
varying vec2 vUv;
varying float vDepth;
void main() {
  vUv = uv;
  float d = texture2D(uDepth, uv).r;
  vDepth = d;
  vec3 p = position;
  // Waving: rotate the forearm and hand about the elbow. The weight ramps from
  // 0 at the elbow to 1 at the wrist (so the upper arm stays put) and fades out
  // toward the torso, which keeps the sleeve from being dragged along.
  if (uWaveB.z > 0.0) {
    float w = smoothstep(uWaveA.z, uWaveA.w, uv.y) * (1.0 - smoothstep(uWaveB.x, uWaveB.y, uv.x));
    vec2 piv = vec2((uWaveA.x - 0.5) * uAspect, uWaveA.y - 0.5);
    // A wave that breathes: strong swings with softer ones in between.
    float ang = sin(uTime * uWaveB.w) * uWaveB.z * (0.72 + 0.28 * sin(uTime * 0.9)) * w;
    vec2 o = p.xy - piv;
    float c = cos(ang), sn = sin(ang);
    p.xy = piv + vec2(c * o.x - sn * o.y, sn * o.x + c * o.y);
  }
  // Breathing: the figure swells a hair toward the camera and rises with it.
  float b = sin(uTime * 1.45);
  p.z += d * (uAmp + 0.012 * b);
  p.y += d * 0.0035 * b;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uTime;
uniform vec2 uLight;
varying vec2 vUv;
varying float vDepth;
void main() {
  vec4 c = texture2D(uMap, vUv);
  // A normal from the depth map's own slope: where the surface turns toward
  // the light it brightens, where it turns away it dims — a soft relief
  // shading that only exists on the figure (the backdrop is depth 0).
  vec3 n = normalize(vec3(-dFdx(vDepth) * 90.0, -dFdy(vDepth) * 90.0, 1.0));
  vec3 l = normalize(vec3(uLight, 0.9));
  float lit = dot(n, l) - dot(vec3(0.0, 0.0, 1.0), l);
  float body = smoothstep(0.02, 0.2, vDepth);
  vec3 rgb = c.rgb * (1.0 + lit * 0.32 * body);
  // A slow diagonal sheen sweeping across the figure every few seconds.
  float sweep = fract(uTime * 0.13);
  float band = smoothstep(0.07, 0.0, abs((vUv.x + (1.0 - vUv.y)) * 0.5 - (sweep * 1.5 - 0.25)));
  rgb += band * body * 0.09;
  gl_FragColor = vec4(rgb * c.a, c.a);
}`;

function loadTexture(url: string, mips: boolean): Promise<Texture> {
  return new Promise((resolve, reject) => {
    new TextureLoader().load(url, (t) => {
      t.generateMipmaps = mips;
      t.minFilter = mips ? LinearMipmapLinearFilter : LinearFilter;
      t.magFilter = LinearFilter;
      resolve(t);
    }, undefined, reject);
  });
}

export async function createStage(opts: StageOptions): Promise<Stage> {
  const { canvas } = opts;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  // The shader writes the image's own (already sRGB-encoded) values straight
  // through, so the renderer must not convert them again.
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const [map, depth] = await Promise.all([loadTexture(opts.image, true), loadTexture(opts.depth, false)]);
  const img = map.image as { width: number; height: number };
  const aspect = img.width / img.height;

  const scene = new Scene();
  const camera = new PerspectiveCamera(16, 1, 0.1, 20);
  // A long lens (narrow FOV) keeps perspective distortion low, so the resting
  // pose is practically identical to the flat image it crossfades from.
  const group = new Mesh(
    new PlaneGeometry(aspect, 1, 80, Math.round(80 / aspect)),
    new ShaderMaterial({
      uniforms: {
        uMap: { value: map },
        uDepth: { value: depth },
        uAmp: { value: opts.amp },
        uTime: { value: 0 },
        uLight: { value: [0.3, 0.4] },
        uAspect: { value: aspect },
        uWaveA: { value: opts.wave ? [...opts.wave.pivot, opts.wave.y0, opts.wave.y1] : [0, 0, 0, 0] },
        uWaveB: { value: opts.wave ? [opts.wave.xFull, opts.wave.xFade, opts.wave.amp, opts.wave.speed] : [0, 0, 0, 0] },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      premultipliedAlpha: true,
    })
  );
  scene.add(group);

  const lost: Array<() => void> = [];
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost.forEach((f) => f()); });

  const uniforms = (group.material as ShaderMaterial).uniforms as Record<string, { value: unknown }>;
  let raf = 0;
  let running = false;
  let last = 0;
  let time = 0;
  let tx = 0, ty = 0; // target pointer
  let px = 0, py = 0; // smoothed pointer
  let baseZ = 3;

  const fit = (): void => {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Distance at which the whole plane just fits (contain), at this FOV.
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const z = Math.max(1 / (2 * t), aspect / (2 * t * camera.aspect)) * 1.02;
    baseZ = z + opts.amp * 0.5;
    camera.position.set(0, 0, baseZ);
    camera.updateProjectionMatrix();
  };
  fit();

  const frame = (now: number): void => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    time += dt;
    const k = 1 - Math.exp(-dt * 5);
    // A slow push-in once live: it starts exactly where the flat image sits (so
    // the crossfade from it is invisible) and settles 5% closer, which keeps the
    // tilted plane's edges outside the frame.
    camera.position.z = baseZ / (1 + 0.05 * (1 - Math.pow(1 - Math.min(1, time / 1.8), 3)));
    px += (tx - px) * k;
    py += (ty - py) * k;
    const s = opts.sway;
    // Pointer-driven tilt plus a slow idle sway that keeps it alive on touch
    // screens and when the pointer rests.
    group.rotation.y = px * 0.17 + Math.sin(time * 0.55) * 0.05 * s;
    group.rotation.x = -py * 0.1 + Math.cos(time * 0.4) * 0.022 * s;
    group.position.y = Math.sin(time * 0.9) * 0.006 * s;
    uniforms['uTime']!.value = time;
    uniforms['uLight']!.value = [px * 0.9 + Math.sin(time * 0.35) * 0.35, 0.45 - py * 0.6];
    renderer.render(scene, camera);
  };

  return {
    start(): void {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop(): void {
      running = false;
      cancelAnimationFrame(raf);
    },
    setPointer(x, y): void { tx = x; ty = y; },
    resize: fit,
    onLost(cb): void { lost.push(cb); },
    dispose(): void {
      running = false;
      cancelAnimationFrame(raf);
      group.geometry.dispose();
      (group.material as ShaderMaterial).dispose();
      map.dispose();
      depth.dispose();
      renderer.dispose();
    },
  };
}
