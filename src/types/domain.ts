// Domain types for the portfolio's data — the shapes behind SKILLS, LEVELS,
// PROJECTS and the Component's own state. Kept separate from the data
// modules so `src/logic/component.ts` can import just the types it needs.

/**
 * An array statically known to have at least one element — lets `arr[0]`
 * resolve to `T` instead of `T | undefined` even under
 * `noUncheckedIndexedAccess`, which arbitrary-index access into a plain
 * `readonly T[]` cannot. Used for `SKILLS` and `FLOW_STEPS`: both back a
 * "selected item" fallback chain (`… ?? LIST[0]`) that must always resolve
 * to a real item — content the site's own home page keeps non-empty by
 * construction, not something a reader-only visitor could ever make empty.
 */
export type NonEmptyArray<T> = readonly [T, ...T[]];

/** A string translated in both PT and EN. */
export interface I18nString {
  pt: string;
  en: string;
}

/**
 * Resolves every `I18nString`-typed property of `T` to a plain `string` —
 * the shape of a render-time projection once a language has been picked
 * (`Skill`'s `label`/`kind`/`desc`, `FlowStep`'s `title`/`text`/…,
 * `ProjectBase`'s `badge`/`subtitle`/…). The distributive form (`T extends
 * unknown ? … : never`, keyed off the naked `T`) matters for `Project`:
 * without it, mapping over the `ProjectWithLogo | ProjectWithIllustration`
 * union would collapse to the *intersection* of their keys' value types
 * instead of preserving each branch, losing the `logo`/`illustration`
 * discriminant `EnrichedProject` depends on.
 */
export type Localized<T> = T extends unknown
  ? { [K in keyof T]: T[K] extends I18nString ? string : T[K] }
  : never;

/** The three skill branches plus the root node ("André" himself). */
export type BranchId = 'ia' | 'web' | 'dados' | 'core';

export interface Branch {
  color: string;
  /** Same color as `color`, pre-split as an `"r,g,b"` string for `rgba(...)` template strings. */
  rgb: string;
  label: I18nString;
}

/** One entry ("command") in the Bancada de IA terminal's skill set. */
export interface Skill {
  id: string;
  label: I18nString;
  kind: I18nString;
  /** Which branch this command belongs to — drives its color via `BRANCH[b]`. */
  b: BranchId;
  /** Skill level, 0–100. */
  lvl: number;
  desc: I18nString;
}

/**
 * One `Skill` as listed in the terminal's `$ help` output — a plain,
 * clickable command-list row (see `<button data-skill>` in the `.dc.html`),
 * not a canvas node.
 */
export interface TerminalCommand {
  id: string;
  label: string;
  /** This command's branch color — carries the IA/Web/Dados legend color
   *  all the way into the command-id text, instead of flattening every
   *  row to the same accent color regardless of branch. */
  color: string;
  /** Highlighted when this is the currently-displayed skill (`sel.id`) —
   *  true whether it got there by a click or by a matching typed query. */
  active: boolean;
  /** Computed inline style for the row — branch-colored highlight when `active`. */
  style: string;
}

/**
 * One branch's worth of `TerminalCommand`s, grouped under a `# ramo …`
 * heading in the terminal's command list.
 */
export interface TerminalCommandGroup {
  id: BranchId;
  label: string;
  color: string;
  commands: readonly TerminalCommand[];
}

/** The currently-selected skill, flattened for the detail panel. */
export interface SelectionView {
  /** `Skill.id` — shown as the terminal's command echo (`$ skill <id>`). */
  id: string;
  label: string;
  branchLabel: string;
  /** This skill's branch color — same value driving its row in the command
   *  list, so the doc readout's branch line and level bar stay visually
   *  tied to the branch that's active, instead of every skill's output
   *  looking identical regardless of which branch it belongs to. */
  branchColor: string;
  /** Same color as `branchColor`, pre-split as an `"r,g,b"` string for `rgba(...)`. */
  branchRgb: string;
  desc: string;
  levelPct: string;
  /** The level, as a 10-block ASCII bar (`'████████░░'`) — terminal output
   *  doesn't render a CSS gradient div, it prints characters. */
  levelBar: string;
  /** Localized display label — no downstream logic branches on its literal
   *  value, so a plain `string` (rather than a closed PT/EN union) is the
   *  right type once it's resolved to the active language. */
  levelLabel: string;
}

/** One of the three hand-drawn SVG illustrations used when a project has no official logo. */
export type IllustrationKey = 'onboarding' | 'valuation' | 'pricing';

/** Fields shared by every delivered project card, regardless of how its thumbnail is rendered. */
interface ProjectBase {
  id: string;
  /** Display order, "01".."05" — matches the badge text, not necessarily the array index. */
  order: string;
  /** `<image-slot>` id — shared between the card thumbnail and the modal header. */
  slot: string;
  badge: I18nString;
  /** Whether this card gets the "principal" highlighted border treatment. */
  accent: boolean;
  /** Accent color (hex) — badge, stack pills, section headers, like button. */
  color: string;
  /** Same color as `color`, pre-split as an `"r,g,b"` string for `rgba(...)` template strings. */
  colorRgb: string;
  /** Starting like count shown before the viewer has liked it themselves. */
  baseLikes: number;
  title: string;
  subtitle: I18nString;
  /** Alt text shown in the `<image-slot>` before an image is present. */
  placeholder: I18nString;
  stack: readonly string[];
  problem: I18nString;
  result: I18nString;
  challenges: I18nString;
  /** How this project changed the way André works — the "how it helped me evolve" field. */
  evolution: I18nString;
  /** How the project's requirements/features were mapped/planned before building. */
  mapping: I18nString;
  /** Omitted for client work whose code is private — the modal's "Ver
   *  repositório" CTA is guarded on this being present, same pattern as
   *  `liveUrl` below. */
  repoUrl?: string;
  liveUrl?: string;
}

/** A project that ships with an official brand logo (transparent PNG). */
interface ProjectWithLogo extends ProjectBase {
  logo: string;
  illustration: null;
  /** `true` when `logo` is actually a real product screenshot, not a
   *  transparent-background brand mark — the card/modal cover then fills
   *  edge-to-edge (`fit="cover"`, no plaque) instead of the light plaque
   *  background + `fit="contain"` a transparent logo needs. Omitted (falsy)
   *  for an actual partner logo. */
  logoIsScreenshot?: boolean;
}

/** A project with no official logo — falls back to a hand-drawn illustration instead. */
interface ProjectWithIllustration extends ProjectBase {
  logo: null;
  illustration: IllustrationKey;
}

/**
 * A delivered project card / case study, as authored in `src/data/projects.ts`.
 * Discriminated on `logo`: exactly one of `logo` / `illustration` is set, never both,
 * never neither — so `p.logo ? renderLogo(p) : renderIllustration(p)` narrows without a cast.
 */
export type Project = ProjectWithLogo | ProjectWithIllustration;

/**
 * Narrows to the illustration variant. A user-defined type guard rather than
 * a bare `p.logo === null` check at the call site: `logo`'s two branches
 * (`string` vs `null`) aren't singleton-literal enough for TypeScript to
 * always narrow the union on a plain truthiness check alone, so callers
 * that need the narrowing (`enrichProject`) should go through this guard
 * instead of re-deriving it inline.
 */
export function projectHasIllustration(p: Project): p is ProjectWithIllustration {
  return p.logo === null;
}

/**
 * A `Project`, localized to the active language, with its per-render computed
 * fields (like state, styles, illustration element). A type alias (not
 * `interface … extends`) because `Project` is a union — `Localized<Project>`
 * (itself distributive) keeps `EnrichedProject` a `{ logo: string;
 * illustration: null } | …` union too, so the `logo` discriminant still
 * narrows after enrichment.
 */
export type EnrichedProject = Localized<Project> & {
  /** Which cover treatment the card/modal should render — computed once
   *  here instead of as a compound `{{ p.logo && !p.logoIsScreenshot }}`
   *  in the template, since the `.dc.html` template compiler's `{{ }}`
   *  expressions support equality/negation but not `&&`/`||` (see
   *  `resolve()` in support.js) — a single discriminant `sc-if value="{{
   *  p.coverKind === 'screenshot' }}"` sidesteps that entirely. */
  coverKind: 'logo' | 'screenshot' | 'illustration';
  liked: boolean;
  likeIcon: '♥' | '♡';
  likeCount: number;
  illustrationEl: import('react').ReactElement | null;
  cardStyle: string;
  likeBtnStyle: string;
};

/** One engineering figure in a featured panel, localized. */
export interface FeaturedStatView {
  value: number;
  label: string;
}

/** A flagship project as the feature panel renders it: the enriched project
 *  plus its `Featured` copy/figures in the active language and the panel's
 *  computed inline styles (so the template needs no `&&`/ternaries). */
export type FeaturedView = EnrichedProject & {
  tagline: string;
  advantages: string[];
  stats: FeaturedStatView[];
  /** Hostname of the live site, shown in the browser-chrome bar. */
  host: string;
  panelStyle: string;
  /** The stats grid's column template: 3 across for six figures, one row for four. */
  statsStyle: string;
  /** Flex/grid `order` values: even panels put the media left, odd panels right. */
  mediaOrder: string;
  copyOrder: string;
  mediaStyle: string;
};

/** `Component`'s local state. */
export interface ComponentState {
  /** Selected skill node id in the "Bancada de IA" tree. */
  skill: string;
  /** Live text typed into the Bancada de IA terminal input — takes priority
   *  over `skill` for the detail panel while it matches a skill (see
   *  `matchSkill` in component.ts), so a visitor can either click a node or
   *  type its name/id. */
  terminalQuery: string;
  /** Bumped on every skill click, even a repeat of the current one, so the
   *  pixel illustration (`<pixel-sprite nonce>`) replays its assembly instead
   *  of staying put when the same word is clicked twice. */
  skillNonce: number;
  /** Currently open project modal, or `null` when closed. */
  project: string | null;
  /** Per-project like toggle, keyed by `Project.id`, persisted to `localStorage`. */
  likes: Record<string, boolean>;
  /** Selected language. */
  lang: 'pt' | 'en';
  /** Selected theme. */
  theme: 'default' | 'alternate';
}

/** `Component`'s props — the DC editor schema declared in the `.dc.html`'s `data-props` attribute. */
export interface ComponentProps {
  cursorEnabled?: boolean;
  cursorDensity?: number;
  revealPixelSize?: number;
}
