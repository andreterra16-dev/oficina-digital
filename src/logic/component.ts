/// <reference path="../types/dc-runtime.d.ts" />
import { BRANCH } from '../data/branch';
import { PRODUCT_TYPES } from '../data/product-types';
import { PROJECTS } from '../data/projects';
import { SKILLS, EDGES } from '../data/skills';
import { illustration } from './illustrations';
import { loadLikes, saveLikes } from './likes';
import { updateFavicon } from './favicon';
import { logoMark } from './logo-mark';
import { whatsAppLink } from './whatsapp';
import { TRANSLATIONS } from '../data/translations';
import type {
  ComponentProps,
  ComponentState,
  EnrichedProject,
  MobileBranchGroup,
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

const LANG_STORAGE_KEY = 'oficina-lang';
const THEME_STORAGE_KEY = 'oficina-theme';

function loadLang(): 'pt' | 'en' {
  try {
    const val = localStorage.getItem(LANG_STORAGE_KEY);
    return val === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
}

function loadTheme(): 'default' | 'alternate' {
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    return val === 'alternate' ? 'alternate' : 'default';
  } catch {
    return 'default';
  }
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
  /** The same skill data as `nodes`, regrouped by branch for the mobile
   *  "Mapa de IA" accordion (see `mobileSkillGroups()`) — no canvas
   *  coordinates, since it's a plain vertical list, not a drag surface. */
  mobileSkillGroups: readonly MobileBranchGroup[];
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
  headerName: RefObject<HTMLSpanElement>;
  iaLinksSvg: RefObject<SVGSVGElement>;
  iaCanvasFrame: RefObject<HTMLDivElement>;
  iaCanvasInner: RefObject<HTMLDivElement>;
  esteiraFrame: RefObject<HTMLDivElement>;
  esteiraInner: RefObject<HTMLDivElement>;
  // i18n and theme props
  t: Record<string, string>;
  currentLangLabel: string;
  currentThemeIcon: string;
  toggleLang: () => void;
  toggleTheme: () => void;
  /** wa.me deep links pre-filled with the active language's message —
   *  computed here (not left as static hrefs in the `.dc.html`) so they
   *  actually change with `lang`, same as `product.waLink` already did. */
  contactWaLink: string;
  slotWaLink: string;
}

/** The "drawing size" both free-form visualizations (skill canvas, product
 *  esteira) are laid out at — every child's percentage position and every
 *  fixed-px button/label inside them was designed assuming a box this big.
 *  Below this width, instead of letting the box shrink and those fixed-px
 *  children collide/overlap (the old behavior, and the reason mobile broke),
 *  the whole box is rendered at this exact size and then uniformly scaled
 *  down with `transform: scale()` to fit — see `fitToFrame()`. */
/** `IA_CANVAS_DESIGN` grew from 640×600 to 800×660 — node *positions* are
 *  percentages so this didn't change the tree's relative layout at all, but
 *  every node's own box (fixed-px padding/font, unaffected by this) now has
 *  proportionally more canvas around it. That's the fix for a real, valid
 *  complaint that couldn't be answered by touching `skills.ts` again:
 *  nothing was actually overlapping any more (see that file's own history
 *  of fixes), but with the design box only 25% wider than the widest label
 *  in it, node edges sat close enough to read as cramped regardless — a
 *  legitimate "give it room to breathe" ask, not a collision to hunt down. */
const IA_CANVAS_DESIGN = { w: 800, h: 660 };
const ESTEIRA_DESIGN = { w: 1100, h: 452 };

/** Scales `inner` (a fixed-size, `designW`×`designH` box) to exactly fill
 *  `frame`'s actual rendered width, and resizes `frame`'s own height to
 *  match — so the frame never has empty space around a mis-scaled inner box,
 *  and never clips it either.
 *
 *  Earlier this capped the scale at `Math.min(1, ...)` — never scale *up*,
 *  only down, on the assumption that `frame` would rarely exceed the design
 *  size on desktop. That assumption was wrong: both frames sit in a flexible
 *  layout (`#ia-canvas` is `flex:1 1 640px` next to a fixed-width aside,
 *  `#esteira-frame` simply fills its section) with no `max-width` of their
 *  own, so on a real, un-zoomed desktop viewport `frame.clientWidth` is
 *  routinely 900–1400px — well past the 640/1100 design size. Capped at 1,
 *  the box then rendered at its native design size *inside* that much wider
 *  frame, leaving dead space down one side. Browser zoom changes
 *  `clientWidth` in CSS px (zooming in shrinks it, zooming out grows it),
 *  so the one width band where `frame.clientWidth` happened to land at or
 *  below the design size — around 130% zoom on a typical monitor — was the
 *  only band that looked "correct" (scale actually kicking in, box filling
 *  the frame edge to edge); 100% and any further zoom-out widened the frame
 *  past the design size again and brought the dead space straight back, i.e.
 *  the exact "fica bacana em 130%, mas qualquer zoom out desproporciona"
 *  bug. Scaling to *exactly* `clientWidth / designW`, uncapped, makes the
 *  box always fill the frame at any zoom level or viewport width — see the
 *  `max-width` added to both frames in the markup, which keeps that uncapped
 *  scale from growing unreasonably large on very wide desktop windows. */
function fitToFrame(frame: HTMLElement | null, inner: HTMLElement | null, designW: number, designH: number): void {
  if (!frame || !inner) return;
  const scale = frame.clientWidth / designW;
  inner.style.transform = 'scale(' + scale + ')';
  frame.style.height = Math.round(designH * scale) + 'px';
}

/** The skill-tree connector lines' endpoints — one per `EDGES` pair, in that
 *  same order (so callers can zip the result against `EDGES`/the rendered
 *  `<line>` elements by index). Shared by `renderVals()` (for `l.color`,
 *  still template-bound — a color string was never the problem) and
 *  `_applyLinkCoords()` (which sets the real `x1`/`y1`/`x2`/`y2` — see that
 *  method's doc comment for why those aren't template-bound any more). */
function computeLinkCoords(): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const byId: Record<string, Skill> = {};
  SKILLS.forEach((s) => { byId[s.id] = s; });
  return EDGES.map(([a, b]) => {
    const from = byId[a], to = byId[b];
    return { x1: from?.x ?? 0, y1: from?.y ?? 0, x2: to?.x ?? 0, y2: to?.y ?? 0 };
  });
}

class Component extends DCLogic<ComponentProps, ComponentState> {
  override state: ComponentState = {
    skill: 'ia',
    productIndex: 0,
    project: null,
    likes: loadLikes(),
    lang: loadLang(),
    theme: loadTheme(),
  };

  readonly heroChar: RefObject<HTMLDivElement>;
  readonly avatar: RefObject<HTMLDivElement>;
  readonly chip1: RefObject<HTMLDivElement>;
  readonly chip2: RefObject<HTMLDivElement>;
  readonly chip3: RefObject<HTMLDivElement>;
  readonly railFill: RefObject<HTMLDivElement>;
  readonly railPct: RefObject<HTMLDivElement>;
  /** The "André Ricco Terra · " lead-in inside the header wordmark — hidden
   *  while the hero's own big name heading is in view (see `tick()` below)
   *  so the name isn't shown twice on screen at once; fades in once the
   *  visitor scrolls far enough that the hero's version has scrolled out. */
  readonly headerName: RefObject<HTMLSpanElement>;
  /** The skill-tree connector lines' `<svg>` — see `_applyLinkCoords()`. */
  readonly iaLinksSvg: RefObject<SVGSVGElement>;
  readonly iaCanvasFrame: RefObject<HTMLDivElement>;
  readonly iaCanvasInner: RefObject<HTMLDivElement>;
  readonly esteiraFrame: RefObject<HTMLDivElement>;
  readonly esteiraInner: RefObject<HTMLDivElement>;

  /** rAF handle for the throttled scroll handler — 0 when idle. */
  private _raf = 0;
  /** rAF handle for the throttled resize handler — 0 when idle. */
  private _resizeRaf = 0;
  // Only handlers `componentWillUnmount` needs to `removeEventListener` are
  // kept as fields; `tick` (rAF-scheduled, never removed directly) stays a
  // local closure inside `componentDidMount`.
  private _move: ((ev: MouseEvent) => void) | null = null;
  private _scroll: (() => void) | null = null;
  private _resize: (() => void) | null = null;

  constructor(props: ComponentProps) {
    super(props);
    this.heroChar = React.createRef<HTMLDivElement>();
    this.avatar = React.createRef<HTMLDivElement>();
    this.chip1 = React.createRef<HTMLDivElement>();
    this.chip2 = React.createRef<HTMLDivElement>();
    this.chip3 = React.createRef<HTMLDivElement>();
    this.railFill = React.createRef<HTMLDivElement>();
    this.railPct = React.createRef<HTMLDivElement>();
    this.headerName = React.createRef<HTMLSpanElement>();
    this.iaLinksSvg = React.createRef<SVGSVGElement>();
    this.iaCanvasFrame = React.createRef<HTMLDivElement>();
    this.iaCanvasInner = React.createRef<HTMLDivElement>();
    this.esteiraFrame = React.createRef<HTMLDivElement>();
    this.esteiraInner = React.createRef<HTMLDivElement>();
  }

  /** Re-fits both free-form visualizations to their current frame width —
   *  see `fitToFrame()`. Called on mount and on every (throttled) resize.
   *
   *  Below `MOBILE_BREAKPOINT` both `#ia-canvas` and `#esteira-frame` are
   *  `display:none` (CSS, `@media (max-width:720px)`), replaced by
   *  `#ia-mobile-groups` (an accordion list) and `#esteira-carousel` (a
   *  swipeable card deck) — neither a canvas nor a scale, so neither needs
   *  `fitToFrame()` at all. Calling it unconditionally here is still safe at
   *  that width: a `display:none` frame reports `clientWidth === 0`, so the
   *  computed scale is `0` — inert, since nothing renders it anyway. */
  private _fitCanvases = (): void => {
    fitToFrame(this.iaCanvasFrame.current, this.iaCanvasInner.current, IA_CANVAS_DESIGN.w, IA_CANVAS_DESIGN.h);
    fitToFrame(this.esteiraFrame.current, this.esteiraInner.current, ESTEIRA_DESIGN.w, ESTEIRA_DESIGN.h);
  };

  override componentDidMount(): void {
    // Apply initial theme to documentElement
    document.documentElement.setAttribute('data-theme', this.state.theme);
    updateFavicon(this.state.theme);

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
      // Same "past the hero" threshold ascii-cursor.ts already fades its
      // own intensity at (vh * .85) — reusing it means the header name
      // fades in right around when the hero's big name heading has
      // scrolled out, not some independently-tuned point.
      if (this.headerName.current) this.headerName.current.style.opacity = window.scrollY > window.innerHeight * .85 ? '1' : '0';
    };
    this._scroll = (): void => {
      if (!this._raf) this._raf = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', this._scroll, { passive: true });
    tick();

    this._fitCanvases();
    this._resize = (): void => {
      if (!this._resizeRaf) this._resizeRaf = requestAnimationFrame(() => { this._resizeRaf = 0; this._fitCanvases(); });
    };
    window.addEventListener('resize', this._resize, { passive: true });

    this._applyLinkCoords();
    this._applyCoverSrc();
  }

  // DCLogic's componentDidUpdate only forwards prevProps, not prevState
  // (see dc-runtime.d.ts) — nothing here to diff against, so this just
  // re-applies unconditionally on every update. Cheap and self-limiting:
  // _applyCoverSrc() only touches the DOM when a src is actually stale,
  // and the grid's 5 covers stabilize after the first call. What actually
  // needs this on every update is the modal's own `<image-slot>` — it
  // only mounts a fresh one each time a project opens, which didn't exist
  // yet for componentDidMount to have caught.
  override componentDidUpdate(): void {
    this._applyCoverSrc();
  }

  /** Sets the skill-tree connector lines' real `x1`/`y1`/`x2`/`y2` —
   *  imperatively, once, here, instead of templating them in the `.dc.html`
   *  (`x1="{{ l.x1 }}"` etc.). The raw, uncompiled `.dc.html` markup *is*
   *  this page's actual first paint — this runtime replaces it with the
   *  real render only once its own JS (which we don't control; it's
   *  `support.js`, vendored) has run a moment later. In that brief window
   *  the browser's native SVG parser sees the literal, un-interpolated
   *  `"{{ l.x1 }}"` string sitting in a numeric geometry attribute and
   *  logs a console error for it — self-correcting (nothing stays visibly
   *  broken once this runs) but real console noise on a page whose whole
   *  pitch is engineering rigor, and reproducible on the actual deployed
   *  site, not just a local-serving artifact. Static `x1="0"` etc. in the
   *  markup is always a valid attribute value, so the native parser never
   *  has anything to reject; `stroke` stays template-bound since a color
   *  string was never the problem — only numeric geometry attributes get
   *  validated this eagerly. Positions never change after mount (node
   *  layout is fixed), so this runs once and is done. */
  private _applyLinkCoords(): void {
    const svg = this.iaLinksSvg.current;
    if (!svg) return;
    const coords = computeLinkCoords();
    const lines = svg.querySelectorAll('line');
    lines.forEach((line, i) => {
      const c = coords[i];
      if (!c) return;
      line.setAttribute('x1', String(c.x1));
      line.setAttribute('y1', String(c.y1));
      line.setAttribute('x2', String(c.x2));
      line.setAttribute('y2', String(c.y2));
    });
  }

  /** Sets each project cover's real `src` — imperatively, via
   *  `data-cover-for="<project id>"` (an inert attribute nothing else
   *  reads), instead of templating `src="{{ p.logo }}"` directly on
   *  `<image-slot>`. Same root cause as `_applyLinkCoords()` above, but for
   *  a real custom element instead of a native SVG attribute: `<image-slot>`
   *  observes `src` and reacts (fetches/displays it) the moment it
   *  upgrades — which, in that same brief pre-render window, means it
   *  upgrades holding the literal, un-interpolated `"{{ p.logo }}"` text
   *  and fires a request for that literal string as a URL (a guaranteed
   *  404, visible in the Network tab on the deployed site). `<image-slot>`
   *  already has a fully supported empty state (its `placeholder` text) for
   *  "no `src` yet", so leaving it unset until this runs is not a hack. */
  private _applyCoverSrc(): void {
    for (const p of PROJECTS) {
      if (!p.logo) continue;
      document.querySelectorAll('[data-cover-for="' + p.id + '"]').forEach((el) => {
        if (el.getAttribute('src') !== p.logo) el.setAttribute('src', p.logo as string);
      });
    }
  }

  override componentWillUnmount(): void {
    if (this._move) window.removeEventListener('mousemove', this._move);
    if (this._scroll) window.removeEventListener('scroll', this._scroll);
    if (this._resize) window.removeEventListener('resize', this._resize);
  }

  toggleLang = (): void => {
    const nextLang = this.state.lang === 'pt' ? 'en' : 'pt';
    this.setState({ lang: nextLang });
    try {
      localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    } catch {}
  };

  toggleTheme = (): void => {
    const nextTheme = this.state.theme === 'default' ? 'alternate' : 'default';
    this.setState({ theme: nextTheme });
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {}
    document.documentElement.setAttribute('data-theme', nextTheme);
    updateFavicon(nextTheme);
  };

  /** Handles clicks on the desktop esteira's fixed stops
   *  (`[data-product-type]`). The mobile carousel (`#esteira-carousel`)
   *  doesn't go through this at all — its cards are self-contained and
   *  navigated by swipe/anchor, not by picking a stop that then reveals a
   *  separate detail panel. */
  pickProduct = (ev: ReactMouseEvent): void => {
    const btn = closestFromTarget(ev, '[data-product-type]');
    if (!btn) return;
    this._selectProduct(Number(btn.getAttribute('data-product-type')));
  };

  /** Selects product type `i`: moves the desktop esteira's avatar to its
   *  track position, updates state, and replays the detail panel's
   *  reveal animation. Shared by both `pickProduct` branches above. */
  private _selectProduct(i: number): void {
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
  }

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
  private enrichProject(p: Project, lang: 'pt' | 'en'): EnrichedProject {
    const liked = !!this.state.likes[p.id];
    return {
      ...p,
      badge: p.badge[lang],
      subtitle: p.subtitle[lang],
      placeholder: p.placeholder[lang],
      problem: p.problem[lang],
      result: p.result[lang],
      challenges: p.challenges[lang],
      evolution: p.evolution[lang],
      mapping: p.mapping[lang],
      coverKind: projectHasIllustration(p) ? 'illustration' : p.logoIsScreenshot ? 'screenshot' : 'logo',
      liked,
      likeIcon: liked ? '♥' : '♡',
      likeCount: p.baseLikes + (liked ? 1 : 0),
      illustrationEl: projectHasIllustration(p) ? illustration(p.illustration, p.color) : null,
      cardStyle: 'animation:rise .9s cubic-bezier(.16,1,.3,1) both;transition:transform .35s cubic-bezier(.16,1,.3,1),border-color .4s,box-shadow .4s;cursor:pointer;border-radius:6px;'
        + 'border:1px solid rgba(' + p.colorRgb + ',.5);box-shadow:0 0 0 1px rgba(' + p.colorRgb + ',.14),0 26px 60px -40px rgba(' + p.colorRgb + ',.55);'
        + 'background:var(--color-bg-elevated);overflow:hidden;display:flex;flex-direction:column',
      likeBtnStyle: 'display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:20px;cursor:pointer;font-family:\'JetBrains Mono\',monospace;font-size:11.5px;transition:transform .2s,background .25s,border-color .25s;'
        + (liked
          ? 'background:rgba(' + p.colorRgb + ',.22);border:1px solid rgba(' + p.colorRgb + ',.85);color:' + p.color + ';'
          : 'background:rgba(var(--rgb-text-main),.05);border:1px solid rgba(var(--rgb-text-main),.18);color:var(--color-text-sec);'),
    };
  }

  /** Positions and colors one skill-tree node.
   *
   *  Centering used to be `transform:translate(-50%,-50%)` — plain, until a
   *  node's `popIn` entrance animation (below) finished. `@keyframes popIn`
   *  animates `transform` too (`scale(.6)` → `scale(1.06)` → `scale(1)`),
   *  and a CSS animation's keyframe value for a property fully replaces
   *  that property's cascaded value for as long as the animation applies —
   *  with `animation-fill-mode:both`, that means *forever* after it ends,
   *  not just during. So every node's `transform:translate(-50%,-50%)` was
   *  silently discarded the moment its pop-in finished, ~150–460ms after
   *  mount, replaced by the animation's own final `transform:scale(1)`
   *  (visually a no-op — no scale, but also no centering). Anchored by its
   *  top-left corner instead of centered on `(n.x%, n.y%)`, every node
   *  rendered shifted right and down by half its own box size — harmless
   *  for a node with room to spare, but exactly what pushed the tree's
   *  right-most column (`x:80`, e.g. "Avaliação & Prompt", its longest
   *  label) far enough past the canvas edge for `#ia-canvas`'s
   *  `overflow:hidden` to clip it — a *content* bug wearing the same
   *  "corte no meio da tela" symptom as the zoom-scaling one, but
   *  independent of it and unrelated to viewport width or zoom level.
   *
   *  The fix: centering moves to the standalone `translate` CSS property
   *  (distinct from the `transform` property since Baseline ~2023, and not
   *  touched by any keyframe here) so `popIn`'s animated `transform:scale`
   *  composes with it instead of replacing it — the node pops in *from*
   *  its already-centered position, and stays centered forever after. */
  private nodeStyle(n: Skill, active: boolean): string {
    const b = BRANCH[n.b];
    const big = n.t <= 1;
    return 'position:absolute;left:' + n.x + '%;top:' + n.y + '%;translate:-50% -50%;'
      + 'padding:' + (big ? '12px 18px' : '9px 14px') + ';border-radius:3px;cursor:pointer;text-align:left;white-space:nowrap;'
      + 'font-family:inherit;color:' + (active ? 'var(--color-bg-base)' : 'var(--color-text-main)') + ';'
      + 'background:' + (active ? b.color : (big ? 'rgba(' + b.rgb + ',.14)' : 'var(--color-bg-panel)')) + ';'
      + 'border:1px solid rgba(' + b.rgb + (active ? ',1)' : (big ? ',.5)' : ',.3)')) + ';'
      + 'box-shadow:' + (active ? '0 10px 26px -12px rgba(' + b.rgb + ',.8)' : 'none') + ';'
      + 'transition:background .3s,color .3s,box-shadow .3s,transform .3s cubic-bezier(.16,1,.3,1);'
      + 'animation:popIn .55s cubic-bezier(.16,1,.3,1) both ' + (60 + n.t * 100) + 'ms;';
  }

  /** Regroups `SKILLS` by branch for the mobile "Mapa de IA" accordion — see
   *  `MobileBranchGroup`. Drops the root `core` node (it isn't a branch a
   *  visitor picks, it's the "André" center of the desktop canvas) and every
   *  canvas-only field (`x`/`y`/`t`), since a list row doesn't need them. */
  private mobileSkillGroups(lang: 'pt' | 'en'): MobileBranchGroup[] {
    const order: Array<'ia' | 'web' | 'dados'> = ['ia', 'web', 'dados'];
    return order.map((id) => {
      const b = BRANCH[id];
      return {
        id,
        label: b.label[lang],
        color: b.color,
        skills: SKILLS.filter((s) => s.b === id).map((s) => {
          const active = s.id === this.state.skill;
          return {
            id: s.id,
            label: s.label[lang],
            kind: s.kind[lang],
            desc: s.desc[lang],
            lvl: s.lvl,
            active,
            style: 'display:block;width:100%;text-align:left;padding:12px 14px;border-radius:4px;cursor:pointer;font-family:inherit;'
              + 'color:' + (active ? 'var(--color-bg-base)' : 'var(--color-text-main)') + ';'
              + 'background:' + (active ? b.color : 'rgba(' + b.rgb + ',.08)') + ';'
              + 'border:1px solid rgba(' + b.rgb + (active ? ',1)' : ',.25)') + ';'
              + 'transition:background .3s,color .3s;',
          };
        }),
      };
    });
  }

  /** Positions one esteira stop — same `translate`/`scale` split as
   *  `nodeStyle` above, and for the same reason: this also carries a
   *  `popIn` entrance animation, whose final keyframe (`transform:scale(1)`)
   *  would otherwise permanently clobber both the centering *and* the
   *  active stop's 1.16× highlight once the animation's `both` fill-mode
   *  locks it in — the standalone `translate`/`scale` properties are never
   *  touched by `popIn` (which only animates `transform`), so they survive
   *  it and the active stop's scale-up is fully in effect after mount. */
  private productStyle(pt: ProductType, i: number, active: boolean): string {
    return 'position:absolute;left:' + pt.x + '%;top:' + pt.y + '%;translate:-50% -50%;scale:' + (active ? '1.16' : '1') + ';'
      + 'width:56px;height:56px;border-radius:4px;display:grid;place-items:center;cursor:pointer;font-family:inherit;'
      + 'color:' + (active ? 'var(--color-bg-base)' : 'var(--color-accent)') + ';'
      + 'background:' + (active ? 'linear-gradient(150deg,var(--color-support-amber),var(--color-accent))' : 'rgba(var(--rgb-accent),.10)') + ';'
      + 'border:1px ' + (active ? 'solid rgba(var(--rgb-accent),.9)' : 'dashed rgba(var(--rgb-accent),.5)') + ';'
      + 'box-shadow:' + (active ? '0 10px 26px -14px rgba(var(--rgb-accent),.9)' : 'none') + ';z-index:5;'
      + 'transition:transform .45s cubic-bezier(.34,1.28,.4,1),box-shadow .3s;'
      + 'animation:popIn .55s cubic-bezier(.16,1,.3,1) both ' + (120 + i * 85) + 'ms;';
  }

  override renderVals(): RenderVals {
    const lang = this.state.lang;
    const sel = SKILLS.find((s) => s.id === this.state.skill) ?? SKILLS[1] ?? SKILLS[0];
    const byId: Record<string, Skill> = {};
    SKILLS.forEach((s) => { byId[s.id] = s; });

    const currentProduct = PRODUCT_TYPES[this.state.productIndex] ?? PRODUCT_TYPES[0];
    const product: ProductTypeView = {
      tag: currentProduct.tag,
      title: currentProduct.title[lang],
      explainer: currentProduct.explainer[lang],
      examples: currentProduct.examples[lang],
      idealFor: currentProduct.idealFor[lang],
      timeframe: currentProduct.timeframe[lang],
      counter: lang === 'pt'
        ? 'Tipo ' + currentProduct.tag + ' de ' + String(PRODUCT_TYPES.length).padStart(2, '0')
        : 'Type ' + currentProduct.tag + ' of ' + String(PRODUCT_TYPES.length).padStart(2, '0'),
      waLink: whatsAppLink(lang === 'pt'
        ? 'Olá, André! Vim pela Oficina Digital e quero falar sobre um projeto de ' + currentProduct.title.pt + '.'
        : 'Hello, André! I came through the Digital Workshop and want to talk about a ' + currentProduct.title.en + ' project.'),
    };

    const activeProjectSource = PROJECTS.find((p) => p.id === this.state.project) ?? null;

    // Load active translations
    const t: Record<string, string> = {};
    for (const [key, value] of Object.entries(TRANSLATIONS)) {
      t[key] = value[lang];
    }

    return {
      cursorOn: this.props.cursorEnabled !== false,
      cursorDensity: this.props.cursorDensity ?? 20,
      heroPixelSize: this.props.revealPixelSize ?? 28,
      nodes: SKILLS.map((n) => ({
        ...n,
        label: n.label[lang],
        kind: n.kind[lang],
        desc: n.desc[lang],
        style: this.nodeStyle(n, n.id === this.state.skill),
      })),
      mobileSkillGroups: this.mobileSkillGroups(lang),
      links: (() => {
        const coords = computeLinkCoords();
        return EDGES.map(([, b], i) => {
          const to = byId[b];
          const c = coords[i] ?? { x1: 0, y1: 0, x2: 0, y2: 0 };
          return { ...c, color: to ? BRANCH[to.b].color : BRANCH.core.color };
        });
      })(),
      productTypes: PRODUCT_TYPES.map((pt, i) => {
        const active = i === this.state.productIndex;
        return {
          ...pt,
          short: pt.short[lang],
          title: pt.title[lang],
          explainer: pt.explainer[lang],
          examples: pt.examples[lang],
          idealFor: pt.idealFor[lang],
          timeframe: pt.timeframe[lang],
          i,
          style: this.productStyle(pt, i, active),
          waLink: whatsAppLink(lang === 'pt'
            ? 'Olá, André! Vim pela Oficina Digital e quero falar sobre um projeto de ' + pt.title.pt + '.'
            : 'Hello, André! I came through the Digital Workshop and want to talk about a ' + pt.title.en + ' project.'),
        };
      }),
      product,
      sel: {
        label: sel.label[lang],
        branchLabel: BRANCH[sel.b].label[lang],
        desc: sel.desc[lang],
        levelPct: sel.lvl + '%',
        levelLabel: sel.lvl >= 85
          ? (lang === 'pt' ? 'avançado' : 'advanced')
          : sel.lvl >= 74
            ? (lang === 'pt' ? 'sólido' : 'solid')
            : (lang === 'pt' ? 'em evolução' : 'evolving'),
      },
      logoMarkHeader: logoMark(36, true, this.state.theme),
      logoMarkFooter: logoMark(26, false, this.state.theme),
      logoMarkStamp: logoMark(30, false, this.state.theme),
      logoMarkModal: logoMark(22, false, this.state.theme),
      projects: PROJECTS.map((p) => this.enrichProject(p, lang)),
      activeProject: activeProjectSource ? this.enrichProject(activeProjectSource, lang) : null,
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
      headerName: this.headerName,
      iaLinksSvg: this.iaLinksSvg,
      iaCanvasFrame: this.iaCanvasFrame,
      iaCanvasInner: this.iaCanvasInner,
      esteiraFrame: this.esteiraFrame,
      esteiraInner: this.esteiraInner,
      // i18n and theme variables
      t,
      currentLangLabel: lang === 'pt' ? 'EN' : 'PT',
      currentThemeIcon: this.state.theme === 'default' ? '🌙' : '☀',
      toggleLang: this.toggleLang,
      toggleTheme: this.toggleTheme,
      // `t['key']` (not `t.key`): `t` is a plain `Record<string, string>` —
      // bracket access is what `noPropertyAccessFromIndexSignature` requires
      // for it, same as everywhere else this file reads through an index
      // signature.
      contactWaLink: whatsAppLink(t['contactWhatsAppMessage'] ?? ''),
      slotWaLink: whatsAppLink(t['slotWhatsAppMessage'] ?? ''),
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
