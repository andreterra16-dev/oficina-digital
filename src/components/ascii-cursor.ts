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
    private _raf = 0;
    private _sraf = 0;
    private _onResize: (() => void) | null = null;
    private _onMove: ((e: PointerEvent) => void) | null = null;
    private _onOut: (() => void) | null = null;
    private _onUp: ((e: PointerEvent) => void) | null = null;
    private _onVis: (() => void) | null = null;
    private _onScroll: (() => void) | null = null;
    private _onTouchStart: ((e: TouchEvent) => void) | null = null;
    private _onTouchMove: ((e: TouchEvent) => void) | null = null;
    private _onTouchEnd: (() => void) | null = null;
    private _themeObserver: MutationObserver | null = null;

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
      const cv = document.createElement('canvas');
      Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      this.appendChild(cv);
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      const cell = Math.max(8, parseFloat(this.getAttribute('cell-size') || '') || 18);
      const radius = parseFloat(this.getAttribute('radius') || '') || 54;
      const density = parseFloat(this.getAttribute('density') || '') || 20;
      const hold = parseFloat(this.getAttribute('hold') || '') || 12;
      const fadeAttr = this.getAttribute('fade');
      const fadeTo = fadeAttr !== null ? parseFloat(fadeAttr) : 0.34;

      // box-color/text-color arrive as raw attribute strings — since the
      // theme rework they're `var(--color-accent)` etc., not a literal hex.
      // Canvas 2D's `fillStyle` has no idea what a CSS custom property is
      // (it isn't a `<color>` per the canvas spec) — assigning it silently
      // no-ops, leaving fillStyle at its default black, which is how the
      // cursor lost its color entirely. Resolve through a probe element
      // instead: setting `.style.color` on a real, connected DOM node and
      // reading it back via `getComputedStyle` lets the browser do the
      // var()-resolution + cascade lookup canvas can't, honoring whichever
      // theme (`data-theme`) is active when this mounts.
      const resolveColor = (value: string): string => {
        if (!value.includes('var(')) return value;
        const probe = document.createElement('span');
        probe.style.color = value;
        this.appendChild(probe);
        const resolved = getComputedStyle(probe).color;
        probe.remove();
        return resolved || value;
      };
      const boxColorAttr = this.getAttribute('box-color') || '#E4622E';
      const textColorAttr = this.getAttribute('text-color') || '#F1EADD';
      let boxColor = resolveColor(boxColorAttr);
      let textColor = resolveColor(textColorAttr);
      // Re-resolve on a theme switch (`toggleTheme` in component.ts flips
      // `data-theme` on <html>) so the trail's color follows Warm
      // Forge/Cold Steel instead of staying frozen at whatever it resolved
      // to on mount.
      this._themeObserver = new MutationObserver(() => {
        boxColor = resolveColor(boxColorAttr);
        textColor = resolveColor(textColorAttr);
      });
      this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

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
      // Touch input gets its own reactivity profile below (near-zero lerp lag,
      // wider/denser hit footprint) so a finger drag reads as "cutting"
      // through the grid instead of the softer trailing effect tuned for a
      // mouse. `touching` also gates `_onUp`: a mouse pointerup is just a
      // click and shouldn't clear the trail, but a touch's finger lifting is
      // the end of the "cut" and should let the mark start healing/fading.
      let touching = false;
      this._onMove = (e: PointerEvent): void => { touching = e.pointerType === 'touch'; mx = e.clientX; my = e.clientY; };
      this._onOut = (): void => { mx = -1e4; my = -1e4; };
      this._onUp = (e: PointerEvent): void => { if (e.pointerType === 'touch') this._onOut?.(); };
      window.addEventListener('pointermove', this._onMove, { passive: true });
      window.addEventListener('pointerup', this._onUp, { passive: true });
      window.addEventListener('pointercancel', this._onUp, { passive: true });
      document.addEventListener('pointerleave', this._onOut);

      // On a touch device, the dominant gesture is dragging the page to
      // scroll it — and the moment the browser recognizes that drag as a
      // scroll, it takes the gesture over natively and stops dispatching
      // further `pointermove` for it (some browsers fire a `pointercancel`
      // outright). `mx`/`my` above then go stale for the rest of the
      // gesture, so the effect barely triggers while actually scrolling —
      // exactly the "quase não é acionado" symptom, and the opposite of
      // what a decorative touch effect should do on a page whose one
      // touch interaction *is* scrolling. `touchstart`/`touchmove` don't
      // get taken over the same way (the browser still reports where the
      // finger is even once it owns the gesture), so they track the
      // contact point independently of whether `pointermove` is still
      // flowing; `_onScroll` below re-stamps `mx`/`my` from that point on
      // every scroll tick, inverting the trigger to match the request:
      // driven by the scroll itself, at the finger's contact point, not
      // by move events the browser may have stopped sending.
      let touchX = -1e4, touchY = -1e4;
      let fingerDown = false;
      // Seconds-since-epoch (same clock as `t` in `frame()` below) until
      // which the effect holds off reacting — the "atraso" (delay) asked
      // for: a genuine second contact point (`e.touches.length > 1`, e.g.
      // an accidental second finger, or the OS briefly reporting a stray
      // touch) used to snap `touchX`/`touchY` straight to wherever that
      // second touch landed, reading as the trail teleporting rather than
      // tracking one finger. Now a multi-touch moment just starts a short
      // cooldown and is otherwise ignored — position stays put, nothing
      // reacts, until it's back down to one finger and the cooldown clears.
      let glitchUntil = 0;
      const GLITCH_DELAY_S = 0.12;
      this._onTouchStart = (e: TouchEvent): void => {
        fingerDown = true;
        if (e.touches.length > 1) { glitchUntil = performance.now() / 1000 + GLITCH_DELAY_S; return; }
        const t = e.touches[0];
        if (t) { touchX = t.clientX; touchY = t.clientY; touching = true; mx = touchX; my = touchY; }
      };
      this._onTouchMove = (e: TouchEvent): void => {
        if (e.touches.length > 1) { glitchUntil = performance.now() / 1000 + GLITCH_DELAY_S; return; }
        const t = e.touches[0];
        if (t) { touchX = t.clientX; touchY = t.clientY; }
      };
      this._onTouchEnd = (): void => { fingerDown = false; };
      window.addEventListener('touchstart', this._onTouchStart, { passive: true });
      window.addEventListener('touchmove', this._onTouchMove, { passive: true });
      window.addEventListener('touchend', this._onTouchEnd, { passive: true });
      window.addEventListener('touchcancel', this._onTouchEnd, { passive: true });

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
        // Inverted trigger for touch scrolling (see the touch listeners
        // above): every scroll tick while a finger is actually down
        // re-marks `mx`/`my` at the contact point, so the main loop's
        // move-detection keeps firing off the scroll itself instead of a
        // `pointermove` stream the browser may already have stopped
        // sending. Gated to `fingerDown` (not just "was touching") so an
        // inertia scroll that continues after the finger lifts doesn't
        // keep stamping a contact point that no longer exists.
        if (fingerDown) { touching = true; mx = touchX; my = touchY; }
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

        // Where this frame's touch/pointer travel started from, so a fast
        // swipe can be hit-tested along the whole segment it crossed below,
        // not just its endpoint (see the sub-stepped loop over `steps`).
        const ptx = tx, pty = ty;
        let moving = false;
        if (mx <= -1e4) { tx = -1e4; ty = -1e4; }
        else if (tx <= -1e4) { tx = mx; ty = my; }
        else {
          const dx = mx - tx, dy = my - ty;
          if (Math.abs(dx) > .1 || Math.abs(dy) > .1) {
            // Touch: near-zero lag (an almost-instant snap to the finger)
            // reads as the grid reacting to contact rather than trailing
            // behind it, closer to the page being sliced than brushed.
            const ease = 1 - Math.exp(-dt / (touching ? .0006 : .004));
            tx += dx * ease; ty += dy * ease; moving = true;
          } else { tx = mx; ty = my; }
        }

        if (moving) {
          // Sub-step the segment from last frame's position to this one —
          // touchmove dispatches at a lower/variable rate than mouse
          // pointermove, so a fast swipe can jump several cell-widths
          // between frames; hit-testing only the endpoint would leave gaps
          // in the trail instead of one continuous cut.
          const segDx = tx - ptx, segDy = ty - pty;
          const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
          // A swipe fast enough to cross a large chunk of the screen in a
          // single frame reads as glitchy no matter how many sub-steps fill
          // it in — a burst of boxes popping across a huge span at once,
          // not a trail. Past `FAST_SWIPE_PX_S`, treat it the same as a
          // stray multi-touch: hold off reacting for `GLITCH_DELAY_S`
          // instead of stamping the whole span, then resume normally once
          // the finger settles back to a sane pace.
          const FAST_SWIPE_PX_S = 5500;
          if (touching && dt > 0 && segLen / dt > FAST_SWIPE_PX_S) glitchUntil = t + GLITCH_DELAY_S;
          // Rendering of already-active cells below still has to run every
          // frame regardless (so an existing mark keeps fading normally) —
          // only the *new*-hit stamping this delay guards skips ahead.
          if (t >= glitchUntil) {
            // Touch also gets a wider, denser footprint than a mouse hover —
            // a coarse pointer needs a bigger, more obvious reaction to read
            // as intentional "cutting" rather than an incidental brush.
            const touchBoost = touching ? 1.55 : 1;
            const r = Math.max(1, radius * (0.6 + 0.4 * inten) * touchBoost);
            const rSq = r * r;
            const impact = (density / 8) * inten * (touching ? 1.6 : 1);
            const holdScale = Math.max(.1, hold / 10);
            const steps = touching ? Math.min(8, Math.max(1, Math.ceil(segLen / (cell * .6)))) : 1;
            for (let s = 0; s < steps; s++) {
              const k = steps === 1 ? 1 : s / (steps - 1);
              const px = ptx + segDx * k, py = pty + segDy * k;
              const c0 = Math.max(0, Math.floor((px - r) / cell)), c1 = Math.min(cols - 1, Math.ceil((px + r) / cell));
              const r0 = Math.max(0, Math.floor((py - r) / cell)), r1 = Math.min(rows - 1, Math.ceil((py + r) / cell));
              for (let c = c0; c <= c1; c++) {
                for (let rw = r0; rw <= r1; rw++) {
                  const dx = px - (c * cell + cell / 2), dy = py - (rw * cell + cell / 2);
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
                  if (g.char === ' ' || Math.random() < .15) g.char = POOL.charAt((Math.random() * POOL.length) | 0);
                  active.add(idx);
                }
              }
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
          if (el >= g.delay && Math.random() < scramble) g.char = POOL.charAt((Math.random() * POOL.length) | 0);
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
      if (this._onUp) { window.removeEventListener('pointerup', this._onUp); window.removeEventListener('pointercancel', this._onUp); }
      if (this._onScroll) window.removeEventListener('scroll', this._onScroll);
      if (this._onTouchStart) window.removeEventListener('touchstart', this._onTouchStart);
      if (this._onTouchMove) window.removeEventListener('touchmove', this._onTouchMove);
      if (this._onTouchEnd) { window.removeEventListener('touchend', this._onTouchEnd); window.removeEventListener('touchcancel', this._onTouchEnd); }
      if (this._onOut) document.removeEventListener('pointerleave', this._onOut);
      if (this._onVis) document.removeEventListener('visibilitychange', this._onVis);
      if (this._themeObserver) this._themeObserver.disconnect();
      this._up = false;
    }
  }
  customElements.define('ascii-cursor', AsciiCursor);
})();
