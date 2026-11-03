// <git-flow lang="pt">
// The "GitHub flow" explainer of etapa 03: a commit graph that *builds
// itself* step by step — a branch leaves `main`, collects commits, goes
// through a pull request and review, merges back, is deleted and ships —
// with the matching terminal commands typed out beside it. It renders its
// own DOM from the data in
// `src/data/github-flow.ts` inside a shadow root — the DC runtime turns the
// page's already-upgraded template DOM into React elements, so anything this
// element injected into its light DOM would be adopted as React children and
// then break on React's next reconcile (`removeChild` of a node it no longer
// owns). A shadow root is invisible to that, and also keeps these `gf-*`
// styles from leaking into the page. The language toggle only has to flip its
// `lang` attribute, and one drawing description serves two layouts:
// horizontal on wide containers and a vertical timeline on phones (chosen
// from the element's own width, not the viewport, so it also behaves inside
// a narrow column).
//
// Motion is driven by a single number — the current step. Everything in the
// graph carries `data-from="N"` and is shown once `step >= N`, so
// stepping backward un-draws it for free and a click on any step can jump
// anywhere without bookkeeping. Autoplay runs only while the element is on
// screen, stops for good the moment the visitor takes over, and is off under
// `prefers-reduced-motion` (the finished graph is shown instead; the steps
// stay clickable).
//
// Compiled standalone (esbuild, --bundle --format=iife) and loaded via a
// plain <script src="./components/git-flow.js"> tag. Data is bundled in.
import { FLOW_STEPS, FLOW_UI } from '../data/github-flow';
import { GITHUB_MARK, OCTICONS, type OcticonName } from '../data/github-icons';
import type { I18nString } from '../types/domain';

(function () {
  if (window.customElements && customElements.get('git-flow')) return;

  type Lang = 'pt' | 'en';
  type Pt = readonly [number, number];

  /** Maps a point on the graph's own axes — `u` along time (x on a wide
   *  layout), `v` across lanes (0 = main, 1 = the feature branch) — to
   *  drawing coordinates. Both mappings are affine, so a Bézier described in
   *  (u, v) stays a Bézier after mapping and the same path data serves both. */
  interface Layout {
    w: number;
    h: number;
    vertical: boolean;
    map: (u: number, v: number) => Pt;
  }
  const WIDE: Layout = { w: 960, h: 290, vertical: false, map: (u, v) => [u, 66 + v * 140] };
  const TALL: Layout = { w: 340, h: 560, vertical: true, map: (u, v) => [262 - v * 192, 32 + (u - 40) * 0.58] };

  const STEP_MS = 3600;
  const N = FLOW_STEPS.length;

  const BASE_COMMITS = [90, 170, 250] as const;
  const BRANCH_AT = 250;
  const LANE_FROM = 350;
  const LANE_TO = 720;
  const FEATURE_COMMITS: ReadonlyArray<{ u: number; from: number; msg: string; hash: string }> = [
    { u: 410, from: 1, msg: 'feat: flow', hash: 'a1f3c9e' },
    { u: 495, from: 1, msg: 'fix: mobile', hash: '7be02d4' },
    { u: 580, from: 1, msg: 'docs: readme', hash: 'c94a1f0' },
    { u: 665, from: 3, msg: 'fix: review', hash: '3d8e6b2' },
  ];
  const MERGE_AT = 805;
  const DEPLOY_AT = 890;
  const MAIN_END = 930;

  const CSS = `
:host{display:block;font-family:'JetBrains Mono',monospace;color:var(--color-text-main)}
.gf{--gf-green:#3FB950;--gf-purple:#A371F7;--gf-ease:cubic-bezier(.23,1,.32,1);--gf-pop:cubic-bezier(.34,1.56,.4,1);display:flex;flex-direction:column;gap:18px}
.gf button{font:inherit;color:inherit;cursor:pointer}
.gf button:focus-visible{outline:2px solid var(--color-accent);outline-offset:2px}
.gf-stage{border:1px solid rgba(var(--rgb-text-main),.16);background:var(--color-bg-base);position:relative;overflow:hidden}
.gf-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:rgba(var(--rgb-text-main),.05);border-bottom:1px solid rgba(var(--rgb-text-main),.12);font-size:11.5px;letter-spacing:.02em}
.gf-repo{display:flex;align-items:center;gap:9px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gf-repo svg{flex:none}
.gf-repo b{font-weight:500}
.gf-repo .gf-slash{color:var(--color-text-muted)}
.gf-pill{font-style:normal;flex:none;padding:2px 8px;border:1px solid rgba(var(--rgb-text-main),.22);border-radius:20px;font-size:10px;color:var(--color-text-sec)}
.gf-now{display:flex;align-items:center;gap:7px;flex:none;color:var(--color-accent);transition:color .3s}
.gf-now span{display:inline-block;min-width:0;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gf-graphwrap{position:relative;padding:8px 6px 0}
.gf-mark{position:absolute;right:22px;bottom:14px;width:92px;height:92px;color:var(--color-text-main);opacity:.05;pointer-events:none}
.gf-graph{display:block;width:100%;height:auto;max-width:1100px;margin:0 auto;overflow:visible}
.gf-tall{max-width:380px}
.gf-pr{display:flex;align-items:center;flex-wrap:wrap;gap:8px 14px;padding:11px 14px;border-top:1px solid rgba(var(--rgb-text-main),.12);background:rgba(var(--rgb-text-main),.035);font-size:12px;transition:opacity .4s var(--gf-ease)}
.gf:not(.is-open):not(.is-merged) .gf-pr{opacity:.45}
.gf-pr-ic{display:inline-flex;color:var(--color-text-muted);transition:color .3s}
.gf.is-open .gf-pr-ic{color:var(--gf-green)}
.gf.is-merged .gf-pr-ic{color:var(--gf-purple)}
.gf-pr-title{color:var(--color-text-main)}
.gf-pr-num{color:var(--color-text-sec)}
.gf-pr-state{margin-left:auto;display:inline-flex;align-items:center;gap:7px;color:var(--color-text-sec)}
.gf-check{display:inline-flex;align-items:center;gap:6px;color:var(--color-text-muted);transition:color .3s}
.gf.is-checked .gf-check{color:var(--gf-green)}
.gf-check svg{opacity:0;transform:scale(.4);transition:opacity .3s,transform .45s var(--gf-pop)}
.gf.is-checked .gf-check svg{opacity:1;transform:none}

/* graph */
.gf-main{stroke:rgba(var(--rgb-text-main),.5);stroke-width:2.5;fill:none;stroke-linecap:round}
.gf-lane{stroke:var(--color-accent);stroke-width:2.5;fill:none;stroke-linecap:round;transition:opacity .6s var(--gf-ease)}
.gf-pr-link{stroke:rgba(var(--rgb-accent),.55);stroke-width:2;fill:none;stroke-linecap:round}
.gf-merge-link{stroke:var(--gf-purple);stroke-width:3;fill:none;stroke-linecap:round}
.gf-draw{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .85s var(--gf-ease)}
.gf-draw.on{stroke-dashoffset:0}
.gf-el{opacity:0;transform:scale(.3);transform-box:fill-box;transform-origin:center;transition:opacity .25s,transform .5s var(--gf-pop)}
.gf-el.on{opacity:1;transform:none}
.gf-fade{opacity:0;transition:opacity .45s var(--gf-ease)}
.gf-fade.on{opacity:1}
.gf-node-main{fill:var(--color-bg-base);stroke:rgba(var(--rgb-text-main),.75);stroke-width:2.5}
.gf-node-feat{fill:var(--color-accent);stroke:var(--color-bg-base);stroke-width:2.5;transition:opacity .6s var(--gf-ease)}
.gf-node-merge{fill:var(--gf-purple);stroke:var(--color-bg-base);stroke-width:2.5}
.gf-node-ship{fill:var(--color-support-amber);stroke:var(--color-bg-base);stroke-width:2.5}
.gf-prnode{fill:var(--color-bg-elevated);stroke:var(--color-text-muted);stroke-width:2;transition:stroke .3s}
.gf.is-open .gf-prnode{stroke:var(--gf-green)}
.gf.is-merged .gf-prnode{stroke:var(--gf-purple)}
.gf-prnode-ic{color:var(--color-text-muted);transition:color .3s}
.gf.is-open .gf-prnode-ic{color:var(--gf-green)}
.gf.is-merged .gf-prnode-ic{color:var(--gf-purple)}
.gf-bubble{fill:var(--color-bg-elevated);stroke:var(--color-support-amber);stroke-width:1.5}
.gf-bubble-ic{color:var(--color-support-amber)}
.gf-ok{fill:var(--gf-green);stroke:var(--color-bg-base);stroke-width:2}
.gf-ic-dark{color:var(--color-bg-base)}
.gf-lbl{font-family:'JetBrains Mono',monospace;font-size:11px;fill:var(--color-text-main)}
.gf-lbl-dim{fill:var(--color-text-sec);font-size:10px}
.gf-lbl-lane{fill:var(--color-accent);font-size:11px}
.gf-lbl-main{fill:var(--color-text-sec);font-size:11px}
.gf-ping{fill:none;stroke:var(--color-accent);stroke-width:2;opacity:0;transform-box:fill-box;transform-origin:center}
.gf[data-step="5"] .gf-lane,.gf[data-step="5"] .gf-node-feat,.gf[data-step="5"] .gf-lbl-lane{opacity:.28}
.gf[data-step="5"] .gf-feat-lbl{opacity:.3}
.gf-lbl-gone{opacity:0;transition:opacity .45s var(--gf-ease)}
.gf[data-step="5"] .gf-lbl-gone{opacity:1}
.gf[data-step="5"] .gf-lbl-lane.gf-lbl-live{display:none}
${Array.from({ length: N }, (_, k) => `.gf[data-step="${k}"] .gf-ping[data-ping="${k}"]{animation:gfPing 1.3s var(--gf-ease) .12s both}`).join('\n')}
@keyframes gfPing{0%{opacity:.8;transform:scale(.7)}100%{opacity:0;transform:scale(3)}}

/* step rail */
.gf-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(${N},1fr);gap:8px}
.gf-step{position:relative;width:100%;height:100%;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:11px;align-items:center;text-align:left;padding:12px 12px 14px;background:rgba(var(--rgb-text-main),.03);border:1px solid rgba(var(--rgb-text-main),.12);border-radius:3px;transition:background .25s,border-color .25s,transform .2s var(--gf-ease)}
.gf-step:hover{background:rgba(var(--rgb-text-main),.07);border-color:rgba(var(--rgb-text-main),.28)}
.gf-step:active{transform:scale(.97)}
.gf-step-ic{grid-row:1 / span 2;display:grid;place-items:center;width:34px;height:34px;border:1px solid rgba(var(--rgb-text-main),.2);border-radius:3px;color:var(--color-text-sec);transition:color .25s,border-color .25s,background .25s}
.gf-step-n{font-size:9.5px;letter-spacing:.2em;color:var(--color-text-sec);align-self:end}
.gf-step-t{font-size:12.5px;color:var(--color-text-sec);align-self:start;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gf-step.is-active{background:rgba(var(--rgb-accent),.1);border-color:rgba(var(--rgb-accent),.6)}
.gf-step.is-active .gf-step-ic{color:var(--color-bg-base);background:var(--color-accent);border-color:var(--color-accent)}
.gf-step.is-active .gf-step-t{color:var(--color-text-main)}
.gf-step.is-done .gf-step-ic{color:var(--color-accent);border-color:rgba(var(--rgb-accent),.5)}
.gf-prog{position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--color-accent);transform:scaleX(0);transform-origin:left;pointer-events:none}
.gf-step.is-active .gf-prog{transform:scaleX(1);opacity:.5}
.gf.is-playing .gf-step.is-active .gf-prog{opacity:1;animation:gfProg var(--gf-ms) linear both}
@keyframes gfProg{from{transform:scaleX(0)}to{transform:scaleX(1)}}

/* detail */
.gf-detail{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:0;border:1px solid rgba(var(--rgb-text-main),.14);background:linear-gradient(150deg,var(--color-bg-elevated-alt),var(--color-bg-panel))}
.gf-copy{padding:26px 28px;display:flex;flex-direction:column;gap:14px;min-width:0;animation:gfIn .5s var(--gf-ease) both}
.gf-count{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--color-support-amber)}
.gf-ctrl{display:flex;gap:6px}
.gf-btn{display:grid;place-items:center;width:34px;height:34px;background:rgba(var(--rgb-text-main),.05);border:1px solid rgba(var(--rgb-text-main),.2);border-radius:3px;color:var(--color-text-main);transition:background .2s,border-color .2s,transform .2s var(--gf-ease)}
.gf-btn:hover{background:rgba(var(--rgb-text-main),.12);border-color:rgba(var(--rgb-text-main),.4)}
.gf-btn:active{transform:scale(.94)}
.gf-btn svg{pointer-events:none}
.gf-title{margin:0;font-family:'Archivo',system-ui,sans-serif;font-size:clamp(22px,2.4vw,30px);font-weight:600;letter-spacing:-.03em;line-height:1.08;font-stretch:108%;text-wrap:balance}
.gf-text{margin:0;font-family:'Archivo',system-ui,sans-serif;font-size:15.5px;line-height:1.7;color:var(--color-text-soft);max-width:52ch;text-wrap:pretty}
.gf-why{display:flex;flex-wrap:wrap;align-items:center;gap:6px 9px;font-size:11.5px;color:var(--color-accent);margin-top:auto}
.gf-why i{white-space:nowrap;font-style:normal;color:var(--color-text-sec);letter-spacing:.16em;text-transform:uppercase;font-size:9.5px}
.gf-term{padding:26px 28px;background:var(--color-bg-base);border-left:1px dashed rgba(var(--rgb-text-main),.2);display:flex;flex-direction:column;gap:10px;font-size:12.5px;min-width:0;justify-content:center}
.gf-term-h{font-size:10px;letter-spacing:.16em;color:var(--color-text-sec);text-transform:uppercase;margin-bottom:4px}
.gf-line{display:flex;gap:9px;align-items:baseline;min-width:0}
.gf-line i{font-style:normal;color:var(--color-accent);flex:none}
.gf-cmd{display:block;width:0;overflow:hidden;white-space:nowrap;color:var(--color-text-main);animation:gfType var(--d) steps(var(--n),end) var(--delay) forwards}
.gf-caret{display:inline-block;width:8px;height:15px;background:var(--color-accent);animation:gfBlink 1.1s steps(1) infinite;margin-left:1px;align-self:center}
@keyframes gfType{to{width:calc(var(--n) * 1ch)}}
@keyframes gfBlink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes gfIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

@media (max-width:1000px){
  .gf-step{padding:12px 9px 14px;column-gap:9px}
  .gf-step-t{white-space:normal;line-height:1.15}
}
@media (max-width:820px){
  .gf-detail{grid-template-columns:1fr}
  .gf-term{border-left:none;border-top:1px dashed rgba(var(--rgb-text-main),.2)}
}
@media (max-width:720px){
  .gf-steps{gap:6px}
  .gf-step{grid-template-columns:1fr;justify-items:center;padding:9px 4px 11px;row-gap:5px}
  .gf-step-ic{grid-row:auto}
  .gf-step-t{display:none}
  .gf-step-n{align-self:auto}
  .gf-copy,.gf-term{padding:20px 18px}
  .gf-owner,.gf-pill{display:none}
  .gf-now span{max-width:150px}
  .gf-pr-state{margin-left:0;width:100%}
  .gf-btn{width:40px;height:40px}
}
@media (prefers-reduced-motion:reduce){
  .gf-cmd{animation:none;width:auto}
  .gf-copy{animation:none}
}
`;

  const icon = (name: OcticonName, size: number, cls = ''): string =>
    `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="${OCTICONS[name]}"/></svg>`;
  const mark = (size: number, cls = ''): string =>
    `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${GITHUB_MARK}"/></svg>`;
  /** An octicon nested into the drawing at a center point — it takes its color from the CSS `color` of its parent group. */
  const glyph = (name: OcticonName, cx: number, cy: number, size: number): string =>
    `<svg x="${(cx - size / 2).toFixed(1)}" y="${(cy - size / 2).toFixed(1)}" width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor"><path d="${OCTICONS[name]}"/></svg>`;
  const pad2 = (n: number): string => String(n).padStart(2, '0');
  const f = (n: number): string => n.toFixed(1);

  class GitFlow extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['lang'];
    }

    private _step = 0;
    private _playing = true;
    private _visible = false;
    private _started = false;
    private _vertical = false;
    private _reduced = false;
    private _timer: ReturnType<typeof setTimeout> | undefined;
    private _ro: ResizeObserver | null = null;
    private _io: IntersectionObserver | null = null;
    private _root: HTMLElement | null = null;
    private _sr: ShadowRoot | null = null;
    private _mount: HTMLElement | null = null;

    private get _lang(): Lang {
      return this.getAttribute('lang') === 'en' ? 'en' : 'pt';
    }
    private _t(s: I18nString): string {
      return s[this._lang];
    }

    connectedCallback(): void {
      if (!this._sr) {
        this._sr = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
        const st = document.createElement('style');
        st.textContent = CSS;
        this._mount = document.createElement('div');
        this._sr.append(st, this._mount);
      }
      this._reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (this._reduced) { this._playing = false; this._step = N - 1; }
      this._vertical = this.clientWidth > 0 && this.clientWidth < 820;
      this._render();

      this._sr.addEventListener('click', this._onClick);
      this._sr.addEventListener('keydown', this._onKey as EventListener);

      this._ro = new ResizeObserver(() => {
        const vertical = this.clientWidth > 0 && this.clientWidth < 820;
        if (vertical !== this._vertical) { this._vertical = vertical; this._renderGraph(); this._applyStep(); }
      });
      this._ro.observe(this);

      this._io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          this._visible = e.isIntersecting;
          if (this._visible) {
            // First time on screen: start from the top so the visitor sees the whole story.
            if (!this._started && !this._reduced) { this._started = true; this._step = 0; this._applyStep(); }
            this._schedule();
          } else {
            clearTimeout(this._timer);
          }
        }
      }, { threshold: 0.35 });
      this._io.observe(this);
    }

    disconnectedCallback(): void {
      clearTimeout(this._timer);
      this._ro?.disconnect();
      this._io?.disconnect();
      this._sr?.removeEventListener('click', this._onClick);
      this._sr?.removeEventListener('keydown', this._onKey as EventListener);
    }

    attributeChangedCallback(): void {
      if (this.isConnected && this._root) { this._render(); }
    }

    // ── interaction ──────────────────────────────────────────────────────
    private _onClick = (ev: Event): void => {
      const el = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-go],[data-act]');
      if (!el) return;
      const go = el.getAttribute('data-go');
      const act = el.getAttribute('data-act');
      if (go !== null) { this._playing = false; this._go(Number(go)); return; }
      if (act === 'prev') { this._playing = false; this._go((this._step + N - 1) % N); }
      else if (act === 'next') { this._playing = false; this._go((this._step + 1) % N); }
      else if (act === 'play') {
        this._playing = !this._playing;
        if (this._playing && this._step === N - 1) this._step = 0;
        this._go(this._step);
      }
    };

    private _onKey = (ev: KeyboardEvent): void => {
      if (!(ev.target as HTMLElement | null)?.closest('.gf-steps')) return;
      const dir = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
      if (!dir) return;
      ev.preventDefault();
      this._playing = false;
      this._go((this._step + dir + N) % N);
      this._sr?.querySelector<HTMLElement>('.gf-step.is-active')?.focus();
    };

    private _go(i: number): void {
      this._step = i;
      this._applyStep();
      this._schedule();
    }

    private _schedule(): void {
      clearTimeout(this._timer);
      if (!this._playing || !this._visible || this._reduced) return;
      this._timer = setTimeout(() => this._go((this._step + 1) % N), this._step === N - 1 ? STEP_MS * 1.5 : STEP_MS);
    }

    // ── rendering ────────────────────────────────────────────────────────
    private _render(): void {
      const L = this._lang;
      const steps = FLOW_STEPS.map((s, i) =>
        `<li><button type="button" class="gf-step" data-go="${i}" aria-label="${pad2(i + 1)} · ${s.title[L]}">`
        + `<span class="gf-step-ic">${icon(s.icon, 16)}</span><span class="gf-step-n">${pad2(i + 1)}</span><span class="gf-step-t">${s.short[L]}</span><i class="gf-prog"></i></button></li>`).join('');
      if (!this._mount) return;
      this._mount.innerHTML = `
<div class="gf" style="--gf-ms:${STEP_MS}ms">
  <div class="gf-stage">
    <div class="gf-bar">
      <span class="gf-repo">${mark(18)}<b class="gf-owner">${FLOW_UI.repo.split('/')[0]}</b><span class="gf-slash gf-owner">/</span><b>${FLOW_UI.repo.split('/')[1]}</b><i class="gf-pill">${this._t(FLOW_UI.visibility)}</i></span>
      <span class="gf-now">${icon('gitBranch', 14)}<span data-now>main</span></span>
    </div>
    <div class="gf-graphwrap" data-graph></div>
    <div class="gf-pr">
      <span class="gf-pr-ic">${icon('gitPullRequest', 16)}</span>
      <span class="gf-pr-title">${FLOW_UI.prTitle}</span><span class="gf-pr-num">${FLOW_UI.prNumber}</span>
      <span class="gf-pr-state" data-prstate></span>
      <span class="gf-check">${icon('check', 14)}<span>verify</span></span>
    </div>
  </div>
  <ol class="gf-steps" role="group" aria-label="${this._t(FLOW_UI.steps)}" style="list-style:none">${steps}</ol>
  <div class="gf-detail" data-detail></div>
</div>`;
      this._root = this._mount.querySelector<HTMLElement>('.gf');
      this._renderGraph();
      this._applyStep();
    }

    private _renderGraph(): void {
      const wrap = this._sr?.querySelector<HTMLElement>('[data-graph]');
      if (!wrap) return;
      wrap.innerHTML = this._graphSvg(this._vertical ? TALL : WIDE) + mark(92, 'gf-mark');
    }

    /** One drawing description → SVG for either layout. */
    private _graphSvg(L: Layout): string {
      const P = (u: number, v: number): string => { const [x, y] = L.map(u, v); return `${f(x)} ${f(y)}`; };
      const at = (u: number, v: number): Pt => L.map(u, v);
      const lang = this._lang;
      const v = L.vertical;

      /** A label next to a node: under it on the wide layout, to its right on the tall one. */
      const label = (u: number, lane: number, lines: ReadonlyArray<{ t: string; cls: string }>, from: number): string => {
        const [x, y] = at(u, lane);
        const body = lines.map((ln, i) => v
          ? `<text class="gf-lbl ${ln.cls}" x="${f(x + 17)}" y="${f(y + 4 + (i - (lines.length - 1) / 2) * 13)}">${ln.t}</text>`
          : `<text class="gf-lbl ${ln.cls}" x="${f(x)}" y="${f(y + 25 + i * 13)}" text-anchor="middle">${ln.t}</text>`).join('');
        return `<g class="gf-fade gf-feat-lbl" data-from="${from}">${body}</g>`;
      };
      /** A label *above* (wide) / right of (tall) a main-lane node. */
      const mainLabel = (u: number, text: string, from: number, cls = 'gf-lbl-main'): string => {
        const [x, y] = at(u, 0);
        return `<text class="gf-lbl ${cls} gf-fade" data-from="${from}" x="${f(v ? x + 17 : x)}" y="${f(v ? y + 4 : y - 18)}" ${v ? '' : 'text-anchor="middle"'}>${text}</text>`;
      };
      const node = (cls: string, u: number, lane: number, r: number, from: number, extra = ''): string => {
        const [x, y] = at(u, lane);
        return `<circle class="gf-el ${cls}" data-from="${from}" cx="${f(x)}" cy="${f(y)}" r="${r}"${extra}/>`;
      };
      const ping = (u: number, lane: number, k: number): string => {
        const [x, y] = at(u, lane);
        return `<circle class="gf-ping" data-ping="${k}" cx="${f(x)}" cy="${f(y)}" r="11"/>`;
      };

      const curveOut = `M${P(BRANCH_AT, 0)} C${P(BRANCH_AT + 2, 0.75)} ${P(BRANCH_AT + 35, 1)} ${P(LANE_FROM, 1)}`;
      const prCurve = `M${P(LANE_TO, 1)} C${P(LANE_TO + 50, 1)} ${P(LANE_TO + 35, 0)} ${P(MERGE_AT, 0)}`;
      const [prX, prY] = at((LANE_TO + MERGE_AT) / 2, 0.5);
      const [b1x, b1y] = at(712, 0.4);
      const [b2x, b2y] = at(815, 0.62);
      const [okx, oky] = [prX + 13, prY - 13];

      const parts: string[] = [];
      parts.push(`<path class="gf-main" d="M${P(40, 0)} L${P(MAIN_END, 0)}"/>`);
      for (const u of BASE_COMMITS) parts.push(`<circle class="gf-node-main" cx="${f(at(u, 0)[0])}" cy="${f(at(u, 0)[1])}" r="7"/>`);
      parts.push(mainLabel(40, 'main', -1));

      // lane
      parts.push(`<path class="gf-lane gf-draw" data-from="0" pathLength="1" d="${curveOut}"/>`);
      parts.push(`<path class="gf-lane gf-draw" data-from="1" pathLength="1" d="M${P(LANE_FROM, 1)} L${P(LANE_TO, 1)}"/>`);
      parts.push(node('gf-node-feat', LANE_FROM, 1, 5.5, 0));
      {
        const [lx, ly] = at(LANE_FROM, 1);
        const branchLive = v
          ? `<text class="gf-lbl gf-lbl-lane gf-lbl-live gf-fade" data-from="0" x="${f(lx + 17)}" y="${f(ly - 14)}">feat/github-flow</text>`
          : `<text class="gf-lbl gf-lbl-lane gf-lbl-live gf-fade" data-from="0" x="${f(lx - 8)}" y="${f(ly + 62)}">feat/github-flow</text>`;
        const branchGone = v
          ? `<text class="gf-lbl gf-lbl-dim gf-lbl-gone" x="${f(lx + 17)}" y="${f(ly - 14)}">${this._t(FLOW_UI.deleted)}</text>`
          : `<text class="gf-lbl gf-lbl-dim gf-lbl-gone" x="${f(lx - 8)}" y="${f(ly + 62)}">${this._t(FLOW_UI.deleted)}</text>`;
        parts.push(branchLive, branchGone);
      }
      parts.push(ping(BRANCH_AT, 0, 0));

      for (const c of FEATURE_COMMITS) {
        parts.push(node('gf-node-feat', c.u, 1, 7.5, c.from));
        parts.push(label(c.u, 1, [{ t: c.msg, cls: '' }, { t: c.hash, cls: 'gf-lbl-dim' }], c.from));
      }
      parts.push(ping(580, 1, 1), ping(665, 1, 3));

      // pull request → merge
      parts.push(`<path class="gf-pr-link gf-draw" data-from="2" pathLength="1" d="${prCurve}"/>`);
      parts.push(`<path class="gf-merge-link gf-draw" data-from="4" pathLength="1" d="${prCurve}"/>`);
      parts.push(`<g class="gf-el" data-from="2"><circle class="gf-prnode" cx="${f(prX)}" cy="${f(prY)}" r="16"/><g class="gf-prnode-ic">${glyph('gitPullRequest', prX, prY, 17)}</g></g>`);
      parts.push(ping((LANE_TO + MERGE_AT) / 2, 0.5, 2));
      // review: two comments, one green check
      parts.push(`<g class="gf-el" data-from="3"><circle class="gf-bubble" cx="${f(b1x)}" cy="${f(b1y)}" r="12"/><g class="gf-bubble-ic">${glyph('comment', b1x, b1y, 13)}</g></g>`);
      parts.push(`<g class="gf-el" data-from="3"><circle class="gf-bubble" cx="${f(b2x)}" cy="${f(b2y)}" r="12"/><g class="gf-bubble-ic">${glyph('comment', b2x, b2y, 13)}</g></g>`);
      parts.push(`<g class="gf-el" data-from="3"><circle class="gf-ok" cx="${f(okx)}" cy="${f(oky)}" r="9"/><g class="gf-ic-dark">${glyph('check', okx, oky, 11)}</g></g>`);

      // merge + ship
      parts.push(node('gf-node-merge', MERGE_AT, 0, 11, 4));
      {
        const [mx, my] = at(MERGE_AT, 0);
        parts.push(`<g class="gf-el gf-ic-dark" data-from="4">${glyph('gitMerge', mx, my, 13)}</g>`);
      }
      parts.push(ping(MERGE_AT, 0, 4));
      parts.push(mainLabel(MERGE_AT, 'merge', 4, 'gf-lbl-main'));
      parts.push(node('gf-node-ship', DEPLOY_AT, 0, 9, 5));
      {
        const [sx, sy] = at(DEPLOY_AT, 0);
        parts.push(`<g class="gf-el gf-ic-dark" data-from="5">${glyph('check', sx, sy, 11)}</g>`);
      }
      parts.push(ping(DEPLOY_AT, 0, 5));
      parts.push(mainLabel(DEPLOY_AT, this._t(FLOW_UI.published), 5, 'gf-lbl-main'));

      return `<svg class="gf-graph${v ? ' gf-tall' : ''}" viewBox="0 0 ${L.w} ${L.h}" role="img" aria-label="${FLOW_UI.graphLabel[lang]}">${parts.join('')}</svg>`;
    }

    /** Syncs everything that depends on the current step. */
    private _applyStep(): void {
      const root = this._root;
      if (!root) return;
      const s = this._step;
      const step = FLOW_STEPS[s] ?? FLOW_STEPS[0];
      root.setAttribute('data-step', String(s));
      root.classList.toggle('is-open', s >= 2 && s < 4);
      root.classList.toggle('is-checked', s >= 3);
      root.classList.toggle('is-merged', s >= 4);
      root.classList.toggle('is-playing', this._playing && !this._reduced);

      root.querySelectorAll<SVGElement>('[data-from]').forEach((el) => {
        el.classList.toggle('on', Number(el.getAttribute('data-from')) <= s);
      });

      const now = root.querySelector('[data-now]');
      // `main` until the branch has a commit, the feature branch while it lives, `main` again once merged.
      const onBranch = s >= 1 && s < 4;
      if (now) now.textContent = onBranch ? 'feat/github-flow' : 'main';
      const nowWrap = root.querySelector<HTMLElement>('.gf-now');
      if (nowWrap) nowWrap.style.color = onBranch ? 'var(--color-accent)' : 'var(--color-text-sec)';

      const prState = root.querySelector('[data-prstate]');
      if (prState) prState.textContent = this._t(step.pr);

      root.querySelectorAll<HTMLElement>('.gf-step').forEach((b, i) => {
        b.classList.toggle('is-active', i === s);
        b.classList.toggle('is-done', i < s);
        if (i === s) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });

      const detail = root.querySelector<HTMLElement>('[data-detail]');
      if (detail) {
        // While autoplay is running, announcing every step would talk over the visitor.
        detail.setAttribute('aria-live', this._playing ? 'off' : 'polite');
        let delay = 380;
        const lines = step.cmds.map((c) => {
          const d = c.length * 24;
          const html = `<div class="gf-line"><i>$</i><span class="gf-cmd" style="--n:${c.length};--d:${d}ms;--delay:${delay}ms">${c.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span></div>`;
          delay += d + 260;
          return html;
        }).join('');
        const L = this._lang;
        detail.innerHTML = `
<div class="gf-copy">
  <div class="gf-count"><span>${this._t(FLOW_UI.stepOf)} ${pad2(s + 1)}/${pad2(N)}</span>
    <span class="gf-ctrl">
      <button type="button" class="gf-btn" data-act="prev" aria-label="${this._t(FLOW_UI.prev)}"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 5 8l5 5"/></svg></button>
      <button type="button" class="gf-btn" data-act="play" aria-label="${this._playing ? this._t(FLOW_UI.pause) : this._t(FLOW_UI.play)}" aria-pressed="${this._playing}">${this._playing
        ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="3.5" y="2.5" width="3" height="11" rx=".5"/><rect x="9.5" y="2.5" width="3" height="11" rx=".5"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2.7v10.6a.5.5 0 0 0 .77.42l8.2-5.3a.5.5 0 0 0 0-.84l-8.2-5.3a.5.5 0 0 0-.77.42Z"/></svg>'}</button>
      <button type="button" class="gf-btn" data-act="next" aria-label="${this._t(FLOW_UI.next)}"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 3 5 5-5 5"/></svg></button>
    </span>
  </div>
  <h3 class="gf-title">${step.title[L]}</h3>
  <p class="gf-text">${step.text[L]}</p>
  <div class="gf-why"><i>${this._t(FLOW_UI.why)}</i>${icon('tag', 13)}<span>${step.why[L]}</span></div>
</div>
<div class="gf-term">
  <div class="gf-term-h">${FLOW_UI.repo.split('/')[1]} · ${step.id}</div>
  ${lines}
  <div class="gf-line"><i>$</i><span class="gf-caret"></span></div>
</div>`;
      }
    }
  }
  customElements.define('git-flow', GitFlow);
})();
