// The Three.js half of <character-3d> (see character-3d.ts and docs/3d-character.md):
// a tiny scene that turns a flat character image into a living, parallaxing figure.
//
// There is no 3D model of André — only illustrations — so this builds a
// *depth photo*: the image is mapped onto a finely subdivided plane, and each
// vertex is pushed toward the camera by the value in a depth map (generated
// offline by scripts/depth/make-depth.py: white = near). Tilting the plane
// with the pointer then moves the figure against its backdrop the way a real
// object would, a vertex shader adds a slow "breathing" swell, and a fragment
// shader derives a normal from the depth map to catch a moving light.
//
// A limb can be animated on top of that as a *second layer*: the contact
// portrait's waving forearm is cut out of the image (scripts/depth/make-arm.py),
// the backdrop is rebuilt behind it in the base layer, and the cut-out is drawn
// as its own plane that rotates rigidly about the elbow. This replaced a first
// attempt that bent the mesh around the arm in the vertex shader, which dragged
// the surrounding backdrop and sleeve with it and smeared the hand: a rigid
// layer moves the pixels without resampling them, so the hand stays crisp.
//
// This file is the only one that imports three.js, and it is built as a
// separate ES module (components/three-stage.js) that the custom element
// loads on demand with `import()` — visitors who never reach a character
// (or who prefer reduced motion) never download the ~500 KB renderer.
import {
  Cache,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  TextureLoader,
  WebGLRenderer,
  type Texture,
} from 'three';

export interface StageOptions {
  canvas: HTMLCanvasElement;
  /** The base layer's texture (sRGB image, straight alpha). */
  image: string;
  /** Depth map, same framing as the image (white = near). */
  depth: string;
  /** How far the nearest point of the figure sits in front of the backdrop,
   *  in units of the image's height. */
  amp: number;
  /** Idle sway strength; 1 = the default gentle motion. */
  sway: number;
  /** `contain` keeps the whole image in frame (rectangular cards); `cover`
   *  fills the frame and crops the overflow (round portraits, where a
   *  letterboxed edge would show as a flat cut inside the circle). */
  fit: 'contain' | 'cover';
  /** Final push-in once live, as a multiple of the fitted size — enough that
   *  the tilted plane's edges never come into frame. */
  zoom: number;
  /** Optional animated limb: a second layer, pixel-aligned with the base, that
   *  swings about `pivot` (image UV, y up — the elbow). */
  arm?: {
    image: string;
    pivot: [number, number];
    /** Peak swing, radians. */
    amp: number;
    /** Angular speed of the swing, radians per second. */
    speed: number;
  };
}

export interface Stage {
  start(): void;
  stop(): void;
  /** Plays the entrance: the picture assembles from square tiles, in random
   *  order, in about a second. Idempotent — it plays once per scene. */
  reveal(): void;
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
varying vec2 vUv;
varying float vDepth;
void main() {
  vUv = uv;
  float d = texture2D(uDepth, uv).r;
  vDepth = d;
  vec3 p = position;
  // Breathing: the figure swells a hair toward the camera and rises with it.
  float b = sin(uTime * 1.45);
  p.z += d * (uAmp + 0.012 * b);
  p.y += d * 0.0035 * b;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform float uTime;
uniform vec2 uLight;
uniform float uReveal;
uniform float uAspect;
varying vec2 vUv;
varying float vDepth;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec4 c = texture2D(uMap, vUv);
  // Entrance: square tiles pop in at random, each flashing bright as it lands
  // (the same pixel-tile idea as <pixel-reveal>, but on the live scene). Every
  // layer hashes the same UV, so the layers assemble together.
  float h = hash(floor(vUv * vec2(26.0 * uAspect, 26.0)));
  float k = uReveal * 1.2 - h;
  if (k <= 0.0) discard;
  float fresh = 1.0 - smoothstep(0.0, 0.2, k);
  // A normal from the depth map's own slope, sampled per pixel from the (smooth,
  // linearly filtered) map rather than differentiated from the interpolated
  // vertex depth — screen-space derivatives are constant per triangle, which
  // shaded the figure in visible square patches. Where the surface turns toward
  // the light it brightens, where it turns away it dims: a soft relief shading
  // that only exists on the figure (the backdrop is depth 0).
  vec2 e = uTexel * 1.5;
  float dx = texture2D(uDepth, vUv + vec2(e.x, 0.0)).r - texture2D(uDepth, vUv - vec2(e.x, 0.0)).r;
  float dy = texture2D(uDepth, vUv + vec2(0.0, e.y)).r - texture2D(uDepth, vUv - vec2(0.0, e.y)).r;
  vec3 n = normalize(vec3(-dx * 8.0, -dy * 8.0, 1.0));
  vec3 l = normalize(vec3(uLight, 0.9));
  float lit = dot(n, l) - dot(vec3(0.0, 0.0, 1.0), l);
  float body = smoothstep(0.02, 0.2, vDepth);
  vec3 rgb = c.rgb * (1.0 + lit * 0.32 * body);
  // A slow diagonal sheen sweeping across the figure every few seconds.
  float sweep = fract(uTime * 0.13);
  float band = smoothstep(0.07, 0.0, abs((vUv.x + (1.0 - vUv.y)) * 0.5 - (sweep * 1.5 - 0.25)));
  rgb += band * body * 0.09;
  rgb += fresh * 0.4;
  gl_FragColor = vec4(rgb * c.a, c.a);
}`;

// The DC runtime mounts the page's React tree *after* the template was already
// parsed, replacing the parse-time <character-3d> elements with fresh ones; with
// the cache on, a second stage reuses the already-decoded images instead of
// fetching and decoding them again.
Cache.enabled = true;

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

/** Device-pixel budget for the canvas. Retina screens ask for 2×, which is 4× the
 *  fragments; this caps the total so a big hero card on a 2× display stays cheap. */
const MAX_PIXELS = 1_600_000;

export async function createStage(opts: StageOptions): Promise<Stage> {
  const { canvas } = opts;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  // The shader writes the image's own (already sRGB-encoded) values straight
  // through, so the renderer must not convert them again.
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const [map, depth, armMap] = await Promise.all([
    loadTexture(opts.image, true),
    loadTexture(opts.depth, false),
    opts.arm ? loadTexture(opts.arm.image, true) : Promise.resolve(null),
  ]);
  const img = map.image as { width: number; height: number };
  const aspect = img.width / img.height;

  const scene = new Scene();
  // A long lens (narrow FOV) keeps perspective distortion low, so the resting
  // pose is practically identical to the flat image.
  const camera = new PerspectiveCamera(16, 1, 0.1, 20);

  // Uniforms shared by every layer (same `{ value }` objects, so one write per
  // frame updates them all); each layer adds only its own `uMap`.
  const shared = {
    uDepth: { value: depth },
    uAmp: { value: opts.amp },
    uTime: { value: 0 },
    uLight: { value: [0.3, 0.4] },
    uReveal: { value: 0 },
    uAspect: { value: aspect },
    uTexel: { value: [1 / (depth.image as { width: number }).width, 1 / (depth.image as { height: number }).height] },
  };
  const geometry = new PlaneGeometry(aspect, 1, 64, Math.round(64 / aspect));
  const makeLayer = (texture: Texture, order: number): Mesh => {
    const mesh = new Mesh(geometry, new ShaderMaterial({
      uniforms: { ...shared, uMap: { value: texture } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      premultipliedAlpha: true,
      // Layers are flat sheets drawn back to front by `renderOrder`; depth
      // testing would only let their depth-displaced vertices fight each other.
      depthTest: false,
      depthWrite: false,
    }));
    mesh.renderOrder = order;
    return mesh;
  };

  const root = new Group();
  scene.add(root);
  root.add(makeLayer(map, 0));

  // The arm layer hangs off a pivot group placed at the elbow, with the mesh
  // offset the other way, so rotating the group swings the mesh about the elbow.
  let armPivot: Group | null = null;
  if (opts.arm && armMap) {
    const ax = (opts.arm.pivot[0] - 0.5) * aspect, ay = opts.arm.pivot[1] - 0.5;
    armPivot = new Group();
    armPivot.position.set(ax, ay, 0.004);
    const armMesh = makeLayer(armMap, 1);
    armMesh.position.set(-ax, -ay, 0);
    armPivot.add(armMesh);
    root.add(armPivot);
  }

  const lost: Array<() => void> = [];
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost.forEach((f) => f()); });

  let raf = 0;
  let running = false;
  let last = 0;
  let time = 0;
  let tx = 0, ty = 0; // target pointer
  let px = 0, py = 0; // smoothed pointer
  let baseZ = 3;
  let revealAt = -1;

  const fit = (): void => {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / (w * h))));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Distance at which the plane just fits (contain) or just fills (cover) the frame.
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const byHeight = 1 / (2 * t), byWidth = aspect / (2 * t * camera.aspect);
    const z = (opts.fit === 'cover' ? Math.min(byHeight, byWidth) : Math.max(byHeight, byWidth)) * 1.02;
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
    px += (tx - px) * k;
    py += (ty - py) * k;

    // Entrance (tiles, ~1.1s) and a slow push-in once live that keeps the tilted
    // plane's edges outside the frame.
    const rp = revealAt < 0 ? 0 : Math.min(1, (now - revealAt) / 1100);
    shared.uReveal.value = 1 - Math.pow(1 - rp, 2);
    const zp = revealAt < 0 ? 0 : Math.min(1, (now - revealAt) / 1800);
    camera.position.z = baseZ / (1 + (opts.zoom - 1) * (1 - Math.pow(1 - zp, 3)));

    // Pointer-driven tilt plus a slow idle sway that keeps it alive on touch
    // screens and when the pointer rests.
    const s = opts.sway;
    root.rotation.y = px * 0.17 + Math.sin(time * 0.55) * 0.05 * s;
    root.rotation.x = -py * 0.1 + Math.cos(time * 0.4) * 0.022 * s;
    root.position.y = Math.sin(time * 0.9) * 0.006 * s;

    // The wave: a rigid swing about the elbow whose strength itself breathes
    // (strong swings alternate with softer ones).
    if (armPivot && opts.arm) {
      armPivot.rotation.z = Math.sin(time * opts.arm.speed) * opts.arm.amp * (0.75 + 0.25 * Math.sin(time * 0.9));
    }

    shared.uTime.value = time;
    shared.uLight.value = [px * 0.9 + Math.sin(time * 0.35) * 0.35, 0.45 - py * 0.6];
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
    reveal(): void {
      if (revealAt >= 0) return; // the entrance plays once per scene
      revealAt = performance.now();
    },
    setPointer(x, y): void { tx = x; ty = y; },
    resize: fit,
    onLost(cb): void { lost.push(cb); },
    dispose(): void {
      running = false;
      cancelAnimationFrame(raf);
      geometry.dispose();
      root.traverse((o) => { if (o instanceof Mesh) (o.material as ShaderMaterial).dispose(); });
      map.dispose();
      depth.dispose();
      armMap?.dispose();
      renderer.dispose();
    },
  };
}
