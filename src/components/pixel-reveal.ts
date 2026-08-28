// <pixel-reveal src="..." pixel-size="28" duration="2.2" replay="true" fade="0.9">
// Canvas tile-by-tile unfold reveal. Fills its container. Skips empty (transparent) tiles.
//
// Compiled standalone (esbuild, --bundle --format=iife) and loaded via a
// plain <script src="./components/pixel-reveal.js"> tag — no module
// import/export here, DOM lib types are ambient.
(function () {
  if (window.customElements && customElements.get('pixel-reveal')) return;

  /** One square tile of the source image, in element-local CSS pixels. */
  interface Tile {
    x: number;
    y: number;
  }

  const imgCache = new Map<string, Promise<HTMLImageElement>>();
  function loadImage(src: string): Promise<HTMLImageElement> {
    const cached = imgCache.get(src);
    if (cached) return cached;
    const p = new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
    imgCache.set(src, p);
    return p;
  }

  const easeOut = (p: number): number => 1 - Math.pow(1 - p, 3);

  class PixelReveal extends HTMLElement {
    private _raf = 0;
    private _gen = 0;
    private _tiles: Tile[] = [];
    private _sig = '';
    private _played = false;
    private _animating = false;
    private _built = false;
    private _canvas!: HTMLCanvasElement;
    private _off: HTMLCanvasElement | null = null;
    private _img: HTMLImageElement | null = null;
    private _dpr = 1;
    private _ro: ResizeObserver | null = null;
    private _io: IntersectionObserver | null = null;
    private _rt: ReturnType<typeof setTimeout> | undefined;

    connectedCallback(): void {
      if (!this._built) {
        this._built = true;
        this._canvas = document.createElement('canvas');
        Object.assign(this._canvas.style, {
          position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none',
        });
        this.appendChild(this._canvas);
      }
      const src = this.getAttribute('src');
      if (src) {
        loadImage(src)
          .then((im) => { this._img = im; this._build(); })
          .catch(() => {});
      }

      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(() => {
          clearTimeout(this._rt);
          this._rt = setTimeout(() => this._build(), 80);
        });
        this._ro.observe(this);
      }
      this._io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            if (!this._played) { this._played = true; this._animate(); }
          } else if (this.getAttribute('replay') === 'true' && this._played && !this._animating) {
            this._played = false;
            this._clear();
          }
        });
      }, { threshold: 0.15 });
      this._io.observe(this);
    }

    disconnectedCallback(): void {
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._ro) this._ro.disconnect();
      if (this._io) this._io.disconnect();
      clearTimeout(this._rt);
    }

    private get _px(): number {
      return Math.max(6, parseFloat(this.getAttribute('pixel-size') || '') || 28);
    }
    private get _dur(): number {
      return (parseFloat(this.getAttribute('duration') || '') || 2.2) * 1000;
    }

    private _build(): void {
      const img = this._img, cv = this._canvas;
      if (!img || !cv) return;
      const r = this.getBoundingClientRect();
      const cw = Math.round(r.width) || this.clientWidth;
      const ch = Math.round(r.height) || this.clientHeight;
      if (cw <= 0 || ch <= 0) return;
      const px = this._px;
      const sig = cw + 'x' + ch + '|' + px + '|' + this.getAttribute('src');
      if (sig === this._sig && this._tiles.length) return;
      this._sig = sig;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(cw * dpr);
      cv.height = Math.round(ch * dpr);
      const off = this._off || (this._off = document.createElement('canvas'));
      off.width = cv.width; off.height = cv.height;
      // `willReadFrequently` — this is the one canvas on the page that ever
      // calls `getImageData` (the alpha scan just below, once per image
      // load/resize to find which tiles aren't fully transparent). Without
      // the hint, browsers default to GPU-backed 2D contexts and the first
      // readback forces a GPU→CPU sync, logging a "Multiple readback
      // operations" perf warning; this hint tells the browser up front to
      // back this context with a CPU-side buffer instead, which is
      // actually faster for a context whose whole purpose here is to be
      // read from. The *visible* `<canvas>` this component paints tiles
      // onto (`_clear`/`_drawFull`/`_animate` below) never reads pixels
      // back — only draws — so it doesn't take this option.
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!octx) return;
      octx.clearRect(0, 0, off.width, off.height);
      octx.imageSmoothingQuality = 'high';
      // contain-fit so nothing is cropped
      const s = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      octx.drawImage(img, ((cw - dw) / 2) * dpr, ((ch - dh) / 2) * dpr, dw * dpr, dh * dpr);

      const data = octx.getImageData(0, 0, off.width, off.height).data;
      const cols = Math.ceil(cw / px), rows = Math.ceil(ch / px);
      const tiles: Tile[] = [];
      for (let row = 0; row < rows; row++) {
        for (let c = 0; c < cols; c++) {
          const x = c * px, y = row * px;
          const x0 = Math.floor(x * dpr), y0 = Math.floor(y * dpr);
          const x1 = Math.min(off.width, Math.ceil((x + px) * dpr));
          const y1 = Math.min(off.height, Math.ceil((y + px) * dpr));
          let has = false;
          const stepY = Math.max(1, Math.floor((y1 - y0) / 6));
          const stepX = Math.max(1, Math.floor((x1 - x0) / 6));
          for (let sy = y0; sy < y1 && !has; sy += stepY) {
            for (let sx = x0; sx < x1; sx += stepX) {
              if ((data[(sy * off.width + sx) * 4 + 3] ?? 0) > 6) { has = true; break; }
            }
          }
          if (has) tiles.push({ x, y });
        }
      }
      for (let i = tiles.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const ti = tiles[i], tj = tiles[j];
        // `i`/`j` are always in-bounds here (Fisher-Yates over `tiles`'s own
        // length) — this guard exists only to satisfy `noUncheckedIndexedAccess`,
        // it never actually skips a swap.
        if (!ti || !tj) continue;
        tiles[i] = tj; tiles[j] = ti;
      }
      this._tiles = tiles;
      this._dpr = dpr;
      this._gen++;
      if (this._played) this._animate();
    }

    private _clear(): void {
      if (this._raf) cancelAnimationFrame(this._raf);
      const ctx = this._canvas && this._canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }

    private _drawFull(): void {
      const ctx = this._canvas.getContext('2d');
      if (!ctx || !this._off) return;
      ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      ctx.globalAlpha = 1;
      ctx.drawImage(this._off, 0, 0);
    }

    private _animate(): void {
      const tiles = this._tiles, off = this._off, cv = this._canvas;
      if (!tiles.length || !off) return;
      if (this._raf) cancelAnimationFrame(this._raf);
      // Honor the OS "reduce motion" preference: the CSS-side blanket rule
      // (see <helmet><style>) can't reach a canvas tile animation driven by
      // rAF, so this component checks it directly and just paints the
      // finished image instead of staggering tiles in.
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        this._drawFull();
        this._animating = false;
        return;
      }
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      const dpr = this._dpr, px = this._px;
      const total = this._dur;
      const fade = Math.max(60, total * 0.28);
      const stagger = tiles.length > 1 ? (total - fade) / (tiles.length - 1) : 0;
      const done = new Uint8Array(tiles.length);
      const gen = this._gen;
      const t0 = performance.now();
      this._animating = true;
      const step = (now: number): void => {
        if (gen !== this._gen) { this._raf = 0; this._animating = false; return; }
        const el = now - t0;
        let all = true;
        for (let i = 0; i < tiles.length; i++) {
          if (done[i]) continue;
          const t = tiles[i];
          if (!t) continue; // in-bounds by construction (i < tiles.length); satisfies noUncheckedIndexedAccess
          const p = (el - i * stagger) / fade;
          if (p <= 0) { all = false; continue; }
          const dx = Math.round(t.x * dpr), dy = Math.round(t.y * dpr);
          const dw = Math.round((t.x + px) * dpr) - dx, dh = Math.round((t.y + px) * dpr) - dy;
          ctx.clearRect(dx, dy, dw, dh);
          if (p >= 1) { ctx.globalAlpha = 1; done[i] = 1; }
          else { all = false; ctx.globalAlpha = easeOut(p); }
          ctx.drawImage(off, dx, dy, dw, dh, dx, dy, dw, dh);
        }
        ctx.globalAlpha = 1;
        if (all) { this._drawFull(); this._animating = false; this._raf = 0; }
        else this._raf = requestAnimationFrame(step);
      };
      this._raf = requestAnimationFrame(step);
    }
  }

  customElements.define('pixel-reveal', PixelReveal);
})();
