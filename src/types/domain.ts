// Domain types for the portfolio's data — the shapes behind SKILLS, LEVELS,
// PROJECTS and the Component's own state. Kept separate from the data
// modules so `src/logic/component.ts` can import just the types it needs.

/** The three skill branches plus the root node ("André" himself). */
export type BranchId = 'ia' | 'web' | 'dados' | 'core';

export interface Branch {
  color: string;
  /** Same color as `color`, pre-split as an `"r,g,b"` string for `rgba(...)` template strings. */
  rgb: string;
  label: string;
}

/** One node in the "Bancada de IA" skill tree. */
export interface Skill {
  id: string;
  label: string;
  kind: string;
  /** Which branch this node belongs to — drives its color via `BRANCH[b]`. */
  b: BranchId;
  /** Position as a percentage of the tree's bounding box (0–100). */
  x: number;
  y: number;
  /** Tier — 0 is the root, higher tiers sit further from center; also staggers the pop-in animation delay. */
  t: number;
  /** Skill level, 0–100. */
  lvl: number;
  desc: string;
}

/** A directed edge between two `Skill.id`s, drawn as a connecting line. */
export type Edge = readonly [from: string, to: string];

/** A `Skill` node with its computed inline `style` string for the current selection state. */
export interface SkillWithStyle extends Skill {
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
  short: string;
  /** Position as a percentage along the esteira path (0–100). */
  x: number;
  y: number;
  title: string;
  /** What it is, in plain language — no jargon, written for someone who
   *  isn't technical and is seeing this term for the first time. */
  explainer: string;
  /** What it looks like in practice — concrete, recognizable examples. */
  examples: string;
  /** Who this is actually for — the situation that makes someone need it. */
  idealFor: string;
  /** Rough delivery window, or "sob consulta" for the open-ended catalog-all entry. */
  timeframe: string;
}

/** A `ProductType` with its computed inline `style` string and esteira index. */
export interface ProductTypeWithStyle extends ProductType {
  i: number;
  style: string;
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
  levelLabel: 'avançado' | 'sólido' | 'em evolução';
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
  badge: string;
  /** Whether this card gets the "principal" highlighted border treatment. */
  accent: boolean;
  /** Accent color (hex) — badge, stack pills, section headers, like button. */
  color: string;
  /** Same color as `color`, pre-split as an `"r,g,b"` string for `rgba(...)` template strings. */
  colorRgb: string;
  /** Starting like count shown before the viewer has liked it themselves. */
  baseLikes: number;
  title: string;
  subtitle: string;
  /** Alt text shown in the `<image-slot>` before an image is present. */
  placeholder: string;
  stack: readonly string[];
  problem: string;
  result: string;
  challenges: string;
  /** How this project changed the way André works — the "how it helped me evolve" field. */
  evolution: string;
  /** How the project's requirements/features were mapped/planned before building. */
  mapping: string;
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
 * A `Project` with its per-render computed fields (like state, styles, illustration element).
 * A type alias (not `interface … extends`) because `Project` is a union — the intersection
 * distributes over it, so `EnrichedProject` stays a `{ logo: string; illustration: null } | …`
 * union too, and the `logo` discriminant keeps narrowing after enrichment.
 */
export type EnrichedProject = Project & {
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
}

/** `Component`'s props — the DC editor schema declared in the `.dc.html`'s `data-props` attribute. */
export interface ComponentProps {
  cursorEnabled?: boolean;
  cursorDensity?: number;
  revealPixelSize?: number;
}
