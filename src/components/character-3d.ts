// <character-3d src="…png" texture="…webp" depth="…png" amp=".2" sway="1" fit="contain|cover" zoom="1.06" wave="…">
//   <pixel-reveal …></pixel-reveal>   ← the fallback, slotted
// </character-3d>
//
// Brings a character illustration to life with three.js (see three-stage.ts
// for how). It is a progressive enhancement with a fallback underneath:
//
//   • The live scene is meant to be what everyone sees *from the start*, so
//     it loads eagerly (as soon as the element is within a viewport of the
//     screen, not when it scrolls in), waits only for the boot overlay to
//     clear, and then plays its own entrance — the picture assembling from
//     tiles — straight into the live, parallaxing figure.
//   • The slotted child — in the page, the <pixel-reveal> — is the fallback:
//     it's all anyone sees when WebGL is unavailable, the context is lost, or
//     the visitor prefers reduced motion, and it is shown if the live scene
//     isn't ready within 2.5s of the boot overlay ending (slow network), after
//     which the live scene fades over it whenever it does arrive. While the
//     scene is expected, the slot stays hidden, so nothing flashes a still
//     image and then swaps it for the animation.
//   • three-stage.js (the renderer, ~540 KB) is a separate ES module loaded
//     with `import()`, so visitors who prefer reduced motion never download it.
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

  /** Resolves once the page's boot overlay (a one-shot CSS animation on
   *  `#boot-overlay`) has finished, so the entrance plays when it can be seen
   *  rather than underneath it. The overlay only starts animating once the
   *  page's template has rendered, so wait for that first; give up after 3s
   *  (no overlay, or its animation was collapsed) rather than hold the scene back. */
  function bootDone(): Promise<void> {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = (): void => {
        const anims = document.getElementById('boot-overlay')?.getAnimations?.() ?? [];
        if (anims.length) { void Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => resolve()); return; }
        if (performance.now() - t0 > 3000) { resolve(); return; }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  const CSS = `
:host{display:block;position:relative}
slot{display:block;width:100%;height:100%;transition:opacity .6s ease}
canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .6s ease;pointer-events:none}
:host([data-state="pending"]) slot{opacity:0}
:host([data-state="live"]) canvas{opacity:1;transition:none}
:host([data-state="live"]) slot{opacity:0}`;

  /** One live scene per image, shared across element instances. The DC runtime
   *  mounts its React tree *after* the template has been parsed and replaces the
   *  parse-time <character-3d> elements with fresh ones, so a scene started by
   *  the first element is handed to its replacement (canvas and all) instead of
   *  being thrown away and rebuilt — which is what makes it appear promptly. */
  interface Shared {
    promise: Promise<{ stage: Stage; canvas: HTMLCanvasElement }>;
    owner: Character3D | null;
    idle?: ReturnType<typeof setTimeout>;
  }
  const SHARED = new Map<string, Shared>();

  class Character3D extends HTMLElement {
    private _canvas: HTMLCanvasElement | null = null;
    private _stage: Stage | null = null;
    private _io: IntersectionObserver | null = null;
    private _preload: IntersectionObserver | null = null;
    private _ro: ResizeObserver | null = null;
    private _visible = false;
    private _booted = false;
    private _failed = false;
    private _showTimer: ReturnType<typeof setTimeout> | undefined;

    connectedCallback(): void {
      if (!this.shadowRoot) {
        const sr = this.attachShadow({ mode: 'open' });
        const st = document.createElement('style');
        st.textContent = CSS;
        sr.append(st, document.createElement('slot'));
      }
      // No live canvas for visitors who asked for less motion: the slotted
      // image already is the character.
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

      this.setAttribute('data-state', 'pending');
      // Two observers: a wide one that starts loading a viewport ahead (so the
      // scene is ready by the time it scrolls in), and a plain one that tracks
      // whether it is on screen, to pause the render loop when it is not.
      // The DC runtime replaces this element with a fresh one shortly after the
      // page parses; boot on the next frame (not on the observer, which would
      // fire too late to matter) so the scene is already loading by then and the
      // replacement can take it over. Anything far below the fold waits for the
      // observer instead.
      requestAnimationFrame(() => {
        if (!this.isConnected || this._booted) return;
        if (this.getBoundingClientRect().top < window.innerHeight * 1.5) { this._booted = true; void this._boot(); }
      });
      this._preload = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting) && !this._booted) { this._booted = true; void this._boot(); }
      }, { rootMargin: '100% 0px' });
      this._preload.observe(this);
      this._io = new IntersectionObserver((entries) => {
        for (const e of entries) this._visible = e.isIntersecting;
        this._sync();
      });
      this._io.observe(this);

      this._ro = new ResizeObserver(() => this._stage?.resize());
      this._ro.observe(this);
      window.addEventListener('pointermove', this._onPointer, { passive: true });
      document.addEventListener('visibilitychange', this._sync);
    }

    disconnectedCallback(): void {
      this._io?.disconnect();
      this._preload?.disconnect();
      this._ro?.disconnect();
      clearTimeout(this._showTimer);
      window.removeEventListener('pointermove', this._onPointer);
      document.removeEventListener('visibilitychange', this._sync);
      this._stage?.stop();
      this._stage = null;
      this._booted = false;
      // Keep the scene around briefly: a replacement element may claim it.
      const key = this.getAttribute('src') ?? '';
      const sh = SHARED.get(key);
      if (sh && sh.owner === this) {
        sh.owner = null;
        sh.idle = setTimeout(() => {
          if (sh.owner) return;
          SHARED.delete(key);
          void sh.promise.then(({ stage }) => stage.dispose()).catch(() => undefined);
        }, 5000);
      }
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
      const key = this.getAttribute('src'), depth = this.getAttribute('depth');
      if (!key || !depth) return;
      const booted = bootDone();
      // Slow connection: 2.5s after the boot overlay, show the slotted fallback
      // instead of an empty frame; the live scene still takes over when it arrives.
      void booted.then(() => {
        this._showTimer = setTimeout(() => { if (this.getAttribute('data-state') === 'pending') this.setAttribute('data-state', 'slot'); }, 2500);
      });
      try {
        let sh = SHARED.get(key);
        if (!sh) {
          const canvas = document.createElement('canvas');
          canvas.setAttribute('aria-hidden', 'true');
          const opts = {
            canvas, image: this.getAttribute('texture') || key, depth,
            amp: parseFloat(this.getAttribute('amp') || '') || 0.2,
            sway: parseFloat(this.getAttribute('sway') || '') || 1,
            fit: this.getAttribute('fit') === 'cover' ? 'cover' as const : 'contain' as const,
            zoom: parseFloat(this.getAttribute('zoom') || '') || 1.06,
            ...this._wave(),
          };
          sh = {
            owner: null,
            promise: (import(/* @vite-ignore */ STAGE_URL) as Promise<typeof import('./three-stage')>)
              .then((mod) => mod.createStage(opts))
              .then((stage) => ({ stage, canvas })),
          };
          SHARED.set(key, sh);
        }
        sh.owner = this;
        clearTimeout(sh.idle);
        const { stage, canvas } = await sh.promise;
        if (sh.owner !== this || !this.isConnected) return; // handed on, or removed meanwhile
        if (this._canvas !== canvas) { this._canvas = canvas; this.shadowRoot?.appendChild(canvas); }
        stage.onLost(() => this._fallBack());
        this._stage = stage;
        stage.resize();
        await booted;
        if (this._failed || sh.owner !== this) return;
        clearTimeout(this._showTimer);
        this.setAttribute('data-state', 'live');
        this._sync();
        stage.reveal(); // a no-op if this scene already played its entrance
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
      this.setAttribute('data-state', 'slot');
      this._stage?.stop();
    }
  }
  customElements.define('character-3d', Character3D);
})();
