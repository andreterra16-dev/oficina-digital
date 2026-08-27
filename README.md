# Oficina Digital — André Ricco Terra

Portfólio de página única, publicado como um Design Component autocontido
(`Portfolio Andre Ricco.dc.html` + `components/*.js`) — é isso que o navegador
carrega, sem bundler, sem framework do lado do cliente além do runtime vendorizado
(`support.js`).

**Mas isso não é o que você edita.** A fonte de verdade é TypeScript, 100% tipado,
em `src/`. Um build (`npm run build`) compila essa fonte de volta para o
`.dc.html`/`components/*.js` que o navegador roda — ver [Desenvolvimento](#desenvolvimento)
abaixo.

## Estrutura

```
src/                             FONTE — edite aqui
  types/
    dc-runtime.d.ts               tipos ambient do runtime vendorizado (DCLogic, React global)
    domain.ts                     Project, Skill, ProductType, ComponentState… + o guard do union de Project
  data/
    branch.ts, skills.ts,
    product-types.ts, projects.ts conteúdo do site — cores, texto, stack de cada projeto
  logic/
    component.ts                  class Component extends DCLogic — estado, handlers, renderVals()
    illustrations.ts              as 3 ilustrações SVG desenhadas à mão (onboarding/valuation/pricing)
    logo-mark.ts                  a logo "AR" do site, como elemento React reutilizável
    likes.ts                      persistência do botão de like em localStorage
    whatsapp.ts                   número + gerador de link wa.me com mensagem por tipo de projeto
  components/
    pixel-reveal.ts               <pixel-reveal>  revelação da imagem em tiles
    ascii-cursor.ts               <ascii-cursor>  rastro ASCII que segue o ponteiro
    image-slot.ts                 <image-slot>    placeholder de imagem arrastável

scripts/
  build.ts                        compila src/ → components/*.js + injeta em Portfolio Andre Ricco.dc.html

Portfolio Andre Ricco.dc.html    GERADO — template (editável) + lógica (não editar, vem de src/logic)
components/*.js                  GERADO a partir de src/components/*.ts — não editar
support.js                       runtime do Design Component (vendorizado, não editar)
assets/
  andre-full.png                personagem recortado (avatar da esteira)
  andre-portrait.png            retrato redondo — seção Sobre
  andre-retrato-contato.png     retrato redondo — seção Contato
  hero-lousa.png                cena da lousa — painel da hero
  logo-salomao-select-transparent.png   logo oficial do Salomão Select (fundo transparente)
  logo-salomao-santos-crop.png          logo oficial da Salomão Santos (fundo transparente)
uploads/                        originais enviados (fonte dos recortes)
```

## Desenvolvimento

Requer Node 18+.

```bash
npm install         # primeira vez
npm run typecheck    # tsc --noEmit, estrito, sobre src/ e scripts/ — não gera nada
npm run build        # compila src/ → components/*.js + injeta a lógica no .dc.html
npm run verify        # typecheck + build, em sequência — rode isso antes de commitar
```

Depois de rodar `npm run build`, `Portfolio Andre Ricco.dc.html` volta a abrir
direto no navegador (ou via qualquer servidor estático) exatamente como antes —
o build é só o passo que atualiza os arquivos gerados a partir da fonte TS.
Sem build pendente rodado, os arquivos gerados ficam desatualizados em relação
a `src/` — rode `npm run build` sempre que editar algo em `src/` ou `scripts/`.

## Seções, na ordem

1. **Hero — etapa 01 · planta.** Título "Oficina Digital", painel emoldurado com a cena da lousa.
2. **Bancada de IA — etapa 02.** Árvore de habilidades clicável; nós e ligações vêm de
   `SKILLS` / `EDGES` na classe de lógica.
3. **O jogo do seu projeto — etapa 03.** Esteira com os 5 tipos de produto que André constrói
   (`PRODUCT_TYPES`) — LP's modernas, software sob demanda, relatórios/análise de dados, criação
   de web produtos e "entre outros" — com painel de detalhe (explicação em bom português, exemplos
   práticos, pra quem é, prazo) e um CTA de WhatsApp com mensagem pré-preenchida pro tipo
   selecionado. Abaixo, os cartões de projeto entregues: cada um abre uma modal individual,
   animada, com problema, resultado, desafios técnicos, estratégia de mapeamento e o que o
   projeto ensinou — dados reais puxados dos repositórios em github.com/andreterra-lgtm.
4. **Sobre — etapa 04 · acabamento.** Texto de posicionamento e números.
5. **Contato — entrega.** E-mail, LinkedIn, rodapé.

## Onde editar o quê

Depois de qualquer mudança em `src/`, rode `npm run build`.

| Quero mudar | Onde |
| --- | --- |
| Tipos de produto (título, explicação, exemplos, pra quem é, prazo) | `src/data/product-types.ts` |
| Número/mensagens do WhatsApp | `src/logic/whatsapp.ts` (CTA dinâmico do jogo do projeto); os outros 3 CTAs de WhatsApp são estáticos, direto no `.dc.html` |
| Habilidades da árvore e suas ligações | `src/data/skills.ts` |
| Projetos (título, stack, problema, resultado, desafios, mapeamento, evolução, logo/ilustração, cor) | `src/data/projects.ts` |
| Ilustrações SVG dos projetos sem logo oficial | `src/logic/illustrations.ts` |
| A logo "AR" do site (header, rodapé, selo, modal) | `src/logic/logo-mark.ts` |
| Estado, handlers de clique, `renderVals()` | `src/logic/component.ts` |
| Imagens dos projetos | arraste sobre os `<image-slot id="proj-1…5">` na própria página (o mesmo slot aparece no cartão e na modal de detalhe) — isso não passa por build, persiste direto no navegador |
| Cor de destaque, cursor, granularidade do reveal | painel de Tweaks (props do componente) |
| Markup/layout/animações CSS (o que não é dado nem lógica) | direto em `Portfolio Andre Ricco.dc.html` — só a região dentro de `<script data-dc-script>` é gerada; o resto do arquivo é editado à mão normalmente |

## Paleta

| Uso | Hex |
| --- | --- |
| Fundo base (cimento queimado) | `#1B1917` |
| Fundo elevado / cartões | `#26231F` · `#2C2925` |
| Texto principal | `#F1EADD` |
| Texto secundário | `#A69C8C` · `#766D5F` |
| Destaque (laranja) | `#E4622E` — hover `#F4885A` |
| Apoio (âmbar) | `#E0A544` |
| Apoio (aço) | `#7E8C91` |

Tipografia: **Archivo** (títulos e corpo) e **JetBrains Mono** (etiquetas, números, metadados),
carregadas do Google Fonts no `<helmet>`.

## Componentes

Fonte em `src/components/*.ts`; `npm run build` gera `components/*.js` a partir dela — não edite
os `.js` diretamente, a próxima build sobrescreve.

**`<pixel-reveal src pixel-size duration replay>`** — desenha a imagem em tiles quadrados que
acendem em ordem aleatória quando entram na viewport. Tiles totalmente transparentes são
descartados na varredura de alfa, então recortes em PNG revelam apenas a silhueta.
`replay="true"` refaz a animação a cada nova entrada.

**`<ascii-cursor cell-size radius density hold box-color text-color fade>`** — overlay fixo em
toda a página. A intensidade é cheia sobre a hero e cai para o fator `fade` conforme a rolagem
avança, para não competir com o conteúdo. Pausa com a aba oculta.

**`<image-slot id placeholder src fit>`** — área de imagem que o usuário preenche arrastando o
arquivo; a escolha persiste entre recarregamentos. Cada slot precisa de um `id` distinto. Aceita
um `src` inicial (usado pelas logos oficiais dos projetos) — o usuário ainda pode arrastar por
cima para substituir.

Os três recebem posição e display por regra de elemento no `<helmet><style>` — não defina esses
valores por JavaScript, o runtime reescreve o atributo `style` a cada render.

## Regras de estilo do arquivo

- Estilos são **inline**, por elemento. O `<style>` do `<helmet>` guarda apenas o que não pode
  ser inline: reset do body, `@keyframes` e as regras de elemento dos componentes.
- Sem folhas de estilo externas, sem classes utilitárias, sem tokens em CSS.
- Toda lógica (estado, handlers, dados) fica na classe `Component`; o template só consome
  valores já prontos por nome. A fonte dessa lógica é `src/logic/component.ts` — o bloco
  `<script data-dc-script>` no `.dc.html` é gerado a partir dela, não editado à mão.

## Pendências de conteúdo

- Os 5 cartões de projeto (`PROJECTS`) usam conteúdo real levantado dos repositórios públicos em
  github.com/andreterra-lgtm (READMEs, PRODUCT.md, DESIGN.md e MAPA-DE-LOGS.md) — revise texto e
  métricas se algo mudou desde a última sincronização.
- O 6º cartão segue aberto como "próximo case" e linka direto para o GitHub.
- Falta imagem real em todos os `<image-slot>` de projeto — hoje mostram só o placeholder.
- Prazos e entregas das 6 fases são proposta — revise para bater com sua operação.
