import type { I18nString } from '../types/domain';

/**
 * The two flagship projects (Salomão Select and the Salomão Santos portal) get
 * a full-width feature panel on the page instead of a card: what each one
 * delivers, and *how much engineering* sits behind it. The panel's job is to
 * show level, so every figure below is something that can be counted in the
 * project's own repository — nothing is estimated or rounded up. They were
 * counted on 2026-11-03 (the page says so); re-run the counts before changing
 * a number.
 *
 *   Select  (BANCO-DE-TALENTOS):  `model`/`enum` blocks in prisma/schema.prisma,
 *           prisma/migrations/*, src/app/api/**\/route.ts, docs/adr/NNNN-*, test
 *           files (*.test.ts(x) + e2e *.spec.ts), `git rev-list --count HEAD`.
 *   Portal  (LP-SALOM-O-SANTOS):  git tags `vAAAA.MM.N`, folders under src/pages,
 *           *.test.* / *.spec.* files, `git rev-list --count HEAD`.
 */
export interface FeaturedStat {
  value: number;
  label: I18nString;
}

export interface Featured {
  /** `Project.id` this panel belongs to. */
  id: string;
  /** Real screenshot of the live site (assets/). */
  screenshot: string;
  tagline: I18nString;
  /** What it delivers — the advantages, in the project's own terms. */
  advantages: readonly [I18nString, ...I18nString[]];
  /** Engineering level, as counted figures. */
  stats: readonly [FeaturedStat, ...FeaturedStat[]];
}

export const FEATURED: Record<string, Featured> = {
  select: {
    id: 'select',
    screenshot: './assets/screenshot-select.webp',
    tagline: {
      pt: 'Recrutamento internacional com curadoria: qualidade extrema, atrito zero no cadastro e a IA sempre a serviço de quem decide.',
      en: 'Curated international recruitment: extreme quality, zero friction at sign-up, and AI always serving the person who decides.',
    },
    advantages: [
      {
        pt: 'Duas portas de entrada, um funil só: autocadastro público e cadastro pelo recrutador passam pelos mesmos portões humanos.',
        en: 'Two doors, one funnel: public self-signup and recruiter-entered candidates go through the same human gates.',
      },
      {
        pt: 'A IA acelera, nunca decide: extrai currículo e pitch e redige a Carta de Indicação bilíngue, mas quem avança é sempre uma pessoa.',
        en: 'AI accelerates, never decides: it extracts résumé and pitch and drafts the bilingual referral letter, but a person always moves candidates forward.',
      },
      {
        pt: 'Matching por Smart Tags ponderadas, do banco de talentos à vaga, até o dossiê final.',
        en: 'Matching by weighted Smart Tags, from the talent pool to the job, all the way to the final dossier.',
      },
      {
        pt: 'LGPD e segurança como parte do produto: trilha de auditoria e Row-Level Security no Postgres.',
        en: 'Privacy (LGPD) and security built into the product: an audit trail and Postgres Row-Level Security.',
      },
    ],
    stats: [
      { value: 34, label: { pt: 'modelos de dados', en: 'data models' } },
      { value: 66, label: { pt: 'migrações', en: 'migrations' } },
      { value: 71, label: { pt: 'rotas de API', en: 'API routes' } },
      { value: 18, label: { pt: 'decisões de arquitetura (ADRs)', en: 'architecture decisions (ADRs)' } },
      { value: 129, label: { pt: 'arquivos de teste, com e2e', en: 'test files, incl. e2e' } },
      { value: 502, label: { pt: 'commits', en: 'commits' } },
    ],
  },
  lp: {
    id: 'lp',
    screenshot: './assets/screenshot-lp.webp',
    tagline: {
      pt: 'O portal da consultoria: autoridade para quem decide e um caminho curto até a conversa no WhatsApp.',
      en: 'The consultancy’s portal: authority for decision-makers and a short path to a WhatsApp conversation.',
    },
    advantages: [
      {
        pt: 'Feito para converter: cada página tem um papel (autoridade ou conversão) e o sucesso é o visitante chamar no WhatsApp já convencido.',
        en: 'Built to convert: every page has a role (authority or conversion), and success is a visitor reaching out on WhatsApp already convinced.',
      },
      {
        pt: 'Uma página HTML pré-renderizada por rota: carrega rápido e é lida por buscadores sem depender de JavaScript.',
        en: 'One pre-rendered HTML page per route: it loads fast and search engines read it without relying on JavaScript.',
      },
      {
        pt: 'Acessibilidade e responsivo testados no navegador (axe, mobile, navegação por teclado), não só no olho.',
        en: 'Accessibility and responsiveness tested in the browser (axe, mobile, keyboard navigation), not just by eye.',
      },
      {
        pt: 'Documentado como produto: PRODUCT.md, DESIGN.md, arquitetura, deploy e changelog gerado das tags.',
        en: 'Documented like a product: PRODUCT.md, DESIGN.md, architecture, deploy and a changelog generated from the tags.',
      },
    ],
    stats: [
      { value: 11, label: { pt: 'releases versionadas', en: 'tagged releases' } },
      { value: 9, label: { pt: 'áreas de página', en: 'page areas' } },
      { value: 29, label: { pt: 'arquivos de teste, com e2e', en: 'test files, incl. e2e' } },
      { value: 193, label: { pt: 'commits', en: 'commits' } },
    ],
  },
};
