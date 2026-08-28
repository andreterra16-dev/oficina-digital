// Domain types for the portfolio's data — the shapes behind SKILLS, LEVELS,
// PROJECTS and the Component's own state. Kept separate from the data
// modules so `src/logic/component.ts` can import just the types it needs.

/**
 * An array statically known to have at least one element — lets `arr[0]`
 * resolve to `T` instead of `T | undefined` even under
 * `noUncheckedIndexedAccess`, which arbitrary-index access into a plain
 * `readonly T[]` cannot. Used for `SKILLS`/`PRODUCT_TYPES`: both back a
 * "selected node" fallback chain (`… ?? LIST[0]`) that must always resolve
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
 * (`Skill`'s `label`/`kind`/`desc`, `ProductType`'s `short`/`title`/…,
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

/** One node in the "Bancada de IA" skill tree. */
export interface Skill {
  id: string;
  label: I18nString;
  kind: I18nString;
  /** Which branch this node belongs to — drives its color via `BRANCH[b]`. */
  b: BranchId;
  /** Position as a percentage of the tree's bounding box (0–100). */
  x: number;
  y: number;
  /** Tier — 0 is the root, higher tiers sit further from center; also staggers the pop-in animation delay. */
  t: number;
  /** Skill level, 0–100. */
  lvl: number;
  desc: I18nString;
}

/** A directed edge between two `Skill.id`s, drawn as a connecting line. */
export type Edge = readonly [from: string, to: string];

/** A `Skill` node, localized to the active language, with its computed inline `style` string for the current selection state. */
export interface SkillWithStyle extends Localized<Skill> {
  style: string;
}

/** A rendered connector line between two skill nodes. */
export interface RenderedLink {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

/**
 * One kind of product on the "jogo do seu projeto" esteira (etapa 03) — what
 * a visitor can actually hire André to build, not a step of his process.
 * Positions are picked from the same 6 (x,y) coordinates the track's SVG
 * curve was originally authored around (see the track `<path>` in the
 * `.dc.html`), so any subset of them still lands exactly on the curve
 * without redrawing it.
 */
export interface ProductType {
  tag: string;
  short: I18nString;
  /** Position as a percentage along the esteira path (0–100). */
  x: number;
  y: number;
  title: I18nString;
  /** What it is, in plain language — no jargon, written for someone who
   *  isn't technical and is seeing this term for the first time. */
  explainer: I18nString;
  /** What it looks like in practice — concrete, recognizable examples. */
  examples: I18nString;
  /** Who this is actually for — the situation that makes someone need it. */
  idealFor: I18nString;
  /** Rough delivery window, or "sob consulta" for the open-ended catalog-all entry. */
  timeframe: I18nString;
}

/** A `ProductType`, localized to the active language, with its computed inline `style` string(s) and esteira index. */
export interface ProductTypeWithStyle extends Localized<ProductType> {
  i: number;
  style: string;
  /** Chip look for the mobile prev/next navigator — see `productChipStyle`. */
  mobileStyle: string;
}

/** The currently-selected product type, flattened for the detail panel. */
export interface ProductTypeView {
  tag: string;
  title: string;
  explainer: string;
  examples: string;
  idealFor: string;
  timeframe: string;
  counter: string;
  /** WhatsApp deep link pre-filled with a message naming this specific product type. */
  waLink: string;
}

/** The currently-selected skill, flattened for the detail panel. */
export interface SelectionView {
  label: string;
  branchLabel: string;
  desc: string;
  levelPct: string;
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
  repoUrl: string;
  liveUrl?: string;
}

/** A project that ships with an official brand logo (transparent PNG). */
interface ProjectWithLogo extends ProjectBase {
  logo: string;
  illustration: null;
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
  liked: boolean;
  likeIcon: '♥' | '♡';
  likeCount: number;
  illustrationEl: import('react').ReactElement | null;
  cardStyle: string;
  likeBtnStyle: string;
};

/** `Component`'s local state. */
export interface ComponentState {
  /** Selected skill node id in the "Bancada de IA" tree. */
  skill: string;
  /** Selected product type index in the "jogo do seu projeto" esteira. */
  productIndex: number;
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
