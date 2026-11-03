// <pixel-sprite sprite="rag" nonce="3" label="…">
// Draws one of the 24×24 pixel-art sprites from `src/data/pixel-sprites.ts`
// on a canvas and *assembles* it: every lit pixel starts scattered around its
// slot and flies in to it, staggered, then a single highlight sweeps across
// the finished picture. Changing `sprite` — or bumping `nonce` to replay the
// same one — restarts the assembly immediately, from wherever it is, instead
// of queueing behind the previous one (the Bancada de IA terminal fires this on
// every click and every typed match, so it must never make a visitor wait).
//
// Colors come from the page's own theme tokens (the same `--rgb-*` triplets
// <matrix-rain> reads) and are re-read when `data-theme` flips, so the
// sprite follows Warm Forge / Cold Steel instead of being baked in.
//
// Under `prefers-reduced-motion` the sprite is painted finished, once — no
// flight, no sweep. The pixel counter is the one piece of chrome this element
// owns (bottom-left); everything else about the panel it sits in lives in the
// `.dc.html`.
//
// Everything it draws goes into a shadow root, not its light DOM: the DC
// runtime converts the page's already-upgraded template DOM into React
// elements, so a canvas appended to the light DOM gets adopted as a React
// child and duplicated (a second canvas, a stale counter) on mount.
//
// Compiled standalone (esbuild, --bundle --format=iife) and loaded via a
// plain <script src="./components/pixel-sprite.js"> tag. The sprite data is
// bundled in; DOM lib types are ambient.
import { SPRITES, SPRITE_SIZE, type PaletteKey, type SpriteTone } from '../data/pixel-sprites';

(function () {
  if (window.customElements && customElements.get('pixel-sprite')) return;

  type Rgb = readonly [number, number, number];

  /** One lit cell and the timing of its flight. */
  interface Cell {
    x: number;
    y: number;
    key: PaletteKey;
    /** ms before this cell starts moving. */
    delay: number;
    /** Where it starts, relative to its slot, in cells. */
    fx: number;
    fy: number;
  }

  const FLIGHT_MS = 520;
  const SPREAD_MS = 520;
  const SWEEP_MS = 520;
  const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  function readRgb(name: string, fallback: Rgb): Rgb {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const parts = raw.split(',').map((s) => parseInt(s, 10));
    const [r, g, b] = parts;
    return r !== undefined && g !== undefined && b !== undefined && !parts.some(Number.isNaN) ? [r, g, b] : fallback;
  }

  const mix = (a: Rgb, b: Rgb, k: number): Rgb => [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
  const css = (c: Rgb): string => `rgb(${c[0]},${c[1]},${c[2]})`;

  class PixelSprite extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['sprite', 'nonce'];
    }

    private _canvas: HTMLCanvasElement | null = null;
    private _count: HTMLSpanElement | null = null;
    private _ctx: CanvasRenderingContext2D | null = null;
    private _cells: Cell[] = [];
    private _palette: Record<PaletteKey, string> | null = null;
    private _tone: SpriteTone = 'ia';
    private _raf = 0;
    private _t0 = 0;
    private _ro: ResizeObserver | null = null;
    private _themeObserver: MutationObserver | null = null;
    private _sig = '';

    connectedCallback(): void {
      if (!this._canvas) {
        const sr = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
        const st = document.createElement('style');
        st.textContent = ':host{display:block;position:relative}canvas{position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated}'
          + 'span{position:absolute;left:8px;bottom:6px;font:9.5px/1 "JetBrains Mono",monospace;letter-spacing:.08em;color:var(--color-text-muted);pointer-events:none;font-variant-numeric:tabular-nums}';
        const cv = document.createElement('canvas');
        const count = document.createElement('span');
        count.setAttribute('aria-hidden', 'true');
        sr.append(st, cv, count);
        this._canvas = cv;
        this._count = count;
        this._ctx = cv.getContext('2d');
        this.setAttribute('role', 'img');
      }
      this._ro = new ResizeObserver(() => { this._resize(); this._paintNow(); });
      this._ro.observe(this);
      this._themeObserver = new MutationObserver(() => { this._palette = null; this._paintNow(); });
      this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      this._resize();
      this._start();
    }

    disconnectedCallback(): void {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
      this._ro?.disconnect();
      this._themeObserver?.disconnect();
    }

    attributeChangedCallback(): void {
      if (this.isConnected) this._start();
    }

    private _resize(): void {
      const cv = this._canvas;
      if (!cv) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const side = Math.max(1, Math.round(Math.min(this.clientWidth, this.clientHeight || this.clientWidth) * dpr));
      // A whole number of device pixels per cell keeps every cell edge crisp.
      const px = Math.max(SPRITE_SIZE, Math.floor(side / SPRITE_SIZE) * SPRITE_SIZE);
      if (cv.width !== px) { cv.width = px; cv.height = px; }
    }

    private _loadPalette(): Record<PaletteKey, string> {
      if (this._palette) return this._palette;
      const bg = readRgb('--rgb-bg-base', [27, 25, 23]);
      const text = readRgb('--rgb-text-main', [241, 234, 221]);
      const base = readRgb('--rgb-branch-' + this._tone, [228, 98, 46]);
      this._palette = {
        a: css(base),
        l: css(mix(base, [255, 255, 255], 0.42)),
        d: css(mix(base, bg, 0.62)),
        w: css(text),
        y: css(readRgb('--rgb-support-amber', [224, 165, 68])),
        s: css(readRgb('--rgb-support-steel', [126, 140, 145])),
        k: css(bg),
        g: css(mix(text, bg, 0.62)),
      };
      return this._palette;
    }

    /** (Re)builds the cell list for the current `sprite` and starts the flight. */
    private _start(): void {
      const id = this.getAttribute('sprite') ?? '';
      const sig = id + '#' + (this.getAttribute('nonce') ?? '');
      if (sig === this._sig) return;
      this._sig = sig;
      cancelAnimationFrame(this._raf);
      this._raf = 0;

      const spr = SPRITES[id];
      if (!spr) { this._cells = []; this._paintNow(); return; }
      this._tone = spr.tone;
      this._palette = null;
      this.setAttribute('aria-label', this.getAttribute('label') ?? id);

      const cells: Cell[] = [];
      spr.rows.forEach((row, y) => {
        [...row].forEach((ch, x) => {
          if (ch === '.') return;
          const ang = Math.random() * Math.PI * 2;
          const dist = 3 + Math.random() * 9;
          cells.push({
            x, y, key: ch as PaletteKey,
            // Mostly random, bent a little toward top-to-bottom so the shape
            // reads as being *drawn* rather than dissolving in as pure noise.
            delay: (Math.random() * 0.62 + (y / SPRITE_SIZE) * 0.38) * SPREAD_MS,
            fx: Math.cos(ang) * dist,
            fy: Math.sin(ang) * dist,
          });
        });
      });
      this._cells = cells;

      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        this._t0 = -1e9; // as if the whole thing finished long ago
        this._paintNow();
        return;
      }
      this._t0 = performance.now();
      this._raf = requestAnimationFrame(this._frame);
    }

    private _frame = (now: number): void => {
      this._raf = 0;
      const done = this._draw(now - this._t0);
      if (!done) this._raf = requestAnimationFrame(this._frame);
    };

    private _paintNow(): void {
      if (this._raf) return; // the running loop repaints on its own
      this._draw(1e9);
    }

    /** Paints elapsed `t` ms into the animation; returns true once it has fully settled. */
    private _draw(t: number): boolean {
      const cv = this._canvas, ctx = this._ctx;
      if (!cv || !ctx) return true;
      const pal = this._loadPalette();
      const cs = cv.width / SPRITE_SIZE;
      ctx.clearRect(0, 0, cv.width, cv.height);

      const settleAt = SPREAD_MS + FLIGHT_MS;
      const sweepP = (t - settleAt) / SWEEP_MS;
      const sweeping = sweepP >= 0 && sweepP <= 1;
      let landed = 0;

      for (const c of this._cells) {
        const p = Math.min(1, Math.max(0, (t - c.delay) / FLIGHT_MS));
        if (p >= 1) landed++;
        if (p <= 0) continue;
        const e = easeOutExpo(p);
        const x = c.x + c.fx * (1 - e);
        const y = c.y + c.fy * (1 - e);
        // In flight a cell is the bright "text" color and translucent; it
        // takes on its real palette color as it lands.
        ctx.globalAlpha = p < 1 ? 0.25 + 0.75 * e : 1;
        ctx.fillStyle = p < 0.85 ? pal.w : pal[c.key];
        if (sweeping) {
          // Diagonal band of lightness traveling top-left → bottom-right.
          const d = (c.x + c.y) / (SPRITE_SIZE * 2) - sweepP * 1.3 + 0.15;
          if (Math.abs(d) < 0.09) ctx.fillStyle = pal.w;
        }
        const px = Math.round(x * cs), py = Math.round(y * cs);
        ctx.fillRect(px, py, Math.ceil(cs), Math.ceil(cs));
      }
      ctx.globalAlpha = 1;

      if (this._count) {
        const total = this._cells.length;
        this._count.textContent = total ? String(landed).padStart(3, '0') + '/' + String(total).padStart(3, '0') + ' px' : '';
      }
      return t >= settleAt + SWEEP_MS;
    }
  }
  customElements.define('pixel-sprite', PixelSprite);
})();
