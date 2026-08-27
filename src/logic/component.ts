/// <reference path="../types/dc-runtime.d.ts" />
import { BRANCH } from '../data/branch';
import { PRODUCT_TYPES } from '../data/product-types';
import { PROJECTS } from '../data/projects';
import { SKILLS, EDGES } from '../data/skills';
import { illustration } from './illustrations';
import { loadLikes, saveLikes } from './likes';
import { logoMark } from './logo-mark';
import { whatsAppLink } from './whatsapp';
import type {
  ComponentProps,
  ComponentState,
  EnrichedProject,
  ProductType,
  ProductTypeView,
  ProductTypeWithStyle,
  Project,
  RenderedLink,
  SelectionView,
  Skill,
  SkillWithStyle,
} from '../types/domain';
import { projectHasIllustration } from '../types/domain';
// Type-only import: erased entirely at compile time (no runtime `import`
// statement survives), so this doesn't conflict with the ambient `React`
// *value* declared in dc-runtime.d.ts (used for React.createElement /
// React.createRef calls below) — this import only brings in the names
// needed for *type* positions like `RefObject<...>` and `MouseEvent`,
// which a bare `declare const React: typeof import('react')` value
// doesn't expose as a namespace.
import type { MouseEvent as ReactMouseEvent, ReactElement, RefObject, SyntheticEvent } from 'react';

/** Finds the nearest ancestor (inclusive) of the click target matching `selector`. */
function closestFromTarget(ev: SyntheticEvent, selector: string): HTMLElement | null {
  const target = ev.target as HTMLElement | null;
  return target ? target.closest<HTMLElement>(selector) : null;
}

/** The flat object `renderVals()` hands to the `.dc.html` template — every
 *  `{{ name }}` interpolation and `sc-for`/`sc-if` in the template must have
 *  a matching key here. */
interface RenderVals {
  cursorOn: boolean;
  cursorDensity: number;
  heroPixelSize: number;
  nodes: readonly SkillWithStyle[];
  links: readonly RenderedLink[];
  productTypes: readonly ProductTypeWithStyle[];
  product: ProductTypeView;
  sel: SelectionView;
  logoMarkHeader: ReactElement;
  logoMarkFooter: ReactElement;
  logoMarkStamp: ReactElement;
  logoMarkModal: ReactElement;
  projects: readonly EnrichedProject[];
  activeProject: EnrichedProject | null;
  openProject: (ev: ReactMouseEvent) => void;
  closeProject: () => void;
  stopPropagation: (ev: SyntheticEvent) => void;
  toggleLike: (ev: ReactMouseEvent) => void;
  pickSkill: (ev: ReactMouseEvent) => void;
  pickProduct: (ev: ReactMouseEvent) => void;
  heroChar: RefObject<HTMLDivElement>;
  avatar: RefObject<HTMLDivElement>;
  chip1: RefObject<HTMLDivElement>;
  chip2: RefObject<HTMLDivElement>;
  chip3: RefObject<HTMLDivElement>;
  railFill: RefObject<HTMLDivElement>;
  railPct: RefObject<HTMLDivElement>;
}

class Component extends DCLogic<ComponentProps, ComponentState> {
  override state: ComponentState = { skill: 'ia', productIndex: 0, project: null, likes: loadLikes() };

  readonly heroChar: RefObject<HTMLDivElement>;
  readonly avatar: RefObject<HTMLDivElement>;
  readonly chip1: RefObject<HTMLDivElement>;
  readonly chip2: RefObject<HTMLDivElement>;
  readonly chip3: RefObject<HTMLDivElement>;
  readonly railFill: RefObject<HTMLDivElement>;
  readonly railPct: RefObject<HTMLDivElement>;

  /** rAF handle for the throttled scroll handler — 0 when idle. */
  private _raf = 0;
  // Only handlers `componentWillUnmount` needs to `removeEventListener` are
  // kept as fields; `tick` (rAF-scheduled, never removed directly) stays a
  // local closure inside `componentDidMount`.
  private _move: ((ev: MouseEvent) => void) | null = null;
  private _scroll: (() => void) | null = null;

  constructor(props: ComponentProps) {
    super(props);
    this.heroChar = React.createRef<HTMLDivElement>();
    this.avatar = React.createRef<HTMLDivElement>();
    this.chip1 = React.createRef<HTMLDivElement>();
    this.chip2 = React.createRef<HTMLDivElement>();
    this.chip3 = React.createRef<HTMLDivElement>();
    this.railFill = React.createRef<HTMLDivElement>();
    this.railPct = React.createRef<HTMLDivElement>();
  }

  override componentDidMount(): void {
    this._move = (ev: MouseEvent): void => {
      const dx = (ev.clientX / window.innerWidth - 0.5), dy = (ev.clientY / window.innerHeight - 0.5);
      if (this.heroChar.current) {
        this.heroChar.current.style.transform = 'translate3d(' + (dx * -30) + 'px,' + (dy * -14) + 'px,0)';
      }
      ([[this.chip1, 42], [this.chip2, -34], [this.chip3, 26]] as const).forEach(([r, k]) => {
        if (r.current) r.current.style.translate = (dx * k) + 'px ' + (dy * k * .5) + 'px';
      });
    };
    window.addEventListener('mousemove', this._move, { passive: true });

    const tick = (): void => {
      this._raf = 0;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.max(0, Math.min(100, Math.round((window.scrollY / max) * 100)));
      if (this.railFill.current) this.railFill.current.style.height = pct + '%';
      if (this.railPct.current) this.railPct.current.textContent = String(pct).padStart(2, '0') + '%';
    };
    this._scroll = (): void => {
      if (!this._raf) this._raf = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', this._scroll, { passive: true });
    tick();
  }

  override componentWillUnmount(): void {
    if (this._move) window.removeEventListener('mousemove', this._move);
    if (this._scroll) window.removeEventListener('scroll', this._scroll);
  }

  pickProduct = (ev: ReactMouseEvent): void => {
    const btn = closestFromTarget(ev, '[data-product-type]');
    if (!btn) return;
    const i = Number(btn.getAttribute('data-product-type'));
    const pt = PRODUCT_TYPES[i];
    if (!pt) return;
    if (this.avatar.current) {
      this.avatar.current.style.left = pt.x + '%';
      this.avatar.current.style.top = pt.y + '%';
    }
    this.setState({ productIndex: i });
    const panel = document.querySelector('[data-product-panel]');
    if (panel) {
      panel.animate(
        [{ opacity: .3, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 460, easing: 'cubic-bezier(.16,1,.3,1)' }
      );
    }
  };

  pickSkill = (ev: ReactMouseEvent): void => {
    const btn = closestFromTarget(ev, '[data-skill]');
    const id = btn?.getAttribute('data-skill');
    if (!id) return;
    this.setState({ skill: id });
  };

  openProject = (ev: ReactMouseEvent): void => {
    const card = closestFromTarget(ev, '[data-project]');
    if (!card) return;
    this.setState({ project: card.getAttribute('data-project') });
  };

  closeProject = (): void => {
    this.setState({ project: null });
  };

  stopPropagation = (ev: SyntheticEvent): void => {
    ev.stopPropagation();
  };

  toggleLike = (ev: ReactMouseEvent): void => {
    const btn = closestFromTarget(ev, '[data-like]');
    const id = btn?.getAttribute('data-like');
    if (!btn || !id) return;
    ev.stopPropagation();
    const likes = { ...this.state.likes, [id]: !this.state.likes[id] };
    this.setState({ likes });
    saveLikes(likes);
    btn.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }],
      { duration: 420, easing: 'cubic-bezier(.34,1.56,.4,1)' }
    );
  };

  /** Adds this render's computed fields (like state, inline styles, illustration element) to a `Project`. */
  private enrichProject(p: Project): EnrichedProject {
    const liked = !!this.state.likes[p.id];
    return {
      ...p,
      liked,
      likeIcon: liked ? '♥' : '♡',
      likeCount: p.baseLikes + (liked ? 1 : 0),
      illustrationEl: projectHasIllustration(p) ? illustration(p.illustration, p.color) : null,
      cardStyle: 'animation:rise .9s cubic-bezier(.16,1,.3,1) both;transition:transform .35s cubic-bezier(.16,1,.3,1),border-color .4s,box-shadow .4s;cursor:pointer;border-radius:6px;'
        + 'border:1px solid rgba(' + p.colorRgb + ',.5);box-shadow:0 0 0 1px rgba(' + p.colorRgb + ',.14),0 26px 60px -40px rgba(' + p.colorRgb + ',.55);'
        + 'background:#26231F;overflow:hidden;display:flex;flex-direction:column',
      likeBtnStyle: 'display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:20px;cursor:pointer;font-family:\'JetBrains Mono\',monospace;font-size:11.5px;transition:transform .2s,background .25s,border-color .25s;'
        + (liked
          ? 'background:rgba(' + p.colorRgb + ',.22);border:1px solid rgba(' + p.colorRgb + ',.85);color:' + p.color + ';'
          : 'background:rgba(241,234,221,.05);border:1px solid rgba(241,234,221,.18);color:#A69C8C;'),
    };
  }

  private nodeStyle(n: Skill, active: boolean): string {
    const b = BRANCH[n.b];
    const big = n.t <= 1;
    return 'position:absolute;left:' + n.x + '%;top:' + n.y + '%;transform:translate(-50%,-50%);'
      + 'padding:' + (big ? '12px 18px' : '9px 14px') + ';border-radius:3px;cursor:pointer;text-align:left;white-space:nowrap;'
      + 'font-family:inherit;color:' + (active ? '#1B1917' : '#F1EADD') + ';'
      + 'background:' + (active ? b.color : (big ? 'rgba(' + b.rgb + ',.14)' : 'rgba(33,31,28,.94)')) + ';'
      + 'border:1px solid rgba(' + b.rgb + (active ? ',1)' : (big ? ',.5)' : ',.3)')) + ';'
      + 'box-shadow:' + (active ? '0 10px 26px -12px rgba(' + b.rgb + ',.8)' : 'none') + ';'
      + 'transition:background .3s,color .3s,box-shadow .3s,transform .3s cubic-bezier(.16,1,.3,1);'
      + 'animation:popIn .55s cubic-bezier(.16,1,.3,1) both ' + (60 + n.t * 100) + 'ms;';
  }

  private productStyle(pt: ProductType, i: number, active: boolean): string {
    return 'position:absolute;left:' + pt.x + '%;top:' + pt.y + '%;transform:translate(-50%,-50%)' + (active ? ' scale(1.16)' : ' scale(1)') + ';'
      + 'width:56px;height:56px;border-radius:4px;display:grid;place-items:center;cursor:pointer;font-family:inherit;'
      + 'color:' + (active ? '#1B1917' : '#E4622E') + ';'
      + 'background:' + (active ? 'linear-gradient(150deg,#E0A544,#E4622E)' : 'rgba(228,98,46,.10)') + ';'
      + 'border:1px ' + (active ? 'solid rgba(228,98,46,.9)' : 'dashed rgba(228,98,46,.5)') + ';'
      + 'box-shadow:' + (active ? '0 10px 26px -14px rgba(228,98,46,.9)' : 'none') + ';z-index:5;'
      + 'transition:transform .45s cubic-bezier(.34,1.28,.4,1),box-shadow .3s;'
      + 'animation:popIn .55s cubic-bezier(.16,1,.3,1) both ' + (120 + i * 85) + 'ms;';
  }

  override renderVals(): RenderVals {
    const sel = SKILLS.find((s) => s.id === this.state.skill) ?? SKILLS[1] ?? SKILLS[0];
    const byId: Record<string, Skill> = {};
    SKILLS.forEach((s) => { byId[s.id] = s; });

    const currentProduct = PRODUCT_TYPES[this.state.productIndex] ?? PRODUCT_TYPES[0];
    const product: ProductTypeView = {
      tag: currentProduct.tag, title: currentProduct.title, explainer: currentProduct.explainer,
      examples: currentProduct.examples, idealFor: currentProduct.idealFor, timeframe: currentProduct.timeframe,
      counter: 'Tipo ' + currentProduct.tag + ' de ' + String(PRODUCT_TYPES.length).padStart(2, '0'),
      waLink: whatsAppLink('Olá, André! Vim pela Oficina Digital e quero falar sobre um projeto de ' + currentProduct.title + '.'),
    };

    const activeProjectSource = PROJECTS.find((p) => p.id === this.state.project) ?? null;

    return {
      cursorOn: this.props.cursorEnabled !== false,
      cursorDensity: this.props.cursorDensity ?? 20,
      heroPixelSize: this.props.revealPixelSize ?? 28,
      nodes: SKILLS.map((n) => ({ ...n, style: this.nodeStyle(n, n.id === this.state.skill) })),
      links: EDGES.map(([a, b]) => {
        const from = byId[a], to = byId[b];
        return { x1: from?.x ?? 0, y1: from?.y ?? 0, x2: to?.x ?? 0, y2: to?.y ?? 0, color: to ? BRANCH[to.b].color : BRANCH.core.color };
      }),
      productTypes: PRODUCT_TYPES.map((pt, i) => ({ ...pt, i, style: this.productStyle(pt, i, i === this.state.productIndex) })),
      product,
      sel: {
        label: sel.label,
        branchLabel: BRANCH[sel.b].label,
        desc: sel.desc,
        levelPct: sel.lvl + '%',
        levelLabel: sel.lvl >= 85 ? 'avançado' : sel.lvl >= 74 ? 'sólido' : 'em evolução',
      },
      logoMarkHeader: logoMark(36, true),
      logoMarkFooter: logoMark(26, false),
      logoMarkStamp: logoMark(30, false),
      logoMarkModal: logoMark(22, false),
      projects: PROJECTS.map((p) => this.enrichProject(p)),
      activeProject: activeProjectSource ? this.enrichProject(activeProjectSource) : null,
      openProject: this.openProject,
      closeProject: this.closeProject,
      stopPropagation: this.stopPropagation,
      toggleLike: this.toggleLike,
      pickSkill: this.pickSkill,
      pickProduct: this.pickProduct,
      heroChar: this.heroChar,
      avatar: this.avatar,
      chip1: this.chip1,
      chip2: this.chip2,
      chip3: this.chip3,
      railFill: this.railFill,
      railPct: this.railPct,
    };
  }
}

// The DC runtime (`support.js`) executes this compiled script via
// `new Function("DCLogic","StreamableLogic","React", src + "...return
// Component...")` — it looks up the identifier `Component` in this script's
// own top-level scope after running it. `export` here exists only so the
// bundler (esbuild) can see this class is used and keep it instead of
// tree-shaking it away as dead code; the build script strips the resulting
// `export { Component }` line before injecting the bundle into the
// `.dc.html`'s `<script data-dc-script>` tag — see scripts/build.ts.
export { Component };
