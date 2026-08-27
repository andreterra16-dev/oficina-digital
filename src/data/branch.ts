import type { Branch, BranchId } from '../types/domain';

/** Color + label per skill-tree branch, keyed by `BranchId`. */
export const BRANCH: Record<BranchId, Branch> = {
  ia: { color: '#E4622E', rgb: '228,98,46', label: 'Ramo de IA' },
  web: { color: '#E0A544', rgb: '224,165,68', label: 'Ramo web' },
  dados: { color: '#7E8C91', rgb: '126,140,145', label: 'Dados & infra' },
  core: { color: '#F1EADD', rgb: '241,234,221', label: 'Núcleo' },
};
