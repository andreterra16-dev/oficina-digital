import type { I18nString, NonEmptyArray } from '../types/domain';
import type { OcticonName } from './github-icons';

/**
 * The six steps of GitHub flow as this portfolio's `<git-flow>` animation
 * walks through them — the same six GitHub's own docs name (branch, commit,
 * pull request, review, merge, delete the branch). `cmds` are real commands
 * (git / gh CLI / this repo's own `npm run verify`), not pseudo-code; `why`
 * is the one-line reason the step exists, which is the part that shows how
 * the pieces connect rather than just listing them.
 */
export interface FlowStep {
  id: 'branch' | 'commit' | 'pr' | 'review' | 'merge' | 'clean';
  icon: OcticonName;
  /** Short name — fits the step rail's button. */
  short: I18nString;
  title: I18nString;
  text: I18nString;
  why: I18nString;
  /** Terminal lines typed out when the step is active (without the `$ `). */
  cmds: readonly string[];
  /** Pull-request status line while this step is current. */
  pr: I18nString;
}

export const FLOW_STEPS: NonEmptyArray<FlowStep> = [
  {
    id: 'branch',
    icon: 'gitBranch',
    short: { pt: 'Branch', en: 'Branch' },
    title: { pt: 'Abro uma branch', en: 'Branch off' },
    text: {
      pt: 'Toda mudança nasce numa branch curta, com um nome que diz o que ela faz. A main fica intocada enquanto eu trabalho.',
      en: 'Every change starts on a short branch named for what it does. main stays untouched while I work.',
    },
    why: { pt: 'A main nunca fica quebrada.', en: 'main never breaks.' },
    cmds: ['git switch main && git pull', 'git switch -c feat/github-flow'],
    pr: { pt: 'ainda sem pull request', en: 'no pull request yet' },
  },
  {
    id: 'commit',
    icon: 'gitCommit',
    short: { pt: 'Commits', en: 'Commits' },
    title: { pt: 'Commito em passos pequenos', en: 'Commit in small steps' },
    text: {
      pt: 'Um motivo por commit, no padrão feat / fix / docs / chore. Lido em sequência, o histórico explica o porquê de cada decisão.',
      en: 'One reason per commit, in the feat / fix / docs / chore convention. Read in order, the history explains every decision.',
    },
    why: { pt: 'O histórico vira documentação.', en: 'The history becomes documentation.' },
    cmds: ['git add -p', 'git commit -m "feat: github flow"', 'git commit -m "fix: mobile layout"'],
    pr: { pt: 'ainda sem pull request', en: 'no pull request yet' },
  },
  {
    id: 'pr',
    icon: 'gitPullRequest',
    short: { pt: 'Pull request', en: 'Pull request' },
    title: { pt: 'Abro o pull request', en: 'Open the pull request' },
    text: {
      pt: 'O PR é onde a mudança vira conversa: explica o porquê, mostra o diff e dispara a verificação antes de qualquer um tocar na main.',
      en: 'The PR is where a change becomes a conversation: it explains why, shows the diff and triggers the checks before anyone touches main.',
    },
    why: { pt: 'Decisão registrada, não só código.', en: 'The decision is recorded, not just the code.' },
    cmds: ['git push -u origin feat/github-flow', 'gh pr create --fill'],
    pr: { pt: 'aberto · aguardando revisão', en: 'open · awaiting review' },
  },
  {
    id: 'review',
    icon: 'comment',
    short: { pt: 'Revisão', en: 'Review' },
    title: { pt: 'Reviso e ajusto', en: 'Review and adjust' },
    text: {
      pt: 'Typecheck estrito e build precisam passar. Cada comentário de revisão vira um commit novo na mesma branch — nada é reescrito às escondidas.',
      en: 'Strict typecheck and build have to pass. Every review comment becomes a new commit on the same branch — nothing is rewritten behind anyone’s back.',
    },
    why: { pt: 'Só entra o que foi verificado.', en: 'Only verified work gets in.' },
    cmds: ['npm run verify', 'git commit -m "fix: review feedback"'],
    pr: { pt: 'aberto · verificação ok', en: 'open · checks passing' },
  },
  {
    id: 'merge',
    icon: 'gitMerge',
    short: { pt: 'Merge', en: 'Merge' },
    title: { pt: 'Faço o merge na main', en: 'Merge into main' },
    text: {
      pt: 'Com revisão feita e verificação verde, o PR entra na main. É o único caminho para ela — por isso a main segue sempre publicável.',
      en: 'With review done and checks green, the PR lands on main. It is the only way in — which is why main stays publishable at all times.',
    },
    why: { pt: 'Um único caminho até a main.', en: 'One single path into main.' },
    cmds: ['gh pr merge --merge'],
    pr: { pt: 'merged na main', en: 'merged into main' },
  },
  {
    id: 'clean',
    icon: 'tag',
    short: { pt: 'Limpeza', en: 'Cleanup' },
    title: { pt: 'Apago a branch e publico', en: 'Delete the branch, ship it' },
    text: {
      pt: 'A branch cumpriu o papel e sai de cena; o repositório não acumula lixo. A main alimenta o deploy no Netlify, e o commit que publicou continua rastreável.',
      en: 'The branch has done its job and goes away; the repo doesn’t pile up leftovers. main feeds the Netlify deploy, and the commit that shipped stays traceable.',
    },
    why: { pt: 'Repositório limpo, entrega rastreável.', en: 'A clean repo, a traceable release.' },
    cmds: ['git switch main && git pull', 'git branch -d feat/github-flow'],
    pr: { pt: 'merged · branch apagada', en: 'merged · branch deleted' },
  },
];

/** Static chrome strings the `<git-flow>` element renders itself. */
export const FLOW_UI = {
  repo: 'andreterra16-dev/oficina-digital',
  visibility: { pt: 'público', en: 'public' } satisfies I18nString,
  prTitle: 'feat: github flow',
  prNumber: '#12',
  stepOf: { pt: 'passo', en: 'step' } satisfies I18nString,
  why: { pt: 'por quê', en: 'why' } satisfies I18nString,
  play: { pt: 'Reproduzir', en: 'Play' } satisfies I18nString,
  pause: { pt: 'Pausar', en: 'Pause' } satisfies I18nString,
  prev: { pt: 'Passo anterior', en: 'Previous step' } satisfies I18nString,
  next: { pt: 'Próximo passo', en: 'Next step' } satisfies I18nString,
  steps: { pt: 'Passos do GitHub flow', en: 'GitHub flow steps' } satisfies I18nString,
  graphLabel: {
    pt: 'Grafo de commits mostrando uma branch saindo da main, recebendo commits, passando por pull request e voltando por merge.',
    en: 'Commit graph showing a branch leaving main, collecting commits, going through a pull request and coming back by merge.',
  } satisfies I18nString,
  deleted: { pt: 'branch apagada', en: 'branch deleted' } satisfies I18nString,
  published: { pt: 'publicado', en: 'published' } satisfies I18nString,
} as const;
