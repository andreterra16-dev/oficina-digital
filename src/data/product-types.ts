import type { ProductType } from '../types/domain';

/**
 * The kinds of product on "o jogo do seu projeto" (etapa 03) — what a
 * visitor can actually ask André to build. Positions reuse 5 of the 6
 * (x,y) coordinates the esteira's SVG curve was originally drawn through
 * (see the track `<path>` in the `.dc.html`) — any subset of them still
 * lands exactly on the curve, so the visual track never had to be redrawn
 * for this to hold fewer stops than it used to.
 */
export const PRODUCT_TYPES: readonly ProductType[] = [
  {
    tag: '01', short: "LP's Modernas", x: 8, y: 72.5, title: "Landing Pages Modernas",
    explainer: 'Uma página única, feita pra converter quem chega até ela — pensada pra rodar bem em anúncio, lançamento ou campanha, com um só objetivo claro: fazer a pessoa agir (comprar, agendar, cadastrar).',
    examples: 'Página de vendas, página de captura de lead, hotsite de campanha — rápida, bonita no celular e com o empurrãozinho certo na hora certa.',
    idealFor: 'Quem precisa de uma página nova pra ontem, com foco total em conversão — sem departamento de marketing enorme por trás.',
    timeframe: '1 a 2 semanas',
  },
  {
    tag: '02', short: 'Criação de Web Produtos', x: 25, y: 36.3, title: 'Criação de Web Produtos',
    explainer: 'Um produto digital completo, construído do zero: site institucional, portal, área logada — pensado como um projeto de verdade, com planta antes do código.',
    examples: 'Site institucional novo, portal de conteúdo, área logada pra cliente ou parceiro.',
    idealFor: 'Empresa que quer presença digital séria, não um site "de vitrine" genérico e igual a todos os outros.',
    timeframe: '3 a 8 semanas',
  },
  {
    tag: '03', short: 'Software sob Demanda', x: 59, y: 29, title: 'Software sob Demanda (WebSaaS)',
    explainer: 'Um sistema que roda direto no navegador, como se fosse um aplicativo — sem precisar instalar nada, acessível de qualquer computador ou celular com internet.',
    examples: 'Painel de gestão interno, ferramenta de cálculo pra sua operação, sistema de agendamento — sob medida pro seu processo, não um sistema genérico que você tem que se adaptar.',
    idealFor: 'Negócios que hoje dependem de planilha, WhatsApp e "jeitinho" pra rodar uma parte importante da operação.',
    timeframe: '4 a 10 semanas',
  },
  {
    tag: '04', short: 'Relatórios e Análise de Dados', x: 78, y: 64.5, title: 'Relatórios Web e Análise de Dados',
    explainer: 'Um painel que junta os números espalhados do seu negócio — vendas, tráfego, operação — num só lugar, em gráficos fáceis de ler, sem precisar abrir dez planilhas pra entender o que está acontecendo.',
    examples: 'Dashboard de vendas em tempo real, relatório automático de campanha, painel de indicadores pra reunião de diretoria.',
    idealFor: 'Quem toma decisão no escuro hoje porque o dado existe, mas está espalhado ou difícil de ler.',
    timeframe: '2 a 5 semanas',
  },
  {
    tag: '05', short: 'Entre outros', x: 92, y: 26.5, title: 'Entre outros',
    explainer: 'Tem uma ideia que não se encaixa direitinho nas anteriores? Ainda assim pode ser um projeto — automação, integração entre sistemas, protótipo de IA. Se envolve web, dado ou IA, vale a conversa.',
    examples: 'Automação de processo repetitivo, integração entre duas ferramentas, prova de conceito com IA.',
    idealFor: 'Quem tem um problema específico e ainda não sabe qual é o formato certo da solução.',
    timeframe: 'sob consulta',
  },
];
