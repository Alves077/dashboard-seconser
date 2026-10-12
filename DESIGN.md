---
version: 1.0
name: dip-seconser-design
description: Sistema visual do dashboard DIP / SECONSER Niterói. Adaptação para painel de dados do DESIGN.md "Stripi-Inspired" (awesome-design-md, MIT) — tinta navy, índigo como única cor de ação, superfícies claras com borda fina, algarismos tabulares — sem o degradê de marketing, com Inter no lugar da Söhne, paleta de gráficos validada para daltonismo, cores de situação, modo escuro completo e regras de celular, carregamento, vazio e erro.

colors:
  # Ação (botões, links, foco, seleção). Nunca usado em dado de gráfico.
  primary: "#533afd"          # 6.2:1 sobre branco
  primary-press: "#2e2b8c"
  primary-soft-bg: "#eeedff"  # fundo de item selecionado / chip ativo
  on-primary: "#ffffff"
  # Tinta
  ink: "#0d253d"              # texto principal (15.6:1)
  ink-secondary: "#273951"    # texto secundário (11.7:1)
  ink-mute: "#64748d"         # legenda/rótulo — SÓ sobre card branco (4.75:1); no fundo da página usar ink-secondary
  # Superfícies
  page: "#f6f9fc"             # fundo da página
  card: "#ffffff"             # cards, painéis, tabela
  hairline: "#e3e8ee"         # borda 1px de card e tabela
  hairline-input: "#a8c3de"   # borda de campo
  # Modo escuro (selecionado, não invertido)
  dark-page: "#0a1324"
  dark-card: "#111b2e"
  dark-hairline: "#22314d"
  dark-ink: "#e6edf6"         # 14.6:1 sobre dark-card
  dark-ink-secondary: "#a3b1c6" # 7.9:1
  dark-ink-mute: "#7d8ba1"    # 5.0:1
  dark-primary: "#8d87ff"     # 5.8:1 — link/ação no escuro
  # Situação (reservadas — sempre com ícone + texto)
  status-ok: "#0ca30c"            # OK (retornou)
  status-andamento: "#fab219"     # Em Atendimento (no prazo)
  status-risco: "#ec835a"         # Risco elétrico (categoria 7) — destaque
  status-atraso: "#d03b3b"        # Em Atraso
  status-ok-text: "#006300"       # texto "OK" sobre branco (a cor de marca não passa 4.5:1 em texto)
  # Gráficos — paleta categórica (ordem fixa; ver seção Gráficos)
  series-1: "#2a78d6"
  series-2: "#eb6834"
  series-3: "#1baf7a"
  series-4: "#eda100"
  series-5: "#e87ba4"
  series-6: "#008300"
  series-7: "#4a3aa7"
  series-8: "#e34948"
  dark-series-1: "#3987e5"
  dark-series-2: "#d95926"
  dark-series-3: "#199e70"
  dark-series-4: "#c98500"
  dark-series-5: "#d55181"
  dark-series-6: "#008300"
  dark-series-7: "#9085e9"
  dark-series-8: "#e66767"

typography:
  kpi-value:
    fontFamily: "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: 32px
    fontWeight: 300
    lineHeight: 1.1
    letterSpacing: -0.64px
  page-title:
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.4px
  card-title:
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: -0.1px
  body:
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  table:
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
    fontFeature: tnum
  caption:
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  eyebrow:
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.4px
  input:
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif"
    fontSize: 16px              # mínimo: abaixo disso o iOS dá zoom no campo
    fontWeight: 400
    lineHeight: 1.3

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  pill: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px

motion:
  ease-out: "cubic-bezier(0.23, 1, 0.32, 1)"
  ease-in-out: "cubic-bezier(0.77, 0, 0.175, 1)"
  ease-drawer: "cubic-bezier(0.32, 0.72, 0, 1)"
  press: 140ms
  tooltip: 150ms
  dropdown: 200ms
  drawer: 300ms

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
    minHeight: 44px
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.primary}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
    minHeight: 44px
  card:
    backgroundColor: "{colors.card}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.lg}"
    padding: 20px
    shadow: "rgba(0,55,112,0.08) 0 1px 3px"
  kpi-card:
    backgroundColor: "{colors.card}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.lg}"
    padding: 16px 20px
  filter-select:
    backgroundColor: "{colors.card}"
    border: "1px solid {colors.hairline-input}"
    rounded: "{rounded.sm}"
    typography: "{typography.input}"
    minHeight: 44px
  chip:
    backgroundColor: "{colors.primary-soft-bg}"
    textColor: "{colors.primary-press}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
    minHeight: 32px              # dentro de uma área de toque de 44px
  status-badge:
    rounded: "{rounded.pill}"
    padding: 2px 8px
    typography: "{typography.caption}"
---

# DESIGN.md — Dashboard DIP · SECONSER Niterói

Fonte e crédito: adaptado de [`design-md/stripe/DESIGN.md`](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/stripe/DESIGN.md)
(VoltAgent/awesome-design-md, licença MIT). É uma **inspiração** visual: nada da marca Stripe (nome, logo, degradê,
fonte proprietária) entra no produto. A identidade é da SECONSER/Prefeitura de Niterói (logo e brasão já usados no site).

## 1. Princípios

1. **O dado é o protagonista.** Cards claros, borda fina, tinta navy, uma cor de ação (índigo). Cor de dado só em
   gráfico e mapa; texto sempre nas cores de tinta.
2. **Números alinhados.** Toda coluna numérica e eixo usa algarismos tabulares (`font-variant-numeric: tabular-nums`).
   Números grandes de KPI ficam em Inter 300 com espaçamento negativo — o "ar" do Stripe vem daí.
3. **Funciona na rua.** O mesmo painel no escritório e no celular, com o mapa visível e toque fácil (seção 6).
4. **Nunca uma tela "quebrada".** Carregando, vazio, erro e dados desatualizados têm forma própria e ocupam o mesmo
   lugar do conteúdo (seção 7).
5. **Acessível por padrão.** Contraste WCAG AA no texto, cor nunca sozinha (ícone + texto), daltonismo validado,
   teclado e leitor de tela, movimento reduzido respeitado.

**O que saiu do Stripe original e por quê:** o degradê colorido do topo (é marketing; num painel só disputa atenção com
o dado); Söhne (paga) → **Inter** (variável, servida pelo próprio site via `@fontsource-variable/inter`, sem chamar o
Google); peso 300 em texto pequeno (ilegível em tabela) → 300 só no valor de KPI; botões só em pílula → pílula para
ação, retângulo `rounded.sm` para campos e filtros.

## 2. Cores

### Interface
| Papel | Claro | Escuro | Uso |
|---|---|---|---|
| Página | `page #f6f9fc` | `dark-page #0a1324` | fundo atrás dos cards |
| Card | `card #ffffff` | `dark-card #111b2e` | cards, tabelas, painel do mapa |
| Borda | `hairline #e3e8ee` | `dark-hairline #22314d` | 1px em card/tabela; separador |
| Texto | `ink #0d253d` | `dark-ink #e6edf6` | títulos, valores |
| Texto secundário | `ink-secondary #273951` | `dark-ink-secondary #a3b1c6` | descrições |
| Texto apagado | `ink-mute #64748d` | `dark-ink-mute #7d8ba1` | legendas, eixos — **no claro, só sobre card branco** (no fundo `page` cai para 4.49:1) |
| Ação | `primary #533afd` | `dark-primary #8d87ff` | botão principal, link, foco, item selecionado |

- Índigo é a **única** cor de ação e nunca representa dado.
- Foco visível em tudo que é clicável: `outline: 2px solid primary; outline-offset: 2px`.
- Modo escuro é **escolhido** (tokens próprios acima), não uma inversão. Segue o sistema por padrão, com o botão de
  tema do site atual (persistido) e script anti-flash no `<head>`.

### Situação (reservadas)
| Situação | Cor | Ícone | Onde |
|---|---|---|---|
| OK (retornou) | `status-ok #0ca30c` (texto: `status-ok-text #006300`) | check | KPI, mapa, tabela |
| Em Atendimento (no prazo) | `status-andamento #fab219` | relógio | idem |
| Em Atraso | `status-atraso #d03b3b` | alerta | idem |
| Risco elétrico (cat. 7) | `status-risco #ec835a` | raio | destaque nos abertos |

Sempre **ícone + texto**; a cor nunca carrega o significado sozinha (no claro, `andamento` e `risco` ficam abaixo de
3:1 sobre branco por definição). Essas cores nunca são usadas como "série 4" de um gráfico.

## 3. Gráficos (paleta e regras)

Paleta categórica de referência (método dataviz), **validada contra as nossas superfícies** com o validador de paleta
(OKLab, protan/deutan, Machado 2009):

| Ordem | Claro | Escuro |
|---|---|---|
| 1 azul | `#2a78d6` | `#3987e5` |
| 2 laranja | `#eb6834` | `#d95926` |
| 3 água | `#1baf7a` | `#199e70` |
| 4 amarelo | `#eda100` | `#c98500` |
| 5 magenta | `#e87ba4` | `#d55181` |
| 6 verde | `#008300` | `#008300` |
| 7 violeta | `#4a3aa7` | `#9085e9` |
| 8 vermelho | `#e34948` | `#e66767` |

Resultado (12/10/2026): **claro sobre `#ffffff`** — faixa de luminosidade, croma, separação para daltonismo (pior par
vizinho ΔE 9.1; alvo ≥ 8) e separação normal (19.6; piso 15) aprovados; contraste < 3:1 em água, amarelo e magenta →
**obrigatório rótulo visível ou tabela** onde aparecerem. **Escuro sobre `#111b2e`** — tudo aprovado.

Regras:
- **Ordem fixa**, nunca reciclada; a cor segue a entidade (a região "Norte" tem sempre a mesma cor, mesmo filtrada).
  Mais de 8 séries → "Demais".
- Mapa e dispersão (qualquer par pode ficar lado a lado): **no máximo 3 cores categóricas**; acima disso, agrupar ou
  separar em painéis. O mapa colore por **situação** (cores de status), não por região.
- Magnitude (mapa de calor da Tendência, intensidade): **uma cor só**, claro → escuro (azul).
- **Nunca dois eixos Y.** O gráfico atual de "entradas × concluídos × saldo acumulado" vira dois gráficos alinhados.
- Barras finas, cantos de 4px na ponta, 2px de espaço entre segmentos; linha 2px; grade e eixos discretos.
- Legenda sempre que houver 2+ séries; rótulo direto em até 4; texto e valores na cor de tinta, nunca na cor da série.
- Tooltip no passar do mouse / toque em todo gráfico; área de acerto maior que a marca.
- Todo gráfico tem **"ver como tabela"** (acessibilidade e o alívio de contraste acima).

## 4. Tipografia

Inter variável, servida pelo site. Escala no cabeçalho (`typography`). Pesos usados: 300 (só valor de KPI), 400, 500
(títulos de card, rótulos). Corpo 14px (painel denso); **campos de formulário 16px** (iOS dá zoom abaixo disso).
Tabelas e eixos com `tabular-nums`; datas no formato `dd/mm/aaaa`, números com separador brasileiro (`16.973`).

## 5. Layout e componentes

- Grade: largura máxima 1280px; cards em grade de 12 colunas no desktop, 2 no tablet, 1 no celular.
- Espaçamento base 8px (tokens `spacing`). Entre cards `spacing.lg` (16px); dentro do card 20px.
- **Barra superior:** logo + título, navegação das páginas, "atualizado em" (da última carga do Supabase), botões
  Atualizar e tema; depois do login, "Entrar"/usuário.
- **Barra de filtros:** uma linha acima do conteúdo, fixa ao rolar. Filtros são estado da **URL** (`?regiao=…&periodo=…`):
  voltar/avançar funcionam e um link filtrado pode ser compartilhado.
- **KPI:** rótulo (eyebrow, maiúsculas), valor (kpi-value), variação/explicação em caption. Borda colorida só quando o
  KPI é uma situação (ex.: Em Atraso).
- **Tabelas:** cabeçalho fixo, linhas de 44px no toque, zebra sutil opcional, número à direita, texto à esquerda.
- Elevação: nível 0 (plano) por padrão; nível 1 (`rgba(0,55,112,0.08) 0 1px 3px`) em card; nível 2 só em popover,
  gaveta e tooltip.

## 6. Celular e tablet (skill `mobile-native`)

- **Áreas de toque ≥ 44 × 44px** em botões, filtros, linhas clicáveis e itens de lista — pensado para uso na rua, com
  uma mão. Chips podem ter 32px visuais desde que a área de toque tenha 44px.
- **Filtros no celular viram uma gaveta** (botão "Filtros" com a contagem de filtros ativos, gaveta de baixo para cima
  com `ease-drawer`); no tablet, a barra quebra em duas linhas.
- **Mapa visível também no celular** (hoje ele é escondido): altura de ~55% da tela, painel lateral vira lista abaixo.
  `touch-action` adequado para o mapa não "sequestrar" a rolagem da página (gesto de dois dedos para mover/zoom).
- `100dvh` no esqueleto da aplicação; `viewport-fit=cover` + `env(safe-area-inset-*)` na barra superior e na gaveta.
- Hover só com `@media (hover: hover) and (pointer: fine)`; sem `-webkit-tap-highlight-color`;
  `touch-action: manipulation` nos controles (sem atraso de toque); feedback no toque em ≤ 160ms.
- Nunca `user-scalable=no` / `maximum-scale=1`.
- Breakpoints: celular < 640px · tablet 640–1023px · desktop ≥ 1024px.

## 7. Estados: carregando, vazio, erro, desatualizado (skill `break-ui`)

Os quatro estados usam o **mesmo componente de moldura** do conteúdo que substituem (mesmo card, mesma altura), para
nada "pular" nem desalinhar a grade.

- **Carregando (skeleton):** blocos com a forma final (KPI: rótulo + número; gráfico: eixo + barras; mapa: retângulo
  com o contorno do painel; tabela: 5 linhas). Cor `hairline` (claro) / `dark-hairline` (escuro), `animate-pulse`.
  Aparece **só no carregamento inicial e no Atualizar** — filtrar é instantâneo (dados já no navegador) e não pisca.
  Com `prefers-reduced-motion`, o bloco fica parado. `aria-busy="true"` no container.
- **Vazio ("nenhum dado encontrado"):** ícone discreto, frase do que aconteceu ("Nenhum serviço com esses filtros"),
  e uma ação ("Limpar filtros"). Dentro do mesmo card, centralizado, mesma altura do gráfico/tabela. KPI vazio mostra
  "0" ou "—" (nunca "NaN", "undefined" ou "Infinity").
- **Erro:** mesmo formato do vazio, com o motivo em linguagem simples ("Não foi possível carregar os dados") e
  "Tentar de novo". Supabase pausado/fora do ar cai aqui, nunca numa tela branca.
- **Dados desatualizados:** faixa discreta abaixo da barra superior quando a última carga tiver mais de 2 dias
  ("Dados de 09/10/2026, 18:42"), cor neutra, sem alarme.
- Dados extremos que o layout precisa aguentar (testar com a skill `break-ui`): bairro com nome longo, vereador sem
  foto, contagem com 5+ dígitos, lista com 1 item, mês sem nenhuma saída, região sem abertos.

## 8. Tabela ↔ mapa

- Selecionar **região, bairro, categoria ou situação** (em lista, legenda, barra de gráfico ou linha) aplica o filtro
  e o mapa **reenquadra** nos pontos resultantes. Selecionar **um serviço** (ex.: "mais antigos em atraso") centraliza
  e destaca o pino, abrindo o popup.
- Seleção é estado da URL (seção 5) e tem caminho de volta claro (chip "× Bairro: Fonseca" na barra de filtros).
- Movimento do mapa: `flyTo` curto (≤ 600ms, `ease-in-out`); com movimento reduzido, salto direto.
- Parte pública: o popup mostra categoria revisada, situação, datas, origem. Parte logada: + descrição e endereço.

## 9. Movimento (skill `emil-design-eng`)

- Painel profissional = rápido e discreto. Tudo de interface < 300ms, curvas do cabeçalho (`motion`), nunca `ease-in`.
- Animar só `transform` e `opacity`; nunca `transition: all`.
- Botões e itens tocáveis: `scale(0.97)` no `:active` (140ms).
- Gaveta e popover entram com `opacity` + `scale(0.95)`/`translateY`, nunca de `scale(0)`; popover nasce do gatilho.
- Nada animado em ação repetida (troca de filtro, navegação por teclado): o dado só aparece.
- `prefers-reduced-motion`: sem deslocamento; mantém só transições de opacidade/cor.

## 10. Não fazer

- Degradê decorativo, sombra em texto, segunda cor de ação.
- Cor de status como cor de série, ou cor de série em texto.
- Gráfico de dois eixos Y; arco-íris em escala de magnitude.
- Skeleton em toda troca de filtro; tela branca em erro; "NaN"/"undefined" na tela.
- Texto abaixo de 12px; campo abaixo de 16px; alvo de toque abaixo de 44px.
- Esconder o mapa no celular.
