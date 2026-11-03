import type { I18nString, NonEmptyArray } from '../types/domain';
import type { OcticonName } from './github-icons';

/**
 * The six steps of GitHub flow as this portfolio's `<git-flow>` animation
 * walks through them — still GitHub flow's own skeleton (branch, commits, pull
 * request, checks, merge, cleanup), but written for readers who already know
 * it: each step carries the practice that matters when agents write much of
 * the code — worktrees for parallel agents, checkpoint commits rewritten into
 * history, review by risk, machine-first gates, squash, and a recovery path.
 * `cmds` are real commands (git / gh CLI / this repo's `npm run verify`), kept
 * under ~38 characters so they fit a phone's terminal line; `why` is the
 * one-line reason the step exists.
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
    short: { pt: 'Isolar', en: 'Isolate' },
    title: { pt: 'Uma tarefa, um worktree', en: 'One task, one worktree' },
    text: {
      pt: 'Cada tarefa, minha ou de um agente, ganha branch e worktree próprios. Vários agentes rodam em paralelo sem sobrescrever um ao outro, e nenhum tem caminho até a main.',
      en: 'Every task, mine or an agent’s, gets its own branch and worktree. Several agents run in parallel without overwriting each other, and none of them has a path to main.',
    },
    why: { pt: 'Paralelismo sem colisão.', en: 'Parallelism without collisions.' },
    cmds: ['git worktree add ../flow -b feat/flow', 'cd ../flow'],
    pr: { pt: 'ainda sem pull request', en: 'no pull request yet' },
  },
  {
    id: 'commit',
    icon: 'gitCommit',
    short: { pt: 'Commits', en: 'Commits' },
    title: { pt: 'Checkpoints viram história', en: 'Checkpoints become history' },
    text: {
      pt: 'O agente comita à vontade, em checkpoints. Antes do PR eu leio cada hunk com <code>git add -p</code> e reescrevo em commits de uma ideia só, com o trailer <code>Co-Authored-By</code> marcando o que foi IA.',
      en: 'The agent commits freely, as checkpoints. Before the PR I read every hunk with <code>git add -p</code> and rewrite them into one-idea commits, with a <code>Co-Authored-By</code> trailer marking what was AI.',
    },
    why: { pt: 'Auditável: IA e humano continuam distinguíveis.', en: 'Auditable: AI and human changes stay distinguishable.' },
    cmds: ['git add -p', 'git commit -m "feat: flow"', 'git rebase -i origin/main'],
    pr: { pt: 'ainda sem pull request', en: 'no pull request yet' },
  },
  {
    id: 'pr',
    icon: 'gitPullRequest',
    short: { pt: 'Pull request', en: 'Pull request' },
    title: { pt: 'Reviso por risco, não por tamanho', en: 'Review by risk, not by size' },
    text: {
      pt: 'Diff de IA é grande, e o risco costuma morar em poucas linhas. Olho primeiro o formato (<code>--stat</code>, arquivos tocados, lockfile). Auth, migração, config e pacote novo levam leitura completa; o resto, testes e uma passada de olho.',
      en: 'AI diffs are big and the risk usually sits in a few lines. I look at the shape first (<code>--stat</code>, files touched, lockfile). Auth, migrations, config and new packages get a full read; the rest gets tests and a skim.',
    },
    why: { pt: 'Atenção humana gasta onde dói.', en: 'Human attention spent where it hurts.' },
    cmds: ['git diff origin/main... --stat', 'gh pr create --fill'],
    pr: { pt: 'aberto · aguardando revisão', en: 'open · awaiting review' },
  },
  {
    id: 'review',
    icon: 'comment',
    short: { pt: 'Verificar', en: 'Verify' },
    title: { pt: 'Máquina primeiro, olho depois', en: 'Machine first, eyes second' },
    text: {
      pt: 'Typecheck estrito, testes e build rodam no hook de pre-push e no CI, com varredura de segredos. Se falha, o erro volta para o agente e eu só discuto código que passa. Cada ajuste é commit novo, sem force push.',
      en: 'Strict typecheck, tests and build run in the pre-push hook and in CI, with secret scanning. If it fails, the error goes back to the agent and I only discuss code that passes. Every fix is a new commit, no force push.',
    },
    why: { pt: 'Código de IA e o meu passam pelo mesmo portão.', en: 'AI code and mine go through the same gate.' },
    cmds: ['npm run verify', 'gh pr checks --watch'],
    pr: { pt: 'aberto · verificação ok', en: 'open · checks passing' },
  },
  {
    id: 'merge',
    icon: 'gitMerge',
    short: { pt: 'Merge', en: 'Merge' },
    title: { pt: 'Squash na main', en: 'Squash into main' },
    text: {
      pt: 'Squash merge: a main ganha um commit por ideia, com o título do PR, e fica linear. Branch e worktree somem junto, e o histórico continua fácil de bisseccionar.',
      en: 'Squash merge: main gains one commit per idea, titled like the PR, and stays linear. The branch and worktree go away with it, and the history stays easy to bisect.',
    },
    why: { pt: 'Main linear, uma ideia por commit.', en: 'A linear main, one idea per commit.' },
    cmds: ['gh pr merge --squash --delete-branch', 'git worktree remove ../flow'],
    pr: { pt: 'merged na main', en: 'merged into main' },
  },
  {
    id: 'clean',
    icon: 'tag',
    short: { pt: 'Rede', en: 'Safety net' },
    title: { pt: 'Rede de segurança', en: 'Safety net' },
    text: {
      pt: 'Se algo escapar: <code>bisect run</code> acha o commit culpado em minutos, <code>revert</code> desfaz sem reescrever história e o <code>reflog</code> recupera o que um agente apagou. Force push só com <code>--force-with-lease</code>, em branch própria.',
      en: 'If something slips through: <code>bisect run</code> finds the guilty commit in minutes, <code>revert</code> undoes it without rewriting history, and the <code>reflog</code> recovers whatever an agent deleted. Force push only with <code>--force-with-lease</code>, on a branch of its own.',
    },
    why: { pt: 'Erro de agente é recuperável.', en: 'An agent’s mistake is recoverable.' },
    cmds: ['git bisect run npm test', 'git revert <sha>', 'git reflog -5'],
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
