// <ascii-cursor> — fixed full-viewport ASCII scramble trail that follows the pointer.
// Intensity fades once the user scrolls past the hero so it stops competing with content.
// Attributes: cell-size, radius, density, hold, box-color, text-color, fade (0-1 multiplier below the hero)
//
// Compiled standalone (esbuild, --bundle --format=iife) and loaded via a
// plain <script src="./components/ascii-cursor.js"> tag — no module
// import/export here, DOM lib types are ambient.
(function () {
  if (window.customElements && customElements.get('ascii-cursor')) return;
  const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}[]|:;<>,.?/~';

  /** One cell of the ASCII grid. */
  interface Cell {
    char: string;
    /** Timestamp (seconds, `performance.now()/1000`) the cell was last hit; 0 = idle. */
    at: number;
    delay: number;
    dur: number;
    hidden: boolean;
  }

  class AsciiCursor extends HTMLElement {
    private _up = false;
    private _cv: HTMLCanvasElement | null = null;
    private _raf = 0;
    private _sraf = 0;
    private _onResize: (() => void) | null = null;
    private _onMove: ((e: PointerEvent) => void) | null = null;
    private _onOut: (() => void) | null = null;
    private _onVis: (() => void) | null = null;
    private _onScroll: (() => void) | null = null;

    connectedCallback(): void {
      if (this._up) return;
      // This element is 100% decorative motion — a continuous rAF loop
      // scrambling glyphs under the pointer — with no informational content,
      // so under "reduce motion" the correct behavior is to not mount at
      // all rather than degrade it. (The CSS blanket rule in <helmet><style>
      // can't reach this: there's no `animation`/`transition` property here
      // to shorten, it's all driven by requestAnimationFrame.)
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      this._up = true;
      const cv = this._cv = document.createElement('canvas');
      Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      this.appendChild(cv);
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      const cell = Math.max(8, parseFloat(this.getAttribute('cell-size') || '') || 18);
      const radius = parseFloat(this.getAttribute('radius') || '') || 54;
      const density = parseFloat(this.getAttribute('density') || '') || 20;
      const hold = parseFloat(this.getAttribute('hold') || '') || 12;
      const boxColor = this.getAttribute('box-color') || '#E4622E';
      const textColor = this.getAttribute('text-color') || '#F1EADD';
      const fadeAttr = this.getAttribute('fade');
      const fadeTo = fadeAttr !== null ? parseFloat(fadeAttr) : 0.34;

      let w = 1, h = 1, cols = 1, rows = 1;
      let grid: Cell[] = [];
      let active = new Set<number>();
      const rebuild = (): void => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = Math.max(1, Math.round(this.getBoundingClientRect().width) || this.clientWidth || window.innerWidth);
        h = Math.max(1, Math.round(this.getBoundingClientRect().height) || this.clientHeight || window.innerHeight);
        cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.ceil(w / cell) + 1; rows = Math.ceil(h / cell) + 1;
        grid = new Array(cols * rows);
        for (let i = 0; i < grid.length; i++) grid[i] = { char: ' ', at: 0, delay: .05, dur: .25, hidden: false };
        active = new Set();
      };
      rebuild();
      this._onResize = rebuild;
      window.addEventListener('resize', this._onResize);

      let mx = -1e4, my = -1e4, tx = -1e4, ty = -1e4;
      this._onMove = (e: PointerEvent): void => { mx = e.clientX; my = e.clientY; };
      this._onOut = (): void => { mx = -1e4; my = -1e4; };
      window.addEventListener('pointermove', this._onMove, { passive: true });
      document.addEventListener('pointerleave', this._onOut);

      let vis = true;
      this._onVis = (): void => { vis = !document.hidden; };
      document.addEventListener('visibilitychange', this._onVis);

      // intensity: full over the hero, eased down to `fadeTo` once scrolled past it
      let inten = 1;
      const readScroll = (): void => {
        const vh = window.innerHeight || 1;
        const k = Math.min(1, Math.max(0, window.scrollY / (vh * 0.85)));
        inten = 1 - (1 - fadeTo) * k;
      };
      readScroll();
      this._onScroll = (): void => {
        if (!this._sraf) this._sraf = requestAnimationFrame(() => { this._sraf = 0; readScroll(); });
      };
      window.addEventListener('scroll', this._onScroll, { passive: true });

      let last = performance.now();
      const frame = (now: number): void => {
        this._raf = requestAnimationFrame(frame);
        if (!vis) { last = now; return; }
        const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
        last = now;
        const t = now / 1000;

        let moving = false;
        if (mx <= -1e4) { tx = -1e4; ty = -1e4; }
        else if (tx <= -1e4) { tx = mx; ty = my; }
        else {
          const dx = mx - tx, dy = my - ty;
          if (Math.abs(dx) > .1 || Math.abs(dy) > .1) {
            const ease = 1 - Math.exp(-dt / .004);
            tx += dx * ease; ty += dy * ease; moving = true;
          } else { tx = mx; ty = my; }
        }

        if (moving) {
          const r = Math.max(1, radius * (0.6 + 0.4 * inten));
          const rSq = r * r;
          const impact = (density / 8) * inten;
          const holdScale = Math.max(.1, hold / 10);
          const c0 = Math.max(0, Math.floor((tx - r) / cell)), c1 = Math.min(cols - 1, Math.ceil((tx + r) / cell));
          const r0 = Math.max(0, Math.floor((ty - r) / cell)), r1 = Math.min(rows - 1, Math.ceil((ty + r) / cell));
          for (let c = c0; c <= c1; c++) {
            for (let rw = r0; rw <= r1; rw++) {
              const dx = tx - (c * cell + cell / 2), dy = ty - (rw * cell + cell / 2);
              const dSq = dx * dx + dy * dy;
              if (dSq >= rSq) continue;
              const falloff = Math.pow(1 - Math.sqrt(dSq) / r, 1.5);
              if (Math.random() >= falloff * impact) continue;
              const idx = c * rows + rw, g = grid[idx];
              if (!g) continue;
              if (g.at === 0 || t - g.at > .2) {
                g.delay = (.03 + Math.random() * .05) * holdScale;
                g.dur = (.1 + Math.random() * .15) * holdScale;
                g.hidden = Math.random() < .04;
              }
              g.at = t;
              if (g.char === ' ' || Math.random() < .15) g.char = POOL[(Math.random() * POOL.length) | 0];
              active.add(idx);
            }
          }
        }

        ctx.clearRect(0, 0, w, h);
        ctx.font = '600 ' + (cell - 6) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.35 + 0.65 * inten;
        const scramble = 1 - Math.exp(-7.2 * dt);
        for (const idx of active) {
          const g = grid[idx];
          if (!g || g.at === 0) { active.delete(idx); continue; }
          const el = t - g.at;
          if (el >= g.delay + g.dur) { g.char = ' '; g.at = 0; g.hidden = false; active.delete(idx); continue; }
          if (g.hidden) continue;
          const c = Math.floor(idx / rows), rw = idx % rows;
          if (el >= g.delay && Math.random() < scramble) g.char = POOL[(Math.random() * POOL.length) | 0];
          const x = c * cell, y = rw * cell;
          ctx.fillStyle = boxColor;
          ctx.fillRect(x, y, cell, cell);
          ctx.fillStyle = textColor;
          ctx.fillText(g.char, x + cell / 2, y + cell / 2);
        }
        ctx.globalAlpha = 1;
      };
      this._raf = requestAnimationFrame(frame);
    }

    disconnectedCallback(): void {
      cancelAnimationFrame(this._raf);
      if (this._sraf) cancelAnimationFrame(this._sraf);
      if (this._onResize) window.removeEventListener('resize', this._onResize);
      if (this._onMove) window.removeEventListener('pointermove', this._onMove);
      if (this._onScroll) window.removeEventListener('scroll', this._onScroll);
      if (this._onOut) document.removeEventListener('pointerleave', this._onOut);
      if (this._onVis) document.removeEventListener('visibilitychange', this._onVis);
      this._up = false;
    }
  }
  customElements.define('ascii-cursor', AsciiCursor);
})();
