import type { Branch, BranchId } from '../types/domain';

/** Color + label per skill-tree branch, keyed by `BranchId`. */
export const BRANCH: Record<BranchId, Branch> = {
  ia: { color: 'var(--color-branch-ia)', rgb: 'var(--rgb-branch-ia)', label: { pt: 'Ramo de IA', en: 'AI Branch' } },
  web: { color: 'var(--color-branch-web)', rgb: 'var(--rgb-branch-web)', label: { pt: 'Ramo web', en: 'Web Branch' } },
  dados: { color: 'var(--color-branch-dados)', rgb: 'var(--rgb-branch-dados)', label: { pt: 'Dados & infra', en: 'Data & Infra' } },
  core: { color: 'var(--color-branch-core)', rgb: 'var(--rgb-branch-core)', label: { pt: 'Núcleo', en: 'Core' } },
};
