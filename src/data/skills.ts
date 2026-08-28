import type { Edge, NonEmptyArray, Skill } from '../types/domain';

/**
 * Nodes of the "Bancada de IA" skill tree (etapa 02).
 *
 * `(x, y)` is a percentage of the canvas's bounding box (`IA_CANVAS_DESIGN`
 * in `component.ts`, 640×600). Columns (`x`) are one per tier (`t`) —
 * 7/24/44/64/80, evenly stepped — and stay shared across all three branches
 * so tiers line up in clean vertical columns.
 *
 * Rows (`y`): each branch gets its own vertical *band* that never overlaps
 * another branch's, full stop — not just anchor-to-anchor, but across every
 * node either branch owns. An earlier version spaced only the three anchors
 * evenly (ia/web/dados) and let each branch fan out from there by the same
 * offset, which reads as elegant on paper but ignores that adjacent-tier
 * nodes carry long labels ("Automação com IA", "Avaliação & Prompt", ~150–
 * 185px wide once padded) — wide enough that two nodes one column apart
 * (128px center-to-center) can still overlap horizontally. With no
 * guaranteed *vertical* gap between the bottom of one branch and the top of
 * the next, that horizontal overlap became a visible collision (screenshot:
 * "RAG & Embeddings" stacked on "Node.js", "React" cutting into "Automação
 * com IA"'s label). The fix that actually holds regardless of column is a
 * vertical-only guarantee: reserve ≥12% (72px) of clear space between any
 * two branches' full node ranges, wide enough that no pair of node boxes
 * (~50px tall) can touch no matter how their columns interleave.
 *
 * Per-branch layout: anchor ± 7 at tier 2, ± 10 at tier 3, anchor exactly at
 * the single tier-4 node. Anchors: ia = 18, web = 50 (both matching core's
 * vertical center), dados = 82 — bands end up ≈[8,28], [40,60], [75,89],
 * each comfortably inside the canvas with room to spare top and bottom.
 * Dados has no tier-3 *pair* (docker converges alone from sql+pg, one tier
 * earlier than ia/web's agent/auto and node/ts pairs) — its tier-3 node
 * sits exactly on the anchor, same as every branch's tier-4 node now does.
 *
 * The tier-4 node originally tapered *in* toward the anchor (offset −5
 * instead of 0) for a fan-out-then-converge look, which put it only 5%
 * from its tier-3 neighbor on the same side — not enough clearance for the
 * two longest labels in the whole tree, "Agentes & Tools" and "Avaliação &
 * Prompt" (ia's own agent/eval pair), which visibly overlapped even though
 * every *other* tier-3/tier-4 pair in the tree (shorter labels) had enough
 * slack to hide the same 5% gap. Landing tier-4 exactly on the anchor
 * doubles that clearance to 10% on both sides — the same margin already
 * proven safe elsewhere in this layout — for every branch, not just the
 * one that happened to expose it first.
 */
export const SKILLS: NonEmptyArray<Skill> = [
  { id: 'core', label: { pt: 'André', en: 'André' }, kind: { pt: 'núcleo', en: 'core' }, b: 'core', x: 7, y: 50, t: 0, lvl: 100, desc: { pt: 'Base de engenharia aplicada a software: modelar o problema, medir e comunicar o resultado.', en: 'Engineering base applied to software: modeling the problem, measuring and communicating the result.' } },

  { id: 'ia', label: { pt: 'Engenharia de IA', en: 'AI Engineering' }, kind: { pt: 'ramo', en: 'branch' }, b: 'ia', x: 24, y: 18, t: 1, lvl: 85, desc: { pt: 'Especialização principal. Construir sistemas em torno de modelos de linguagem: contexto, ferramentas, avaliação e custo.', en: 'Primary specialization. Building systems around language models: context, tools, evaluation, and cost.' } },
  { id: 'llm', label: { pt: 'LLM & APIs', en: 'LLMs & APIs' }, kind: { pt: 'peça', en: 'piece' }, b: 'ia', x: 44, y: 11, t: 2, lvl: 85, desc: { pt: 'Integração de modelos via API, streaming de respostas, function calling e controle de tokens e custo por requisição.', en: 'Model integration via API, streaming responses, function calling, and token/cost control per request.' } },
  { id: 'rag', label: { pt: 'RAG & Embeddings', en: 'RAG & Embeddings' }, kind: { pt: 'peça', en: 'piece' }, b: 'ia', x: 44, y: 25, t: 2, lvl: 78, desc: { pt: 'Indexação de documentos, chunking, busca vetorial e montagem de contexto para respostas fundamentadas em dados do cliente.', en: 'Document indexing, chunking, vector search, and context assembly for data-grounded responses.' } },
  { id: 'agent', label: { pt: 'Agentes & Tools', en: 'Agents & Tools' }, kind: { pt: 'peça', en: 'piece' }, b: 'ia', x: 64, y: 8, t: 3, lvl: 74, desc: { pt: 'Agentes que executam tarefas com ferramentas: leitura de arquivos, consultas a banco e chamadas a sistemas internos.', en: 'Agents executing tasks with tools: file reading, database queries, and internal system calls.' } },
  { id: 'auto', label: { pt: 'Automação com IA', en: 'AI Automation' }, kind: { pt: 'peça', en: 'piece' }, b: 'ia', x: 64, y: 28, t: 3, lvl: 80, desc: { pt: 'Fluxos que removem trabalho manual repetitivo: triagem, extração de dados de documentos e geração de relatórios.', en: 'Workflows removing repetitive manual tasks: screening, document data extraction, and report generation.' } },
  { id: 'eval', label: { pt: 'Avaliação & Prompt', en: 'Evaluation & Prompt' }, kind: { pt: 'peça', en: 'piece' }, b: 'ia', x: 80, y: 18, t: 4, lvl: 70, desc: { pt: 'Prompt como especificação: critérios de aceite, testes de regressão e comparação entre modelos antes de ir para produção.', en: 'Prompt as specification: acceptance criteria, regression testing, and model comparison before production.' } },

  { id: 'web', label: { pt: 'Desenvolvimento web', en: 'Web Development' }, kind: { pt: 'ramo', en: 'branch' }, b: 'web', x: 24, y: 50, t: 1, lvl: 90, desc: { pt: 'Interfaces de produto do zero ao deploy, com foco em performance e clareza de uso.', en: 'Product interfaces from scratch to deployment, focused on performance and clarity of use.' } },
  { id: 'react', label: { pt: 'React', en: 'React' }, kind: { pt: 'peça', en: 'piece' }, b: 'web', x: 44, y: 43, t: 2, lvl: 90, desc: { pt: 'Componentização, estado, hooks e padrões de UI reutilizáveis em produtos reais.', en: 'Componentization, state, hooks, and reusable UI patterns in real products.' } },
  { id: 'next', label: { pt: 'Next.js', en: 'Next.js' }, kind: { pt: 'peça', en: 'piece' }, b: 'web', x: 44, y: 57, t: 2, lvl: 88, desc: { pt: 'App Router, renderização no servidor, rotas de API e SEO para sites e aplicações.', en: 'App Router, server-side rendering, API routes, and SEO for websites and applications.' } },
  { id: 'node', label: { pt: 'Node.js', en: 'Node.js' }, kind: { pt: 'peça', en: 'piece' }, b: 'web', x: 64, y: 40, t: 3, lvl: 82, desc: { pt: 'APIs, integrações e serviços de backend: a camada que conecta interface, dados e modelos.', en: 'APIs, integrations, and backend services: the layer connecting interface, data, and models.' } },
  { id: 'ts', label: { pt: 'JavaScript & TS', en: 'JavaScript & TS' }, kind: { pt: 'peça', en: 'piece' }, b: 'web', x: 64, y: 60, t: 3, lvl: 88, desc: { pt: 'Linguagem base do dia a dia; tipagem para reduzir erro em times e em contratos de API.', en: 'Daily base language; static typing to reduce errors in teams and API contracts.' } },
  { id: 'ux', label: { pt: 'UI de produto', en: 'Product UI' }, kind: { pt: 'peça', en: 'piece' }, b: 'web', x: 80, y: 50, t: 4, lvl: 72, desc: { pt: 'Layout, hierarquia e microinterações: interface que explica sozinha o que o sistema faz.', en: 'Layout, hierarchy, and micro-interactions: an interface that explains by itself what the system does.' } },

  { id: 'dados', label: { pt: 'Dados & infra', en: 'Data & Infra' }, kind: { pt: 'ramo', en: 'branch' }, b: 'dados', x: 24, y: 82, t: 1, lvl: 76, desc: { pt: 'Da modelagem do banco à entrega em container: o caminho do dado até a decisão.', en: 'From database modeling to container delivery: the path of data to decision-making.' } },
  { id: 'sql', label: { pt: 'SQL', en: 'SQL' }, kind: { pt: 'peça', en: 'piece' }, b: 'dados', x: 44, y: 75, t: 2, lvl: 80, desc: { pt: 'Consultas analíticas, joins e agregações para responder perguntas de negócio.', en: 'Analytical queries, joins, and aggregations to answer business questions.' } },
  { id: 'pg', label: { pt: 'PostgreSQL', en: 'PostgreSQL' }, kind: { pt: 'peça', en: 'piece' }, b: 'dados', x: 44, y: 89, t: 2, lvl: 78, desc: { pt: 'Modelagem relacional, índices e funções: banco principal dos projetos.', en: 'Relational modeling, indexes, and functions: the main database of the projects.' } },
  { id: 'docker', label: { pt: 'Docker', en: 'Docker' }, kind: { pt: 'peça', en: 'piece' }, b: 'dados', x: 64, y: 82, t: 3, lvl: 74, desc: { pt: 'Ambientes reproduzíveis para desenvolvimento e deploy, do banco ao serviço de IA.', en: 'Reproducible environments for development and deployment, from database to AI services.' } },
  { id: 'dash', label: { pt: 'Dashboards', en: 'Dashboards' }, kind: { pt: 'peça', en: 'piece' }, b: 'dados', x: 80, y: 82, t: 4, lvl: 76, desc: { pt: 'Painéis que transformam dados brutos em leitura rápida, herança direta dos relatórios técnicos.', en: 'Dashboards transforming raw data into quick reading, a direct heritage of technical reports.' } },
];

/** Connector lines drawn between skill nodes. */
export const EDGES: readonly Edge[] = [
  ['core', 'ia'], ['core', 'web'], ['core', 'dados'],
  ['ia', 'llm'], ['ia', 'rag'], ['llm', 'agent'], ['rag', 'auto'], ['agent', 'eval'], ['auto', 'eval'],
  ['web', 'react'], ['web', 'next'], ['react', 'node'], ['next', 'ts'], ['node', 'ux'], ['ts', 'ux'],
  ['dados', 'sql'], ['dados', 'pg'], ['sql', 'docker'], ['pg', 'docker'], ['docker', 'dash'],
];
