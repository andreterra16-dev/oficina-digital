import type { NonEmptyArray, ProductType } from '../types/domain';

/**
 * The kinds of product on "o jogo do seu projeto" (etapa 03) — what a
 * visitor can actually ask André to build. Positions reuse 5 of the 6
 * (x,y) coordinates the esteira's SVG curve was originally drawn through
 * (see the track `<path>` in the `.dc.html`) — any subset of them still
 * lands exactly on the curve, so the visual track never had to be redrawn
 * for this to hold fewer stops than it used to.
 */
export const PRODUCT_TYPES: NonEmptyArray<ProductType> = [
  {
    tag: '01', short: { pt: "LP's Modernas", en: "Modern LPs" }, x: 8, y: 72.5, title: { pt: "Landing Pages Modernas", en: "Modern Landing Pages" },
    explainer: { pt: 'Uma página única, feita pra converter quem chega até ela. Pensada pra rodar bem em anúncio, lançamento ou campanha, com um só objetivo claro: fazer a pessoa agir (comprar, agendar, cadastrar).', en: 'A single page, designed to convert those who land on it. Built to perform well in ads, launches, or campaigns, with a single clear goal: getting the user to take action (buy, schedule, register).' },
    examples: { pt: 'Página de vendas, página de captura de lead, hotsite de campanha: rápida, bonita no celular e com o empurrãozinho certo na hora certa.', en: 'Sales page, lead capture page, campaign landing page: fast, mobile-friendly, with the right nudge at the right time.' },
    idealFor: { pt: 'Quem precisa de uma página nova pra ontem, com foco total em conversão, sem departamento de marketing enorme por trás.', en: 'Anyone who needs a new page urgently, with a total focus on conversion, without a huge marketing department behind it.' },
    timeframe: { pt: '1 a 2 semanas', en: '1 to 2 weeks' },
  },
  {
    tag: '02', short: { pt: 'Criação de Web Produtos', en: 'Web Products' }, x: 25, y: 36.3, title: { pt: 'Criação de Web Produtos', en: 'Web Product Creation' },
    explainer: { pt: 'Um produto digital completo, construído do zero: site institucional, portal, área logada. Pensado como um projeto de verdade, com planta antes do código.', en: 'A complete digital product built from scratch: institutional site, portal, logged-in user area. Conceived as a real project, with a blueprint before the code.' },
    examples: { pt: 'Site institucional novo, portal de conteúdo, área logada pra cliente ou parceiro.', en: 'New institutional website, content portal, logged-in portal for clients or partners.' },
    idealFor: { pt: 'Empresa que quer presença digital séria, não um site "de vitrine" genérico e igual a todos os outros.', en: 'Companies wanting a serious digital presence, not a generic template "showcase" site like all others.' },
    timeframe: { pt: '3 a 8 semanas', en: '3 to 8 weeks' },
  },
  {
    tag: '03', short: { pt: 'Software sob Demanda', en: 'Custom Software' }, x: 59, y: 29, title: { pt: 'Software sob Demanda (WebSaaS)', en: 'Custom Software (WebSaaS)' },
    explainer: { pt: 'Um sistema que roda direto no navegador, como se fosse um aplicativo, sem precisar instalar nada, acessível de qualquer computador ou celular com internet.', en: 'A system running directly in the browser, like an application, without installation, accessible from any computer or mobile device with internet access.' },
    examples: { pt: 'Painel de gestão interno, ferramenta de cálculo pra sua operação, sistema de agendamento: sob medida pro seu processo, não um sistema genérico que você tem que se adaptar.', en: 'Internal management dashboard, calculation tools for your operations, scheduling system: tailored to your process, not a generic system you have to adapt to.' },
    idealFor: { pt: 'Negócios que hoje dependem de planilha, WhatsApp e "jeitinho" pra rodar uma parte importante da operação.', en: 'Businesses that currently rely on spreadsheets, WhatsApp, and "workarounds" to run an important part of their operations.' },
    timeframe: { pt: '4 a 10 semanas', en: '4 to 10 weeks' },
  },
  {
    tag: '04', short: { pt: 'Relatórios e Análise de Dados', en: 'Data Reports' }, x: 78, y: 64.5, title: { pt: 'Relatórios Web e Análise de Dados', en: 'Web Reporting & Data Analysis' },
    explainer: { pt: 'Um painel que junta os números espalhados do seu negócio (vendas, tráfego, operação) num só lugar, em gráficos fáceis de ler, sem precisar abrir dez planilhas pra entender o que está acontecendo.', en: 'A dashboard that brings together your scattered business numbers (sales, traffic, operations) in one place with easy-to-read charts, without opening ten spreadsheets to understand what is happening.' },
    examples: { pt: 'Dashboard de vendas em tempo real, relatório automático de campanha, painel de indicadores pra reunião de diretoria.', en: 'Real-time sales dashboard, automated campaign reports, indicator panels for board meetings.' },
    idealFor: { pt: 'Quem toma decisão no escuro hoje porque o dado existe, mas está espalhado ou difícil de ler.', en: 'Decision makers operating in the dark because data exists but is scattered or hard to read.' },
    timeframe: { pt: '2 a 5 semanas', en: '2 to 5 weeks' },
  },
  {
    tag: '05', short: { pt: 'Entre outros', en: 'Others' }, x: 92, y: 26.5, title: { pt: 'Entre outros', en: 'Others' },
    explainer: { pt: 'Tem uma ideia que não se encaixa direitinho nas anteriores? Ainda assim pode ser um projeto: automação, integração entre sistemas, protótipo de IA. Se envolve web, dado ou IA, vale a conversa.', en: 'Have an idea that does not fit perfectly in the categories above? It can still be a project: automation, system integration, AI prototypes. If it involves web, data, or AI, it is worth the conversation.' },
    examples: { pt: 'Automação de processo repetitivo, integração entre duas ferramentas, prova de conceito com IA.', en: 'Repetitive process automation, integration between tools, proof of concept with AI.' },
    idealFor: { pt: 'Quem tem um problema específico e ainda não sabe qual é o formato certo da solução.', en: 'Anyone with a specific problem who does not yet know the correct format of the solution.' },
    timeframe: { pt: 'sob consulta', en: 'upon request' },
  },
];
