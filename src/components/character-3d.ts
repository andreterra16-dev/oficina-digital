// <character-3d src="…png" depth="…png" amp=".2" sway="1" delay="2700" wave="…">
//   <pixel-reveal …></pixel-reveal>   ← the fallback / intro, slotted
// </character-3d>
//
// Brings a character illustration to life with three.js (see three-stage.ts
// for how). It is a progressive enhancement layered over what already works:
//
//   • The slotted child — in the page, the <pixel-reveal> tile-by-tile intro —
//     is what everyone sees first, and is all anyone sees when WebGL is
//     unavailable, the context is lost, or the visitor prefers reduced motion.
//   • When the element first comes on screen it loads three-stage.js (a
//     separate ES module, so the renderer's weight is only paid by visitors
//     who actually get here), and once both the stage is ready and the intro
//     has had `delay` ms to play out, it crossfades to the live canvas. Both
//     draw the same image at the same size, so the swap is seamless.
//   • The render loop runs only while the element is on screen.
//
// Everything it adds lives in a shadow root: the DC runtime adopts light-DOM
// children into React, so the only light-DOM child is the slotted one, which
// belongs to the template and is never touched here.
//
// Compiled standalone (esbuild, --bundle --format=iife) and loaded via a
// plain <script src="./components/character-3d.js"> tag.
import type { Stage } from './three-stage';

(function () {
  if (window.customElements && customElements.get('character-3d')) return;

  // A classic <script> resolves `import()` against the *page*, not the file,
  // so remember where this file came from to find its sibling module.
  const SELF = (document.currentScript as HTMLScriptElement | null)?.src;
  const STAGE_URL = SELF ? new URL('three-stage.js', SELF).href : './components/three-stage.js';

  const CSS = `
:host{display:block;position:relative}
slot{display:block;width:100%;height:100%;transition:opacity .6s ease}
canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .6s ease;pointer-events:none}
:host([data-live]) canvas{opacity:1}
:host([data-live]) slot{opacity:0}`;

  class Character3D extends HTMLElement {
    private _canvas: HTMLCanvasElement | null = null;
    private _stage: Stage | null = null;
    private _io: IntersectionObserver | null = null;
    private _ro: ResizeObserver | null = null;
    private _visible = false;
    private _booted = false;
    private _failed = false;
    private _t0 = 0;
    private _showTimer: ReturnType<typeof setTimeout> | undefined;

    connectedCallback(): void {
      if (!this._canvas) {
        const sr = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
        const st = document.createElement('style');
        st.textContent = CSS;
        this._canvas = document.createElement('canvas');
        this._canvas.setAttribute('aria-hidden', 'true');
        sr.append(st, document.createElement('slot'), this._canvas);
      }
      // No live canvas for visitors who asked for less motion: the slotted
      // image already is the character.
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

      this._io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          this._visible = e.isIntersecting;
          if (this._visible && !this._booted) { this._booted = true; this._t0 = performance.now(); void this._boot(); }
          this._sync();
        }
      // Same 15% threshold <pixel-reveal> uses to start its intro, so the
      // `delay` clock below starts when the intro does.
      }, { threshold: 0.15 });
      this._io.observe(this);

      this._ro = new ResizeObserver(() => this._stage?.resize());
      this._ro.observe(this);
      window.addEventListener('pointermove', this._onPointer, { passive: true });
      document.addEventListener('visibilitychange', this._sync);
    }

    disconnectedCallback(): void {
      this._io?.disconnect();
      this._ro?.disconnect();
      clearTimeout(this._showTimer);
      window.removeEventListener('pointermove', this._onPointer);
      document.removeEventListener('visibilitychange', this._sync);
      this._stage?.dispose();
      this._stage = null;
      this.removeAttribute('data-live');
      this._booted = false;
    }

    private _onPointer = (ev: PointerEvent): void => {
      if (!this._visible) return;
      this._stage?.setPointer((ev.clientX / window.innerWidth) * 2 - 1, (ev.clientY / window.innerHeight) * 2 - 1);
    };

    private _sync = (): void => {
      if (!this._stage) return;
      if (this._visible && !document.hidden) this._stage.start(); else this._stage.stop();
    };

    private async _boot(): Promise<void> {
      const image = this.getAttribute('src'), depth = this.getAttribute('depth');
      const canvas = this._canvas;
      if (!image || !depth || !canvas) return;
      try {
        const mod = (await import(/* @vite-ignore */ STAGE_URL)) as typeof import('./three-stage');
        const stage = await mod.createStage({
          canvas, image, depth,
          amp: parseFloat(this.getAttribute('amp') || '') || 0.2,
          sway: parseFloat(this.getAttribute('sway') || '') || 1,
          ...this._wave(),
        });
        if (!this.isConnected) { stage.dispose(); return; }
        stage.onLost(() => this._fallBack());
        this._stage = stage;
        this._sync();
        // Let the slotted intro finish before swapping to the live canvas.
        const wait = Math.max(0, (parseFloat(this.getAttribute('delay') || '') || 0) - (performance.now() - this._t0));
        this._showTimer = setTimeout(() => { if (!this._failed) this.setAttribute('data-live', ''); }, wait);
      } catch {
        this._fallBack();
      }
    }

    /** `wave="pivotX,pivotY,y0,y1,xFull,xFade,amp,speed"` — see StageOptions.wave. */
    private _wave(): { wave?: NonNullable<import('./three-stage').StageOptions['wave']> } {
      const n = (this.getAttribute('wave') || '').split(',').map(parseFloat);
      const [px, py, y0, y1, xFull, xFade, amp, speed] = n;
      if (n.length !== 8 || n.some(Number.isNaN)) return {};
      return { wave: { pivot: [px!, py!], y0: y0!, y1: y1!, xFull: xFull!, xFade: xFade!, amp: amp!, speed: speed! } };
    }

    /** WebGL unavailable or lost: back to the slotted image, for good. */
    private _fallBack(): void {
      this._failed = true;
      clearTimeout(this._showTimer);
      this.removeAttribute('data-live');
      this._stage?.stop();
    }
  }
  customElements.define('character-3d', Character3D);
})();
