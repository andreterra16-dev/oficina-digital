// <matrix-rain> — decorative "digital rain" background layer: columns of
// glyphs drift downward and fade, classic terminal/hacker aesthetic.
// Attributes: rgb-var, bg-rgb-var (both CSS custom-property *names*, e.g.
// "--rgb-branch-ia" — already an "r, g, b" triplet in this project's theme
// tokens, see README "Paleta"), font-size, density, speed, max-opacity.
//
// Reads the two `--rgb-*` custom properties directly via getComputedStyle
// instead of the color-probe trick `<ascii-cursor>` needs: those tokens are
// already a plain "r, g, b" string (not a resolvable `<color>`), so there's
// nothing for a probe element to resolve — a straight property-value read
// is simpler and avoids an extra DOM node per color.
//
// Compiled standalone (esbuild, --bundle --format=iife) and loaded via a
// plain <script src="./components/matrix-rain.js"> tag — no module
// import/export here, DOM lib types are ambient.
(function () {
  if (window.customElements && customElements.get('matrix-rain')) return;
  const GLYPHS = 'アイウエオカキクケコサシスセソタチツテト0123456789<>{}[]/\\|=+*_';

  class MatrixRain extends HTMLElement {
    private _raf = 0;
    private _onResize: (() => void) | null = null;
    private _onVis: (() => void) | null = null;
    private _themeObserver: MutationObserver | null = null;

    connectedCallback(): void {
      // Continuous, purely decorative rAF motion with no informational
      // content — same call as `<ascii-cursor>`: under "reduce motion",
      // don't mount at all rather than degrade it.
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const cv = document.createElement('canvas');
      Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      this.appendChild(cv);
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      const fontSize = Math.max(9, parseFloat(this.getAttribute('font-size') || '') || 15);
      const density = Math.min(1, Math.max(0.05, parseFloat(this.getAttribute('density') || '') || 0.7));
      const speed = Math.max(0.1, parseFloat(this.getAttribute('speed') || '') || 1);
      const maxOpacity = Math.min(1, Math.max(0.05, parseFloat(this.getAttribute('max-opacity') || '') || 0.5));

      const readRgbVar = (name: string, fallback: string): string => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value || fallback;
      };
      const rgbVarName = this.getAttribute('rgb-var') || '--rgb-accent';
      const bgRgbVarName = this.getAttribute('bg-rgb-var') || '--rgb-bg-base';
      let glyphRgb = readRgbVar(rgbVarName, '228, 98, 46');
      let bgRgb = readRgbVar(bgRgbVarName, '27, 25, 23');
      // Re-read on a theme switch (`toggleTheme` in component.ts flips
      // `data-theme` on <html>) so the rain follows Warm Forge/Cold Steel
      // instead of staying frozen at whichever palette was active on mount.
      this._themeObserver = new MutationObserver(() => {
        glyphRgb = readRgbVar(rgbVarName, glyphRgb);
        bgRgb = readRgbVar(bgRgbVarName, bgRgb);
      });
      this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      let w = 1, h = 1;
      /** One falling glyph per column: its vertical position in px and how
       *  far below the top it currently reads (used to vary per-drop speed
       *  and idle time before a fresh cycle starts, so columns desync). */
      let drops: number[] = [];
      const rebuild = (): void => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = Math.max(1, this.clientWidth || window.innerWidth);
        h = Math.max(1, this.clientHeight || window.innerHeight);
        cv.width = Math.floor(w * dpr);
        cv.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cols = Math.max(1, Math.floor(w / fontSize));
        drops = new Array(cols).fill(0).map(() => -Math.random() * h);
      };
      rebuild();
      this._onResize = rebuild;
      window.addEventListener('resize', this._onResize);

      let vis = !document.hidden;
      this._onVis = (): void => { vis = !document.hidden; };
      document.addEventListener('visibilitychange', this._onVis);

      let last = performance.now();
      const frame = (now: number): void => {
        this._raf = requestAnimationFrame(frame);
        if (!vis) { last = now; return; }
        const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
        last = now;

        // Translucent rect over the previous frame (instead of clearing)
        // is what turns discrete glyph draws into a trailing fade.
        ctx.fillStyle = `rgba(${bgRgb}, 0.16)`;
        ctx.fillRect(0, 0, w, h);

        ctx.font = fontSize + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < drops.length; i++) {
          const y = drops[i];
          if (y === undefined) continue;
          if (Math.random() < density * 0.06) {
            const x = i * fontSize + fontSize / 2;
            const glyph = GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
            // Head glyph brighter, reads as the "leading edge" of the drop;
            // the translucent background rect above does the rest of the
            // fade for whatever was drawn on prior frames.
            ctx.fillStyle = `rgba(${glyphRgb}, ${maxOpacity})`;
            ctx.fillText(glyph, x, y);
          }
          const nextY = y + fontSize * speed * (30 * dt);
          drops[i] = nextY > h && Math.random() > 0.975 ? -fontSize : nextY;
        }
      };
      this._raf = requestAnimationFrame(frame);
    }

    disconnectedCallback(): void {
      cancelAnimationFrame(this._raf);
      if (this._onResize) window.removeEventListener('resize', this._onResize);
      if (this._onVis) document.removeEventListener('visibilitychange', this._onVis);
      if (this._themeObserver) this._themeObserver.disconnect();
    }
  }
  customElements.define('matrix-rain', MatrixRain);
})();
