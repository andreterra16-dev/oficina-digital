# Personagem em 3D

Referência do que anima o "boneco" do portfólio (herói, "Acabamento" e contato): como funciona, como carrega, quanto custa e como acrescentar um personagem novo.

Resumo: não existe modelo 3D do André, só ilustrações. Cada imagem vira um *depth photo* (uma malha com relevo vindo de um mapa de profundidade), renderizado com **Three.js**. Objetos flutuantes em pseudo-3D vêm do **Zdog**. O `<pixel-reveal>` é o fallback.

## Peças

| Arquivo | Papel |
| --- | --- |
| `src/components/character-3d.ts` | O elemento `<character-3d>`: carrega a cena, decide quando ela aparece, cuida de fallback e de visibilidade. Pequeno (~3 KB), sem Three.js. |
| `src/components/three-stage.ts` | A cena Three.js (shaders, camadas, loop). Módulo ES separado (`components/three-stage.js`, ~540 KB), carregado com `import()`. |
| `src/components/zdog-orbit.ts` | Objetos flutuantes em Zdog (cubo, anel, hexágono, `</>`, voxels). Independente da cena. |
| `scripts/depth/make-depth.py` | Gera os mapas de profundidade (`assets/depth/`). |
| `scripts/depth/make-arm.py` | Separa o braço que acena em camada própria (`assets/3d/*-arm.webp`, `*-base.webp`). |
| `assets/3d/` | Texturas WebP usadas pela cena (leves). |
| `assets/depth/` | Mapas de profundidade (cinza; branco = perto). |

Os PNGs originais em `assets/` continuam sendo o que o `<pixel-reveal>` mostra (fallback).

## Como o efeito é feito

1. **Relevo.** A imagem vai numa malha de 64×N segmentos; o vertex shader empurra cada vértice para a câmera pelo valor do mapa de profundidade. Inclinar a malha (mouse, ou um balanço lento sozinho) move o corpo contra o fundo, como um objeto real. A lente é longa (FOV 16°), então o repouso é praticamente idêntico à imagem plana.
2. **Respiração.** O mesmo shader faz o corpo inchar e subir um fio, devagar.
3. **Luz.** O fragment shader tira uma normal do mapa de profundidade (amostrando-o por pixel, com filtro linear) e ilumina o relevo com uma luz que segue o mouse. Há também um brilho diagonal que atravessa o corpo de tempos em tempos.
4. **Entrada.** A imagem se monta em blocos quadrados, em ordem aleatória, cada um piscando ao chegar (~1,1 s), e a câmera avança alguns por cento (`zoom`) para a malha inclinada nunca expor a borda.
5. **Aceno (só no contato).** O antebraço e a mão são uma *segunda camada*, um plano que gira rigidamente em torno do cotovelo. Ver abaixo.

### Por que o aceno é uma camada (e não uma deformação)

A primeira versão do aceno entortava a malha em volta do braço no vertex shader. Isso arrastava junto o fundo e a manga ao redor da mão, e a mão borrava. Animação por recortes resolve do jeito certo: o braço vira uma camada própria e se move como corpo rígido, **sem reamostrar os pixels**, então a mão fica nítida.

`make-arm.py` faz o recorte com segmentação clássica (sem modelo de IA), porque a imagem é uma figura sobre fundo cinza liso:

1. Modela o fundo (versão muito borrada da imagem com a figura mascarada).
2. A figura é onde a imagem difere desse modelo.
3. O braço é a parte da figura que não é azul-camisa, dentro de uma caixa em volta do antebraço.
4. O cotovelo é uma dobradiça: só **antebraço e mão** giram; o braço (do cotovelo à manga) fica no corpo. O corte é uma linha pelo pivô.
5. *Base* = imagem com o antebraço trocado pelo fundo reconstruído (a faixa de 14 px ao lado do corte mantém pele, então ao girar aparece pele, não fundo). *Camada do braço* = só o antebraço, com borda suavizada e alfa que some ao longo do corte, para a borda móvel se fundir ao braço parado.

A cena desenha a base e, por cima, a camada do braço pendurada num grupo posicionado no cotovelo. A amplitude "respira" (balanços fortes alternam com mais suaves).

## `<character-3d>`

```html
<character-3d src="./assets/andre-retrato-contato.png"
              texture="./assets/3d/andre-retrato-contato-base.webp"
              depth="./assets/depth/andre-retrato-contato.png"
              arm="./assets/3d/andre-retrato-contato-arm.webp" wave="0.229,0.299,0.2,7"
              amp="0.18" sway="1.15" fit="cover" zoom="1.1">
  <pixel-reveal src="./assets/andre-retrato-contato.png" …></pixel-reveal>
</character-3d>
```

| Atributo | Padrão | Significado |
| --- | --- | --- |
| `src` | — | Imagem original. É a **chave** da cena (uma cena por imagem) e a textura se `texture` faltar. |
| `texture` | `src` | Textura usada pela cena (use WebP leve). |
| `depth` | — | Mapa de profundidade, mesmo enquadramento da imagem. |
| `amp` | `0.2` | Quanto o ponto mais próximo avança, em alturas de imagem. Maior = mais relevo (e mais esticamento nas bordas). |
| `sway` | `1` | Intensidade do balanço ocioso. |
| `fit` | `contain` | `cover` para retratos redondos: a imagem cobre o quadro e a borda cortada nunca aparece. |
| `zoom` | `1.06` | Avanço final da câmera. Retratos redondos usam `1.1`. |
| `arm` | — | Camada do membro animado (WebP com alfa, alinhada à textura). |
| `wave` | — | `pivotU,pivotV,amp,speed`: pivô em UV da imagem (y para cima), balanço máximo em radianos, velocidade em rad/s. |

O filho (`<pixel-reveal>`) entra por `<slot>` e é só o fallback.

## Carregamento e estados

Objetivo: a cena viva é o que o visitante vê se mexendo desde o começo, sem imagem estática antes.

- **Pré-carregamento no `<head>`**: módulo da cena, textura e mapa de profundidade do herói (`modulepreload` + `preload`), só para quem não pede "reduzir movimento".
- **Boot na hora**: no primeiro frame o elemento já começa a subir a cena (qualquer um até 1,5 viewport abaixo). Os mais distantes esperam um `IntersectionObserver` com margem de 100%.
- **Cena compartilhada**: o runtime do template (`support.js`) monta o React *depois* de parsear o HTML e troca os `<character-3d>` por elementos novos. Um registro por imagem (`SHARED`) entrega a cena já criada ao elemento que chega, em vez de refazê-la (~1 s a menos). Se ninguém a reivindicar em 5 s, é descartada.
- **Espera só o boot**: a cena não toca a entrada debaixo da sequência de boot (`#boot-overlay`, ~1,6 s); espera a animação terminar.
- **`data-state` no host**: `pending` (esperando; o slot fica oculto para não piscar uma imagem estática), `live` (cena visível), `slot` (fallback visível).
- **Fallback**: o slot aparece se a cena demorar mais de 2,5 s depois do boot, se o WebGL falhar ou o contexto se perder, e é a única coisa vista com "reduzir movimento".
- **Visibilidade**: o loop de render só roda com o elemento na tela e a aba ativa.

## Orçamento de performance

| Item | Valor |
| --- | --- |
| `character-3d.js` | ~3 KB |
| `zdog-orbit.js` | ~34 KB (inclui o Zdog) |
| `three-stage.js` | ~540 KB, sob demanda; não baixa com "reduzir movimento" |
| Textura do herói (WebP) | ~75 KB (o PNG original tem 2,6 MB) |
| Mapas de profundidade | 256 px de largura, poucos KB cada |

Otimizações aplicadas:

- WebP em vez de PNG para as texturas (≈ 35× menor no herói), com mipmaps.
- Teto de pixels do canvas (`MAX_PIXELS`, 1,6 M): a densidade (DPR) cai em telas 2× grandes para o preenchimento não quadruplicar.
- Malha de 64 segmentos (suficiente para um mapa de 256 px) compartilhada entre as camadas; uniforms compartilhados (uma escrita por frame atualiza todas).
- Camadas planas sem teste de profundidade (ordem de desenho resolve; não há o que disputar).
- Normal da luz amostrada do mapa (sem derivadas de tela): mais barata de raciocinar e sem manchas quadradas.
- Loop pausado fora da tela e em aba oculta; `dispose` completo (geometria, materiais, texturas, renderer).
- Cena única por imagem, mesmo com o runtime trocando elementos.

## Acessibilidade

- O canvas é `aria-hidden`; o conteúdo continua sendo a imagem (com o texto alternativo da página).
- `prefers-reduced-motion`: nenhuma cena é criada nem baixada; o `<pixel-reveal>` mostra a imagem pronta. `zdog-orbit` desenha um único quadro parado.

## Acrescentando um personagem novo

1. Coloque o PNG em `assets/`. A figura deve estar sobre um fundo liso (ou ter alfa).
2. Inclua uma função para ele em `scripts/depth/make-depth.py` (copie `contact()` ou `portrait()`) e rode `python scripts/depth/make-depth.py`.
3. Gere uma versão WebP em `assets/3d/` (≈ 1024–1152 px no lado maior).
4. Use `<character-3d>` com o PNG como filho `<pixel-reveal>` (fallback). Para retratos redondos, `fit="cover" zoom="1.1"`.
5. Para animar um membro: adapte `scripts/depth/make-arm.py` (caixa, pivô, linha de corte), rode, e passe `arm` e `wave`.

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| Faixa reta cortando o topo de um retrato redondo | A malha inclinada expôs a borda da imagem | `fit="cover"` e `zoom` ≥ 1.1 |
| Membro borrado ao animar | Deformação da malha em vez de camada | Separe o membro em camada (`make-arm.py`) |
| Manchas quadradas na luz | Normal por derivada de tela | Já corrigido: normal amostrada do mapa |
| Imagem "dobrada" / fantasma | Cena e slot visíveis juntos | Conferir `data-state` (`live` esconde o slot) |
| Cena aparece só depois do boot | Esperado: ela aguarda `#boot-overlay` | Encurtar a sequência de boot no `.dc.html` |
| Nada aparece em um navegador antigo | Sem WebGL | Fallback do slot; nada a fazer |
