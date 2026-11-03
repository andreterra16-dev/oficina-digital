/// <reference path="../types/dc-runtime.d.ts" />
import { BRANCH } from '../data/branch';
import { PROJECTS } from '../data/projects';
import { SKILLS } from '../data/skills';
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
  Project,
  SelectionView,
  Skill,
  TerminalCommandGroup,
} from '../types/domain';
import { projectHasIllustration } from '../types/domain';
// Type-only import: erased entirely at compile time (no runtime `import`
// statement survives), so this doesn't conflict with the ambient `React`
// *value* declared in dc-runtime.d.ts (used for React.createElement /
// React.createRef calls below) — this import only brings in the names
// needed for *type* positions like `RefObject<...>` and `MouseEvent`,
// which a bare `declare const React: typeof import('react')` value
// doesn't expose as a namespace.
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactElement, RefObject, SyntheticEvent } from 'react';

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
  /** The Bancada de IA terminal's `$ help` command list, grouped by branch —
   *  see `terminalCommandGroups()`. */
  terminalCommands: readonly TerminalCommandGroup[];
  /** Active language code, handed to `<git-flow lang>` — the element renders
   *  its own copy from `src/data/github-flow.ts`, so it only needs to know which one. */
  langCode: 'pt' | 'en';
  /** Replays `<pixel-sprite>`'s assembly on every skill click — see `ComponentState.skillNonce`. */
  skillNonce: number;
  sel: SelectionView;
  /** True once the Bancada de IA terminal query is long enough to be a
   *  real attempt (≥2 normalized chars) and still matches no skill. */
  terminalNotFound: boolean;
  handleTerminalInput: (ev: ChangeEvent<HTMLInputElement>) => void;
  handleTerminalKeyDown: (ev: ReactKeyboardEvent<HTMLInputElement>) => void;
  terminalQuery: string;
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
  heroChar: RefObject<HTMLDivElement>;
  avatar: RefObject<HTMLDivElement>;
  chip1: RefObject<HTMLDivElement>;
  chip2: RefObject<HTMLDivElement>;
  chip3: RefObject<HTMLDivElement>;
  railFill: RefObject<HTMLDivElement>;
  railPct: RefObject<HTMLDivElement>;
  headerName: RefObject<HTMLSpanElement>;
  // i18n and theme props
  t: Record<string, string>;
  currentLangLabel: string;
  currentThemeIcon: string;
  toggleLang: () => void;
  toggleTheme: () => void;
  /** wa.me deep links pre-filled with the active language's message —
   *  computed here (not left as static hrefs in the `.dc.html`) so they
   *  actually change with `lang`. */
  contactWaLink: string;
  slotWaLink: string;
}

/** Lowercases and strips diacritics, so "aç" and "rag" both match "RAG &
 *  Embeddings" regardless of accent/case — visitors typing a skill name
 *  into the Bancada de IA terminal shouldn't need exact capitalization. */
function normalizeQuery(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Finds the `Skill` a typed terminal query names, by `id` or by its
 *  localized `label` (both substring matches) — or `undefined` when the
 *  query is too short to be meaningful (< 2 normalized characters) or
 *  matches nothing. Shared by `renderVals()` (to pick `sel`) and the
 *  "not found" hint it derives alongside it. */
function matchSkill(query: string, lang: 'pt' | 'en'): Skill | undefined {
  const q = normalizeQuery(query);
  if (q.length < 2) return undefined;
  return SKILLS.find((s) => normalizeQuery(s.id).includes(q) || normalizeQuery(s.label[lang]).includes(q));
}

/** Tab-completion for the terminal input: a stricter, *prefix*-only match
 *  (unlike `matchSkill`'s "anywhere" substring — the same distinction a real
 *  shell's Tab-completion makes vs. its history search), so completing
 *  "reac" always resolves toward "React" and never toward some other skill
 *  that merely *contains* "reac" somewhere. Prefers the localized label
 *  (what a visitor is actually typing — words, not internal ids like `pg`
 *  or `ux`) and falls back to the `id` only when nothing matches by label
 *  — id-only completion still matters for the handful of skills whose id
 *  isn't a prefix of its own label (`pg` → "PostgreSQL", `ux` → "UI de
 *  produto"). Returns the text to complete *to*, or `undefined` once the
 *  query already spells that out in full (nothing left to complete). */
function completeSkillQuery(query: string, lang: 'pt' | 'en'): string | undefined {
  const q = normalizeQuery(query);
  if (q.length < 1) return undefined;
  const byLabel = SKILLS.find((s) => normalizeQuery(s.label[lang]).startsWith(q));
  if (byLabel) return normalizeQuery(byLabel.label[lang]) !== q ? byLabel.label[lang] : undefined;
  const byId = SKILLS.find((s) => normalizeQuery(s.id).startsWith(q));
  return byId && byId.id !== q ? byId.id : undefined;
}

/** Renders a 0–100 level as a 10-block ASCII bar (`'████████░░'`) — real
 *  terminal output (htop, a progress bar in a CI log) prints characters,
 *  never a CSS gradient div, so the Bancada de IA terminal panel does too. */
function asciiLevelBar(lvl: number): string {
  const filled = Math.max(0, Math.min(10, Math.round((lvl / 100) * 10)));
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

class Component extends DCLogic<ComponentProps, ComponentState> {
  override state: ComponentState = {
    skill: 'ia',
    terminalQuery: '',
    skillNonce: 0,
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
    this.headerName = React.createRef<HTMLSpanElement>();
  }

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

  pickSkill = (ev: ReactMouseEvent): void => {
    const btn = closestFromTarget(ev, '[data-skill]');
    const id = btn?.getAttribute('data-skill');
    if (!id) return;
    // Clearing `terminalQuery` here means a click always wins over whatever
    // was previously typed — otherwise a stale typed query still matching
    // some *other* skill would keep overriding the just-clicked node in
    // `renderVals()`'s `sel` (typed match takes priority — see there).
    this.setState({ skill: id, terminalQuery: '', skillNonce: this.state.skillNonce + 1 });
    this._keepSpriteInView();
  };

  /** On a phone the command chips can sit a screen away from the readout
   *  they drive, so a tap would animate the pixel illustration somewhere the
   *  visitor can't see. After the click's render lands, bring it into view —
   *  centered, so the chips stay visible above it and the start of the
   *  description below — but only when it isn't already comfortably on screen
   *  (24px clear of the viewport's bottom edge, and below the fixed header). */
  private _keepSpriteInView(): void {
    if (!window.matchMedia?.('(max-width: 720px)').matches) return;
    setTimeout(() => {
      const fig = document.getElementById('ia-sprite-fig');
      if (!fig) return;
      const r = fig.getBoundingClientRect();
      if (r.top >= 84 && r.bottom <= window.innerHeight - 24) return;
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      fig.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
    }, 0);
  }

  /** Bancada de IA terminal input — live, on every keystroke (`onChange`
   *  fires per-input on a controlled `<input>`, same as native `input`).
   *  Just records the typed text; `renderVals()` does the actual lookup
   *  (`matchSkill`) so there's one source of truth for "what's selected"
   *  shared with `pickSkill` above. */
  handleTerminalInput = (ev: ChangeEvent<HTMLInputElement>): void => {
    this.setState({ terminalQuery: ev.target.value });
  };

  /** `Tab` inside the terminal input completes the typed text toward a
   *  matching skill (see `completeSkillQuery`) instead of doing its native
   *  job of moving focus to the next element — the same override every
   *  real shell/IDE makes for the same reason: completion is *the* point
   *  of pressing Tab here, not a form field a visitor is trying to escape.
   *  No other key is special-cased; a plain `Enter` just stays a no-op
   *  (there's no `<form>` around this input to submit). */
  handleTerminalKeyDown = (ev: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (ev.key !== 'Tab') return;
    const completion = completeSkillQuery(this.state.terminalQuery, this.state.lang);
    if (!completion) return;
    ev.preventDefault();
    this.setState({ terminalQuery: completion });
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

  /** Builds the Bancada de IA terminal's `$ help` command list: `SKILLS`
   *  regrouped by branch (dropping the root `core` entry — it isn't a
   *  command a visitor picks, it's the "André" center of the old canvas),
   *  each row styled by whether it's the currently-displayed skill
   *  (`selId`, resolved in `renderVals()` from either a click or a matching
   *  typed query — see there). A row is a plain button (`data-skill`), not
   *  a positioned canvas node — no `x`/`y`/`t` needed any more. */
  private terminalCommandGroups(lang: 'pt' | 'en', selId: string): TerminalCommandGroup[] {
    const order: Array<'ia' | 'web' | 'dados'> = ['ia', 'web', 'dados'];
    return order.map((id) => {
      const b = BRANCH[id];
      return {
        id,
        label: b.label[lang],
        color: b.color,
        commands: SKILLS.filter((s) => s.b === id).map((s) => {
          const active = s.id === selId;
          return {
            id: s.id,
            label: s.label[lang],
            color: b.color,
            active,
            style: 'display:flex;align-items:baseline;gap:10px;width:100%;text-align:left;padding:7px 10px;border-radius:3px;cursor:pointer;font-family:inherit;'
              + 'background:' + (active ? 'rgba(' + b.rgb + ',.16)' : 'transparent') + ';'
              + 'border:1px solid ' + (active ? 'rgba(' + b.rgb + ',.5)' : 'transparent') + ';'
              + 'transition:background .2s,border-color .2s;',
          };
        }),
      };
    });
  }

  override renderVals(): RenderVals {
    const lang = this.state.lang;
    // A typed terminal query that matches a skill wins over the last-clicked
    // node — cleared on click (see `pickSkill`) so the two inputs never
    // fight over which one is "current" for longer than a render.
    const typedMatch = matchSkill(this.state.terminalQuery, lang);
    const sel = typedMatch ?? SKILLS.find((s) => s.id === this.state.skill) ?? SKILLS[1] ?? SKILLS[0];
    const terminalNotFound = normalizeQuery(this.state.terminalQuery).length >= 2 && !typedMatch;

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
      terminalCommands: this.terminalCommandGroups(lang, sel.id),
      langCode: lang,
      skillNonce: this.state.skillNonce,
      sel: {
        id: sel.id,
        label: sel.label[lang],
        branchLabel: BRANCH[sel.b].label[lang],
        branchColor: BRANCH[sel.b].color,
        branchRgb: BRANCH[sel.b].rgb,
        desc: sel.desc[lang],
        levelPct: sel.lvl + '%',
        levelBar: asciiLevelBar(sel.lvl),
        levelLabel: sel.lvl >= 85
          ? (lang === 'pt' ? 'avançado' : 'advanced')
          : sel.lvl >= 74
            ? (lang === 'pt' ? 'sólido' : 'solid')
            : (lang === 'pt' ? 'em evolução' : 'evolving'),
      },
      terminalNotFound,
      handleTerminalInput: this.handleTerminalInput,
      handleTerminalKeyDown: this.handleTerminalKeyDown,
      terminalQuery: this.state.terminalQuery,
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
      heroChar: this.heroChar,
      avatar: this.avatar,
      chip1: this.chip1,
      chip2: this.chip2,
      chip3: this.chip3,
      railFill: this.railFill,
      railPct: this.railPct,
      headerName: this.headerName,
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
