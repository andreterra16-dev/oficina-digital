import type { Edge, Skill } from '../types/domain';

/** Nodes of the "Bancada de IA" skill tree (etapa 02). */
export const SKILLS: readonly Skill[] = [
  { id: 'core', label: 'André', kind: 'núcleo', b: 'core', x: 7, y: 50, t: 0, lvl: 100, desc: 'Base de engenharia aplicada a software: modelar o problema, medir e comunicar o resultado.' },
  { id: 'ia', label: 'Engenharia de IA', kind: 'ramo', b: 'ia', x: 24, y: 20, t: 1, lvl: 85, desc: 'Especialização principal. Construir sistemas em torno de modelos de linguagem: contexto, ferramentas, avaliação e custo.' },
  { id: 'llm', label: 'LLM & APIs', kind: 'peça', b: 'ia', x: 44, y: 9, t: 2, lvl: 85, desc: 'Integração de modelos via API, streaming de respostas, function calling e controle de tokens e custo por requisição.' },
  { id: 'rag', label: 'RAG & Embeddings', kind: 'peça', b: 'ia', x: 44, y: 25, t: 2, lvl: 78, desc: 'Indexação de documentos, chunking, busca vetorial e montagem de contexto para respostas fundamentadas em dados do cliente.' },
  { id: 'agent', label: 'Agentes & Tools', kind: 'peça', b: 'ia', x: 64, y: 5, t: 3, lvl: 74, desc: 'Agentes que executam tarefas com ferramentas: leitura de arquivos, consultas a banco e chamadas a sistemas internos.' },
  { id: 'auto', label: 'Automação com IA', kind: 'peça', b: 'ia', x: 64, y: 20, t: 3, lvl: 80, desc: 'Fluxos que removem trabalho manual repetitivo: triagem, extração de dados de documentos e geração de relatórios.' },
  { id: 'eval', label: 'Avaliação & Prompt', kind: 'peça', b: 'ia', x: 80, y: 12, t: 4, lvl: 70, desc: 'Prompt como especificação: critérios de aceite, testes de regressão e comparação entre modelos antes de ir para produção.' },
  { id: 'web', label: 'Desenvolvimento web', kind: 'ramo', b: 'web', x: 24, y: 52, t: 1, lvl: 90, desc: 'Interfaces de produto do zero ao deploy, com foco em performance e clareza de uso.' },
  { id: 'react', label: 'React', kind: 'peça', b: 'web', x: 44, y: 44, t: 2, lvl: 90, desc: 'Componentização, estado, hooks e padrões de UI reutilizáveis em produtos reais.' },
  { id: 'next', label: 'Next.js', kind: 'peça', b: 'web', x: 44, y: 60, t: 2, lvl: 88, desc: 'App Router, renderização no servidor, rotas de API e SEO para sites e aplicações.' },
  { id: 'node', label: 'Node.js', kind: 'peça', b: 'web', x: 64, y: 40, t: 3, lvl: 82, desc: 'APIs, integrações e serviços de backend — a camada que conecta interface, dados e modelos.' },
  { id: 'ts', label: 'JavaScript & TS', kind: 'peça', b: 'web', x: 64, y: 56, t: 3, lvl: 88, desc: 'Linguagem base do dia a dia; tipagem para reduzir erro em times e em contratos de API.' },
  { id: 'ux', label: 'UI de produto', kind: 'peça', b: 'web', x: 80, y: 48, t: 4, lvl: 72, desc: 'Layout, hierarquia e microinterações — interface que explica sozinha o que o sistema faz.' },
  { id: 'dados', label: 'Dados & infra', kind: 'ramo', b: 'dados', x: 24, y: 84, t: 1, lvl: 76, desc: 'Da modelagem do banco à entrega em container: o caminho do dado até a decisão.' },
  { id: 'sql', label: 'SQL', kind: 'peça', b: 'dados', x: 44, y: 76, t: 2, lvl: 80, desc: 'Consultas analíticas, joins e agregações para responder perguntas de negócio.' },
  { id: 'pg', label: 'PostgreSQL', kind: 'peça', b: 'dados', x: 44, y: 90, t: 2, lvl: 78, desc: 'Modelagem relacional, índices e funções — banco principal dos projetos.' },
  { id: 'docker', label: 'Docker', kind: 'peça', b: 'dados', x: 64, y: 85, t: 3, lvl: 74, desc: 'Ambientes reproduzíveis para desenvolvimento e deploy, do banco ao serviço de IA.' },
  { id: 'dash', label: 'Dashboards', kind: 'peça', b: 'dados', x: 80, y: 78, t: 4, lvl: 76, desc: 'Painéis que transformam dados brutos em leitura rápida — herança direta dos relatórios técnicos.' },
];

/** Connector lines drawn between skill nodes. */
export const EDGES: readonly Edge[] = [
  ['core', 'ia'], ['core', 'web'], ['core', 'dados'],
  ['ia', 'llm'], ['ia', 'rag'], ['llm', 'agent'], ['rag', 'auto'], ['agent', 'eval'], ['auto', 'eval'],
  ['web', 'react'], ['web', 'next'], ['react', 'node'], ['next', 'ts'], ['node', 'ux'], ['ts', 'ux'],
  ['dados', 'sql'], ['dados', 'pg'], ['sql', 'docker'], ['pg', 'docker'], ['docker', 'dash'],
];
