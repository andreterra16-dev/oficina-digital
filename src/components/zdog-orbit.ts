// <zdog-orbit variant="hero|ring">
// A handful of small Zdog (flat, pseudo-3D) objects that float beside the
// character: a cube, a ring, a hexagon, a `</>` glyph and a few "voxel"
// pixels — the same vocabulary as the page's pixel art and its code-first
// subject. They sit at fixed spots just outside the card (a path that
// orbited *through* it would pass over André's face), spin and bob gently,
// and parallax against the pointer by their depth. Colors come from the page's
// theme tokens and follow the Warm Forge / Cold Steel switch.
//
// Zdog is tiny (~30 KB) and has no WebGL, so it is bundled right into this
// file. It renders inside a shadow root for the same reason as the other
// custom elements here (the DC runtime adopts light-DOM children into React).
// Under `prefers-reduced-motion` it paints one still frame.
//
// Compiled standalone (esbuild, --bundle --format=iife) and loaded via a
// plain <script src="./components/zdog-orbit.js"> tag.
import Zdog from 'zdog';

(function () {
  if (window.customElements && customElements.get('zdog-orbit')) return;

  type Token = '--color-accent' | '--color-support-amber' | '--color-support-steel' | '--color-support-peach' | '--color-text-main';
  type Shape3D = { color: string; leftFace?: string; rightFace?: string; topFace?: string; bottomFace?: string; frontFace?: string; rearFace?: string };

  /** One floating object: its Zdog shape(s), where it sits and how it moves. */
  interface Item {
    anchor: Zdog.Anchor;
    /** Position as a fraction of the canvas, centered on 0. */
    fx: number;
    fy: number;
    z: number;
    paint: (c: (t: Token, k?: number) => string) => void;
    move: (t: number) => void;
    /** Resting Y in illustration units, set on resize; the bob is added on top. */
    baseY?: number;
  }

  function hexToRgb(h: string): [number, number, number] {
    const m = h.trim().replace('#', '');
    const v = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
    return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0];
  }
  /** `k` < 1 darkens toward black, > 1 lightens toward white — Zdog has no lighting, so faces are shaded by hand. */
  function shade(hex: string, k: number): string {
    const [r, g, b] = hexToRgb(hex);
    const f = (n: number): number => Math.round(k < 1 ? n * k : n + (255 - n) * (k - 1));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }

  class ZdogOrbit extends HTMLElement {
    private _canvas: HTMLCanvasElement | null = null;
    private _illo: Zdog.Illustration | null = null;
    private _items: Item[] = [];
    private _raf = 0;
    private _visible = false;
    private _io: IntersectionObserver | null = null;
    private _ro: ResizeObserver | null = null;
    private _themeObserver: MutationObserver | null = null;
    private _px = 0;
    private _py = 0;
    private _tx = 0;
    private _ty = 0;
    private _t = 0;
    private _last = 0;
    private _reduced = false;

    connectedCallback(): void {
      if (this._canvas) return;
      const sr = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
      const st = document.createElement('style');
      st.textContent = ':host{display:block;pointer-events:none}canvas{display:block;width:100%;height:100%}';
      this._canvas = document.createElement('canvas');
      this._canvas.setAttribute('aria-hidden', 'true');
      sr.append(st, this._canvas);
      this._reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      this._build();
      this._io = new IntersectionObserver((es) => {
        for (const e of es) this._visible = e.isIntersecting;
        this._sync();
      });
      this._io.observe(this);
      this._ro = new ResizeObserver(() => { this._resize(); this._render(); });
      this._ro.observe(this);
      this._themeObserver = new MutationObserver(() => { this._paint(); this._render(); });
      this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      window.addEventListener('pointermove', this._onPointer, { passive: true });
      document.addEventListener('visibilitychange', this._sync);
    }

    disconnectedCallback(): void {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
      this._io?.disconnect();
      this._ro?.disconnect();
      this._themeObserver?.disconnect();
      window.removeEventListener('pointermove', this._onPointer);
      document.removeEventListener('visibilitychange', this._sync);
      this._canvas = null;
      this._illo = null;
      this._items = [];
    }

    private _onPointer = (ev: PointerEvent): void => {
      this._tx = (ev.clientX / window.innerWidth) * 2 - 1;
      this._ty = (ev.clientY / window.innerHeight) * 2 - 1;
    };

    private _color = (t: Token, k = 1): string => {
      const hex = getComputedStyle(document.documentElement).getPropertyValue(t).trim() || '#E4622E';
      return k === 1 ? hex : shade(hex, k);
    };

    private _build(): void {
      if (!this._canvas) return;
      const ring = this.getAttribute('variant') === 'ring';
      const illo = new Zdog.Illustration({ element: this._canvas, rotate: { x: -0.22, y: 0.35 }, zoom: 1 });
      this._illo = illo;
      const items: Item[] = [];

      const cube = (fx: number, fy: number, z: number, size: number, tok: Token, spin: number): Item => {
        const a = new Zdog.Anchor({ addTo: illo });
        const box = new Zdog.Box({ addTo: a, width: size, height: size, depth: size, stroke: 2 });
        return {
          anchor: a, fx, fy, z,
          paint: (c) => {
            const faces: Shape3D = { color: c(tok), leftFace: c(tok, 0.78), rightFace: c(tok, 0.62), topFace: c(tok, 1.3), bottomFace: c(tok, 0.5), frontFace: c(tok), rearFace: c(tok, 0.7) };
            Object.assign(box, faces);
          },
          move: (t) => { a.rotate.y = t * spin; a.rotate.x = t * spin * 0.6; },
        };
      };
      const voxel = (fx: number, fy: number, z: number, tok: Token, seed: number): Item => cube(fx, fy, z, 9, tok, 0.9 + seed * 0.3);

      const ringShape = (fx: number, fy: number, z: number, d: number, tok: Token): Item => {
        const a = new Zdog.Anchor({ addTo: illo });
        const e = new Zdog.Ellipse({ addTo: a, diameter: d, stroke: 5 });
        const dot = new Zdog.Shape({ addTo: a, translate: { x: d / 2 }, stroke: 9 });
        return {
          anchor: a, fx, fy, z,
          paint: (c) => { e.color = c(tok); dot.color = c('--color-text-main'); },
          move: (t) => { a.rotate.x = t * 0.9; a.rotate.y = Math.sin(t * 0.7) * 0.8; },
        };
      };

      const hexagon = (fx: number, fy: number, z: number, r: number, tok: Token): Item => {
        const a = new Zdog.Anchor({ addTo: illo });
        const h = new Zdog.Polygon({ addTo: a, radius: r, sides: 6, stroke: 5 });
        const core = new Zdog.Shape({ addTo: a, stroke: 8 });
        return {
          anchor: a, fx, fy, z,
          paint: (c) => { h.color = c(tok); core.color = c(tok, 1.25); },
          move: (t) => { a.rotate.z = t * 0.5; a.rotate.x = Math.sin(t * 0.6) * 0.7; },
        };
      };

      const glyph = (fx: number, fy: number, z: number, tok: Token): Item => {
        const a = new Zdog.Anchor({ addTo: illo });
        const mk = (path: Array<{ x: number; y: number }>): Zdog.Shape => new Zdog.Shape({ addTo: a, path, closed: false, stroke: 6 });
        const parts = [
          mk([{ x: -9, y: -12 }, { x: -22, y: 0 }, { x: -9, y: 12 }]),
          mk([{ x: 4, y: -15 }, { x: -4, y: 15 }]),
          mk([{ x: 9, y: -12 }, { x: 22, y: 0 }, { x: 9, y: 12 }]),
        ];
        return {
          anchor: a, fx, fy, z,
          paint: (c) => parts.forEach((p, i) => { p.color = i === 1 ? c('--color-text-main') : c(tok); }),
          // A swing, not a spin: edge-on it would vanish, and it has to stay legible as `</>`.
          move: (t) => { a.rotate.y = Math.sin(t * 0.8) * 0.65; a.rotate.x = Math.cos(t * 0.6) * 0.18; },
        };
      };

      if (ring) {
        // Compact set for the round portraits: voxels riding just outside the rings.
        items.push(cube(-0.46, -0.2, 14, 16, '--color-support-amber', 0.8));
        items.push(ringShape(0.42, 0.34, -10, 30, '--color-accent'));
        items.push(voxel(0.38, -0.4, 20, '--color-support-peach', 0.4));
        items.push(voxel(-0.4, 0.38, -12, '--color-accent', 0.9));
      } else {
        items.push(cube(-0.42, -0.45, 18, 30, '--color-support-amber', 0.7));
        items.push(glyph(0.43, -0.36, 22, '--color-accent'));
        items.push(ringShape(-0.45, 0.2, -16, 46, '--color-accent'));
        items.push(hexagon(0.44, 0.17, -10, 24, '--color-support-steel'));
        items.push(voxel(-0.4, 0.44, 24, '--color-support-peach', 0.2));
        items.push(voxel(0.4, 0.46, 12, '--color-support-amber', 0.6));
        items.push(voxel(0.05, -0.47, 30, '--color-accent', 1));
        items.push(voxel(-0.2, -0.46, -12, '--color-support-steel', 0.5));
      }
      this._items = items;
      this._resize();
      this._paint();
      this._render();
    }

    private _paint(): void {
      this._items.forEach((it) => it.paint(this._color));
    }

    private _resize(): void {
      const illo = this._illo;
      if (!illo) return;
      const w = Math.max(1, this.clientWidth), h = Math.max(1, this.clientHeight);
      illo.setSize(w, h);
      // Scale the whole set with the canvas so it reads the same on a phone.
      illo.zoom = Math.max(0.55, Math.min(1.25, Math.min(w, h * 0.72) / 520));
      for (const it of this._items) {
        it.baseY = (it.fy * h) / illo.zoom;
        it.anchor.translate = { x: (it.fx * w) / illo.zoom, y: it.baseY, z: it.z };
      }
    }

    private _render(): void {
      const illo = this._illo;
      if (!illo) return;
      for (const it of this._items) it.move(this._t);
      illo.rotate.y = 0.35 + this._px * 0.45;
      illo.rotate.x = -0.22 + this._py * 0.25;
      illo.updateRenderGraph();
    }

    private _sync = (): void => {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
      if (this._reduced || !this._visible || document.hidden) return;
      this._last = performance.now();
      this._raf = requestAnimationFrame(this._frame);
    };

    private _frame = (now: number): void => {
      this._raf = requestAnimationFrame(this._frame);
      const dt = Math.min(0.05, (now - this._last) / 1000 || 0.016);
      this._last = now;
      this._t += dt;
      const k = 1 - Math.exp(-dt * 4);
      this._px += (this._tx - this._px) * k;
      this._py += (this._ty - this._py) * k;
      // Gentle bob on top of each item's own motion.
      for (const it of this._items) it.anchor.translate.y = (it.baseY ?? 0) + Math.sin(this._t * 1.1 + it.fx * 9) * 4;
      this._render();
    };
  }
  customElements.define('zdog-orbit', ZdogOrbit);
})();
