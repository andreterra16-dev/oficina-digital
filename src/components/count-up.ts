// <count-up to="502" locale="pt-BR">
// A number that counts up from zero the first time it scrolls into view — used
// for the engineering figures in the featured-project panels, where watching
// the totals climb is part of conveying scale. Easing is an exponential
// ease-out (fast start, long settle), the same family as the rest of the page.
//
// Under `prefers-reduced-motion` it just shows the final number. The text is
// rendered inside a shadow root (so React never adopts it as a child — see
// character-3d.ts for why), and it inherits its color, size and font from the
// host, so the page styles it like any inline element.
//
// Compiled standalone (esbuild, --bundle --format=iife) and loaded via a
// plain <script src="./components/count-up.js"> tag.
(function () {
  if (window.customElements && customElements.get('count-up')) return;

  const DURATION = 1400;
  const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  class CountUp extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['to'];
    }

    private _label: HTMLSpanElement | null = null;
    private _io: IntersectionObserver | null = null;
    private _raf = 0;
    private _played = false;

    private get _target(): number {
      // The template's first paint carries the raw `{{ … }}` placeholder: parse to NaN, show nothing yet.
      const n = parseInt(this.getAttribute('to') || '', 10);
      return Number.isFinite(n) ? n : NaN;
    }

    private _fmt(n: number): string {
      return Math.round(n).toLocaleString(this.getAttribute('locale') || 'pt-BR');
    }

    connectedCallback(): void {
      if (!this._label) {
        const sr = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
        const st = document.createElement('style');
        st.textContent = ':host{display:inline-block;font-variant-numeric:tabular-nums}';
        this._label = document.createElement('span');
        sr.append(st, this._label);
      }
      this._io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting) && !this._played) { this._played = true; this._run(); }
      }, { threshold: 0.4 });
      this._io.observe(this);
      this._show(this._played ? this._target : 0);
    }

    disconnectedCallback(): void {
      cancelAnimationFrame(this._raf);
      this._io?.disconnect();
    }

    attributeChangedCallback(): void {
      if (!this.isConnected) return;
      // A changed target after the count already ran (language/theme re-render): snap to it.
      if (this._played) this._show(this._target); else this._show(0);
    }

    private _show(n: number): void {
      if (this._label) this._label.textContent = Number.isNaN(n) ? '' : this._fmt(n);
    }

    private _run(): void {
      const to = this._target;
      if (Number.isNaN(to)) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { this._show(to); return; }
      const t0 = performance.now();
      const step = (now: number): void => {
        const p = Math.min(1, (now - t0) / DURATION);
        this._show(to * easeOutExpo(p));
        if (p < 1) this._raf = requestAnimationFrame(step); else this._show(this._target);
      };
      this._raf = requestAnimationFrame(step);
    }
  }
  customElements.define('count-up', CountUp);
})();
