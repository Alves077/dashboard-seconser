# Plano da v2 — leitura do site atual e proposta

12/10/2026. Base: leitura completa do site atual (index + render.js, mapa.html, qualidade.js, tendencia.js,
relatorio.js, utils.js, data.js). Visual: `DESIGN.md`. Dados: view `vw_servicos` do Supabase (mesmas colunas do
`base_csv/vw_servicos.csv` usado em desenvolvimento).

## 1. O que o site atual calcula (e precisa continuar batendo)

| Conceito | Regra atual | Na v2 |
|---|---|---|
| Linha | 1 linha = 1 **saída para a rua** (17.303), não 1 serviço (16.973) | mantém, mas nomeia: "saídas" ≠ "serviços" |
| Situação | retorno preenchido → OK; senão `saída + 5 dias < hoje` → Em Atraso; senão Em Atendimento | igual (dias corridos — ver dúvida D1) |
| Prazo | saída + 5 dias corridos | igual |
| Dias de execução | retorno − saída (só OK) | igual |
| Faixas | ≤3 · 4–7 · 8–15 · >15 dias (só OK) | igual |
| Reabertura | por ID: `Ocorrências > 1` → reaberto; eventos = Σ(ocorrências − 1) | igual, por `(id, type)` |
| Período | últimos N meses **fechados** (exclui o mês corrente) ou um mês específico | igual + mês corrente marcado como parcial |
| Tempo médio | média de dias dos OK; mediana = `sorted[floor(n/2)]` | média igual; mediana correta (par = média dos dois do meio) |
| Fluxo do mês (relatório) | fila no início + registrados − executados = fila no fim | igual — e sobe para a página principal |

## 2. Problemas do site atual que a v2 corrige

1. **Dois eixos Y** em 3 gráficos (Qualidade: tempo × cauda longa; Tendência: entradas/concluídos × saldo; Relatório:
   tempo × fora do prazo). Escalas diferentes no mesmo quadro enganam a leitura → dois gráficos alinhados.
2. **Mapa com um pino por saída:** serviço reaberto aparece 2–3 vezes no mesmo lugar (o antigo OK por baixo do aberto).
   → um pino por serviço, na situação da saída mais recente.
3. **Mapa escondido no celular** — justamente o uso de rua.
4. **Mês corrente** descartado por heurística (< 40% do anterior) em Qualidade/Tendência — some sem aviso. → mostra,
   marcado como "parcial" (traço/hachura + nota).
5. **Filtros diferentes em cada página** (Visão Geral: período+mês+região+categoria; Qualidade: período+categoria;
   Tendência: período+região+categoria; Mapa: região+categoria) e perdidos ao trocar de página. → filtro global na URL.
6. **Categoria do Colab** (85% numa opção só) → **categoria revisada** (11, ver dúvida D2).
7. **Rosca** de faixas de execução (ângulo é difícil de comparar) → barra 100% empilhada ou o histograma.
8. Taxas que misturam unidades (reabertura por categoria = IDs reabertos ÷ saídas). → numerador e denominador na mesma
   unidade (serviços).
9. "Atualizado HH:MM" mostra a hora do navegador, não a do dado. → data da última carga (`sincronizacoes`).

## 3. Arquitetura da informação proposta

Páginas organizadas pela **pergunta** do servidor, não pelo tipo de gráfico.

| Página | Pergunta | Conteúdo principal |
|---|---|---|
| **Panorama** (era Visão Geral) | Como estamos agora? | Fila em aberto (abertos, em atraso, risco elétrico) em destaque; no prazo e tempo médio; **fluxo do período** (fila início + entradas − execuções = fila fim, vindo do relatório); região (tabela compacta com mini-tendência); categorias revisadas; bairros |
| **Mapa** | Onde está o problema? | Mapa em primeiro plano, **abertos por padrão** (concluídos opcionais); painel com regiões/bairros/categorias/mais antigos — tudo clicável e filtrando/focando o mapa |
| **Prazo** (Qualidade + parte de Tendência) | Estamos atendendo bem? | % no prazo; histograma de dias; faixas por região (tabela de calor); reabertura por categoria; tempo médio e % fora do prazo mês a mês (dois gráficos) |
| **Evolução** (era Tendência) | Está melhorando ou piorando? | Entradas × execuções (mesmo eixo); fila acumulada (gráfico próprio); sazonalidade por categoria (calor, uma cor) |
| **Relatórios** | O que levo para reunião / para a rua? | Relatório mensal imprimível; **lista de campo** dos abertos (imprimível, coluna de retorno em branco para preencher à mão), agrupada por região → bairro, mais antigos primeiro |
| depois: **Vereadores**, **Origem** (filtro global), **Detalhe do serviço** (logado) | | |

Filtros globais (barra fixa, na URL, valem em todas as páginas): período · região · categoria · situação (e, depois,
origem). Cada página só esconde o que não se aplica.

## 4. Ordem de construção

1. Base: Vite + React + TS, Tailwind + tokens do DESIGN.md, Inter, tema claro/escuro, layout (barra superior,
   navegação, filtros na URL), camada de dados (CSV local em dev / Supabase em produção), estados
   (skeleton, vazio, erro, desatualizado).
2. Panorama → 3. Mapa → 4. Prazo → 5. Evolução → 6. Relatórios.
7. Conferência de números contra o site atual (mesmo recorte) e publicação.
8. Novas partes do roadmap (origem, vereadores, risco/LED, login com detalhe).

## 5. Decisões (12/10/2026)

- **Prazo: 5 dias corridos.** Categoria: **revisada** desde já (opção de ver a do Colab). Páginas da seção 3: aprovadas.

## 6. Acréscimos pedidos pelo usuário (12/10/2026)

### 6.1 Período mais flexível (filtro global)
- Atalhos: últimos 7 / 30 / 90 dias · este mês · mês anterior · trimestre · ano · todo o período; seletor de mês;
  **intervalo livre** (de / até, com calendário).
- **Contar por:** data de saída (padrão — quando foi para a rua) ou data de retorno (quando foi executado). Fica
  explícito no rótulo ("saídas entre 01/09 e 30/09").
- Comparação automática com o período anterior de mesmo tamanho (delta nos KPIs: "▲ 12% vs. ago").
- Mês corrente e intervalos que terminam hoje marcados como **parciais**.

### 6.2 Relatórios: três formatos
| Relatório | Para quê | Escopo |
|---|---|---|
| Mensal / período | reunião, prestação de contas | cidade toda ou região; qualquer período |
| **Abertos com gráficos** (versão web do `relatorio_abertos.py`, que hoje gera o PDF de 1 página) | entender a fila de uma área | cidade, **região ou bairro** |
| Lista de campo | levar para a rua | idem; coluna de retorno em branco |
Todos com visualização na tela e impressão A4 (`@media print`), 1 página quando possível.

### 6.3 Ficha do serviço (abre de qualquer lugar)
Painel lateral no desktop / folha de baixo no celular, aberto ao clicar num serviço (mapa, listas, busca, relatórios).
URL própria (`#/…?servico=508954-post`) — dá para mandar o link.
- **Público:** ID, categoria revisada, situação com dias em aberto, histórico de saídas (linha do tempo: saída →
  retorno, reaberturas), bairro/região, origem/vereador, LED, mini-mapa.
- **Logado (com acesso):** descrição tratada, endereço e local, **fotos**.
- Fotos: hoje **não** sobem para o Supabase. Proposta: tabela restrita `servico_fotos` (só a URL da imagem do Colab,
  nunca o arquivo), sincronizada do MySQL `fotos`. Antes: conferir se a URL do Colab abre sem login (se abrir, a
  URL em si é o segredo — por isso fica só na parte restrita). Fotos podem mostrar casas e pessoas.
- Comentários brutos **não** entram (têm nomes e telefones); o que importa deles já está na descrição tratada.

### 6.4 Busca
- Caixa de busca na barra superior (atalho `/` ou `Ctrl+K`, sem animação) + página **Busca** com lista + mapa dos
  resultados; cada resultado abre a Ficha.
- **Público:** por ID Colab, bairro, região. **Logado:** também por rua / endereço / ponto de referência
  (endereço é dado restrito).
- Busca por rua funciona já por texto aproximado (sem acento, sem "R."/"Rua"), mas **só fica confiável depois da
  normalização de ruas (item 3 do roadmap)** — até lá, a tela avisa que grafias diferentes da mesma rua podem
  aparecer separadas. Depois do item 3, resultados agrupados pela rua normalizada.
- Tudo no navegador (os ~17 mil serviços já estão carregados); endereços só depois do login.

### Impacto na ordem
O login e a Ficha passam para a fase 1 (base), porque Mapa, Busca e Relatórios dependem deles. A parte restrita
em desenvolvimento usa o CSV local; em produção, só depois da autorização.

## 7. Dúvidas em aberto

- Fotos (6.3): ok criar `servico_fotos` restrita? (exige migração no Supabase + sincronização da tabela `fotos`).

## 8. Estado (12/10/2026) — fase 1 (base) pronta

- Projeto Vite 8 + React 19 + TS 6 na raiz da `v2`; site antigo em `legado/` (referência até a troca; **removido da v2 em 13/10** — continua na branch `main`).
  Imagens em `public/img`. Bibliotecas: Tailwind 4, Base UI (diálogo/gaveta/popover/menu/toggle), cmdk (busca),
  Sonner (avisos), TanStack Query, supabase-js, Recharts, react-leaflet, Virtuoso, clsx/cva, Inter (fontsource).
- Rodar: `npm install`, copiar `.env.example` → `.env.local` (DADOS_LOCAIS = pasta do base_csv), `npm run dev` →
  http://localhost:5173/dashboard-seconser/ . Em dev lê o CSV local (restrito liberado, selo "Dados locais");
  `VITE_FONTE=supabase` testa contra o Supabase. Build de produção usa sempre o Supabase.
- Pronto: tema claro/escuro (tokens do DESIGN.md), barra superior + navegação inferior no celular, filtros globais
  na URL (período com atalhos/mês/intervalo e "contar por saída/retorno", região, bairro, categoria revisada,
  situação; gaveta no celular), camada de dados (CSV/Supabase, paginação ordenada), login (só entrar; acesso pela
  lista), Ficha do serviço (`?servico=`; linha do tempo, restrito com descrição/endereço/fotos), busca rápida
  (`/`, Ctrl+K), estados (skeleton, vazio, erro, desatualizado). Panorama provisório (KPIs + mais antigos).
- Conferido no navegador (retrato de 09/10): 17.303 saídas, 1.080 na fila, Ficha e filtros funcionando, celular ok.
- Anotado para a fase 2: atalhos de período em grade no celular; 5º KPI sozinho na linha do celular; selects
  estreitos cortando o texto; "Ver no mapa" cai em página em construção até a fase 3.

## 9. Fase 2 — Panorama (12/10/2026)

- Dois blocos com nome na tela: **Agora** (fila de hoje; respeita lugar/categoria/origem, não o período — o
  próprio card diz isso) e **No período** (período + "contar por" + situação).
- Agora: total da fila, em atraso, risco elétrico (botão que filtra a categoria), "há quanto tempo esperam"
  (barra única em 5 faixas, escala ordinal de uma cor validada nos dois temas) e "esperando há mais tempo"
  (5, expande para 15; abre a Ficha).
- No período: 4 indicadores (saídas · no prazo · tempo médio · **reaberturas** de volta), cada um com comparação
  ao período anterior (mês inteiro → "vs. ago/26") e mini-linha de 13 meses (mês corrente tracejado).
- **Movimento da fila** (do relatório antigo, agora para qualquer período): fila no início + saíram − executadas
  = fila no fim; diz quantas executadas tinham saído antes. Conferido: 726 + 1.191 − 631 = 1.286 (set/26).
- Regiões (tabela), O que mais se pede (categoria revisada), Bairros (alterna fila agora / no período; até 30),
  **Quem pede** (origem — novo). Toda linha vira filtro (toca de novo para tirar).
- Frase-resumo no topo ("Hoje há 1.080 serviços na fila… Em setembro saíram 1.191…").
- Filtros: **origem** virou filtro global; opções com contagem ("Norte · 238") e zero desabilitado; barra do
  computador numa linha só (69 px): período · região · bairro · categoria · "Mais filtros" (quem pediu + situação).
  Atalhos de período em 2 colunas no celular.
- Observação de dado: mesmo revisada, "Lâmpada apagada" é ~88% das saídas — o ganho da revisão está na cauda
  (risco elétrico, braço, implantação), que antes ficava escondida em "Iluminação pública irregular".

**Ajustes da revisão do usuário (12/10/2026):** faixa "dados desatualizados" removida (virou selo âmbar no
cabeçalho, visível também no celular); frase-resumo na largura toda; troca de filtro com crossfade de 160 ms
(View Transitions; cabeçalho, filtros e navegação ficam parados; sem animação com movimento reduzido); risco
elétrico com estado ativo claro ("Mostrando só risco elétrico · ver todas"); período enxuto (6 atalhos + grade de
meses com contagem dos outros filtros + intervalo personalizado recolhido + "contar pela data de"); listas de
região/bairro/categoria/origem próprias (Base UI Select: altura máxima, contagem em cinza, zero desabilitado,
bairros agrupados por região, escolher bairro acerta a região); no celular continuam os seletores do sistema.
Regiões com o mesmo destaque das listas e linha inteira clicável; cor de identidade fixa por região
(`lib/cores.ts`, paleta validada) em regiões, bairros e listas; categoria dominante (> 2× a segunda) separada
com fatia própria e as demais em escala própria; barra de risco na cor de risco; Movimento da fila como extrato
no celular e com ícones de significado. Build de produção ok (chunk principal ~300 kB gzip — dividir por rota
depois).

**12/10/2026 (fim da fase 2):** período padrão = **Últimos 30 dias** (não vai para a URL; "Todo o período" vira
`?periodo=tudo`). **Situação saiu dos filtros globais** (no Panorama só confundia: o "Agora" já é a fila e
"no prazo"/"tempo médio" só existem para o executado) — volta como controle próprio no Mapa e nos Relatórios.
"Quem pediu" foi direto para a barra. Ao mudar período/"contar por", a tela rola até "No período" se estiver
fora de vista. Colunas de quebras alinhadas no fim; "Esperando há mais tempo" com divisórias.

## 10. Fase 3 — Mapa (12/10/2026)

- **Um pino por serviço** (situação da saída mais recente), desenhado em canvas direto no Leaflet (até ~17 mil
  sem travar). Cor = situação; aro laranja = risco elétrico em aberto; dica ao passar o mouse; tocar abre a Ficha.
- **"Mostrar"** (controle da página, `?mostrar=`): Abertos (padrão, fila de hoje) · Em atraso · Executados no
  período (pela data de execução) · Todos do período. É onde a situação voltou depois de sair dos filtros globais.
- Filtros globais (região, bairro, categoria, origem) reenquadram o mapa; período só conta nos modos de período.
- **Painel clicável:** No mapa (total + situação + sem coordenada), Esperando há mais tempo (abre Ficha e voa até
  o pino, descontando a Ficha aberta), Regiões (cor de identidade), Bairros, Categorias. Tocar filtra; tocar de
  novo tira.
- Controles: Ver todos (reenquadra), **Perto de mim** (geolocalização, uso na rua), zoom com as cores do tema;
  legenda com contagem. Mapa visível no celular (58dvh, painel embaixo). Caixa de Niterói do site antigo
  descarta coordenada errada. Na página do Mapa a Ficha não mostra "Ver no mapa" e a barra não mostra a
  contagem de saídas.
- Frase do Panorama: "dos 275 já executados, 106 (38,7%) ficaram no prazo".
- Observação: com o servidor do usuário já aberto, a entrada de um componente novo do Base UI fez o Vite
  reorganizar as dependências e misturar duas cópias do React ("Invalid hook call") — recarregar a página resolve.

**Ajustes do Mapa (12/10/2026, revisão do usuário):** sem subtítulo; "Perto de mim" removido; "Ver todos" com
texto também no celular; "Mostrar" em grade 2×2 no celular. **Pinos empilhados:** serviços na MESMA coordenada
(Leste: 114 serviços em 59 lugares; cidade: 223 em 84 pontos) viram um pino com o número (cor = pior situação,
aro de risco), dica "Toque para escolher" e lista no popup (cada linha abre a Ficha). Enquadramento mais perto
(zoom fracionado 0,25, margem 16 px, até zoom 17). Computador: mapa e painel até o fim da janela, medido
(`useAlturaAteOFim`), sem rolagem sobrando. Grades com `grid-cols-1` (o conteúdo empurrava a coluna para fora da
tela no celular — também no Panorama). CSV local lido num Web Worker (`src/dados/leitorCsv.worker.ts`); a demora
no desenvolvimento é processar 5,5 MB de CSV + o servidor de dev, não o download (90 ms).
**"Ver no mapa" (12/10/2026):** o deslocamento do pino descontava a Ficha inteira (256 px), mas numa tela larga
ela cobre só ~95 px do mapa (o resto cobre o painel) → pino ia parar longe do centro. Agora desconta só o pedaço
coberto de fato (medido) e, ao chegar de outra página, abre direto no pino (sem voo longo desde o centro de
Niterói); voo só ao escolher outro serviço já no Mapa. ResizeObserver chama `invalidateSize` quando o espaço do
mapa muda. Conferido em 1440×900: pino a 1 px do centro da parte visível. `window.__mapa` exposto só em dev.

**Fundo do mapa (12/10/2026):** padrão = OpenStreetMap "suave" (o mesmo mapa com cores apagadas, `saturate(0.4)` — cinza total igualava mar e terra; filtro CSS
`.fundo-suave` em `estilos.css`; invertido no tema escuro) — os pinos de situação ficam com a cor só para eles e
todos os nomes de rua/bairro continuam. Botão "Mapa detalhado" (canto superior direito, lembrado no
`localStorage` `mapa-detalhado`) volta o OSM colorido. Componente único `src/mapa/FundoMapa.tsx` (Mapa e
MiniMapa da Ficha). CARTO Positron/Dark Matter foi testado e **descartado**: todo tile vem com marca d'água
"API KEY REQUIRED" (exige conta paga). Créditos: "Leaflet | © OpenStreetMap" (prefixo Leaflet mantido de
propósito: mostra a biblioteca). Também: o 1º enquadramento agora é sem animação de verdade (`animate: false`).

**Mapa no celular (12/10/2026):** sem "Mapa detalhado" (abaixo de 640 px de largura; o fundo é sempre o
suave). Enquadramento automático: Niterói inteira só cabe numa tela estreita em zoom fracionado (~11,25), que
estica as imagens (nomes borrados) e embola os pinos → zoom inteiro que cabe o miolo (sem os 5% mais afastados
de cada lado), centrado onde há mais pinos à vista (grade 11×11 de centros). 375 px: zoom 12, 878 de 941 pinos
à vista. "Ver todos" continua mostrando tudo. Computador: igual a antes (12,5; todos à vista). O botão do
fundo detalhado virou chave liga/desliga (`role="switch"`).

## Fase 4 — Prazo (12/10/2026, refeita após revisão do usuário)

"Estamos atendendo bem?" Prazo e dias só existem para quem **voltou** (executado); o atraso de agora é a fila de hoje.
1. **4 indicadores** (componente `Indicador` compartilhado com o Panorama): no prazo (Δ em p.p.), tempo médio
   ("metade em até"), **em atraso agora** (Δ vs. fim do mês anterior; mini-linha = atraso no fim de cada mês) e
   **precisou voltar** (Δ em p.p.). Mini-tendência de 13 meses em todos — substituiu os dois gráficos mensais
   (o usuário não viu função neles na página; tendência longa fica para a Evolução).
2. **Quantos dias levou:** histograma (0–15 dia a dia + 16–30 · 31–90 · > 90; cauda cortada no topo com o número
   quando passa do dobro da maior barra diária). Escolha **reversível e explicada** de quem entra na conta
   ("Executados no período" = tudo que voltou no período, mesmo o que saiu antes; "Saíram no período" = só os que
   saíram e já voltaram, com o número dos que ainda estão na rua). Muda o "contar por" global. Rodapé com 4 fatos.
3. **Em atraso agora, por região** (barra vermelha, % da fila, quantos com +30 d de atraso, o mais antigo) e
   **Quanto tempo levou, por região** (calor; faixas até 3 · 4–5 sob "No prazo" e 6–15 · 16–30 · > 30 sob "Fora do
   prazo", com ícone + texto). Com região escolhida, os dois mostram os bairros dela (botão "← Regiões").
4. **Precisou voltar à rua** (retrabalho, largura toda): taxa grande, "metade voltou em até N dias da execução",
   reincidentes (3+ idas); por categoria com barra colorida (`s7`; risco em laranja) e valor em destaque, escala
   mínima de 10%; **Quais voltaram** (nº da ida, quando voltou, quantos dias depois da execução, situação atual)
   abrindo a ficha.
- Bug corrigido: `sr-only` aplicado direto na `<table>` deixava a `<caption>` aparecer — agora num invólucro.
- Contexto dos números: a piora desde jun/26 é real (equipes no programa de LED, estoque, chuva). **Sem marco de
  LED nos gráficos** (decisão do usuário).
- **Ajustes da 2ª revisão (12/10):** menos texto, mais número + (%) — "mediana: N dias" no lugar de "metade em até"
  (também no Panorama), `pctCurto` (100% em vez de 100,0%); notas dos indicadores encurtadas; "%" colado ao
  valor. Em atraso por região em três andares (nome e número · barra · detalhe "135 (38%) com +30 dias de atraso ·
  mais antigo: 230 dias"), sem abreviação. Legenda do histograma centralizada no celular. Retrabalho: cada linha
  conta a história em datas (executado 29/09 → voltou 05/10 (+6 d) → refeito 06/10 / ainda na rua) e os fatos do
  topo contam serviços, na mesma unidade da taxa ("voltaram em até 7 dias": 3 (17,6%)).
- **3ª revisão (12/10):** "Quais voltaram" mostra a história INTEIRA do serviço até hoje (executado → voltou (+d) → refeito → … → ainda na rua), só o último passo colorido — a volta do período sozinha contradizia o selo quando o serviço voltou de novo depois. Tabela de calor nos bairros: todos aparecem (antes os de < 10 executados sumiam e a soma não fechava com a região), linha "Toda a região" no topo, e os de poucos casos num grupo no fim com a quantidade nas células em vez de %.

## Fase 5 — Evolução (12/10/2026)

"Está melhorando ou piorando?" Tudo dentro do período global, em intervalos que acompanham o tamanho dele:
até 62 dias **dia a dia**, até 190 **semana a semana** (segunda a domingo), acima disso **mês a mês**.
- O período termina no **último dia com dado** (data da última carga): sem isso, os dias depois da carga viravam
  "zero saídas"/"dias sem saída". Quando isso encurta o período, a comparação usa a mesma quantidade de dias logo
  antes, e o topo avisa "dados até 09/10 (última carga)".
- **4 indicadores** (mini-linha = a própria série do período): entraram, executados (a mais/a menos que as
  entradas), fila no fim (vs. início do período) e dias sem saída para a rua (e quantos sem execução).
- **Entraram e foram executados:** duas linhas no MESMO eixo (o antigo tinha dois eixos com o saldo).
- **Fila em aberto:** áreas empilhadas em atraso (vermelho) + dentro do prazo (âmbar), gráfico próprio.
- **A fila cresceu ou diminuiu:** saldo (entraram − executados = fila fim − início) por região com barra divergente
  (centro = zero), ▲/▼ + texto; com região escolhida, os bairros. Conferido: soma das regiões = total (+120 em 30 d).
- **Quando cada categoria aparece:** calor categoria × intervalo, cor relativa à própria categoria, número escrito,
  rolagem horizontal com o nome fixo.
- Componente novo `componentes/graficos/GraficoTempo.tsx` (linhas/empilhado, eixo único do zero, marcação e dica
  sincronizadas, último intervalo tracejado, tabela oculta) + `LegendaTempo`.
- Junto: favicon corrigido (o `index.html` repetia o base; o Vite já acrescenta), botões dos bairros do Panorama
  renomeados ("Em aberto hoje" / "Saíram no período"), cabeçalho dos cartões quebra a ação para baixo do título
  quando falta espaço.
- **Revisão da Evolução (12/10):** dia a dia virou serrote (fins de semana e dias sem despacho = zeros) → até 14 dias
  por dia; até 190 dias **blocos de ~7 dias de tamanho igual** cobrindo o período exato (30 dias = 4 blocos, sem
  semana de 1 dia na ponta); acima, mês a mês. Gráfico principal com **três séries no mesmo eixo**: entraram,
  executados (linhas) e a **fila/estoque** no fim de cada bloco (área cinza ao fundo) — nesses blocos os três ficam
  na mesma ordem de grandeza. Saíram: o gráfico empilhado da fila, o calor por categoria e "dias sem saída" (inflado
  pelos fins de semana). Entraram: **tempo médio até a execução** (com a linha do prazo) e **% no prazo** (0–100%)
  ao longo do tempo, e **"Categorias: o que mudou"** (barra = período, traço = anterior, escala de cada categoria).
  "Todo o período": sem fila no início nem comparação ("ficaram 1.080 em aberto"; cartão "Onde está a fila").
  Indicadores: entraram, executados, fila no fim, no prazo (p.p.). `GraficoTempo` agora aceita série em área,
  valores nulos (sem ponto), escala fixa e linha de referência.
- **"Categorias: o que mudou" virou tabela (12/10):** as barras com escala por categoria enganavam (Poste com 4 parecia maior que Lâmpada com 624). Agora: Categoria · período (datas escritas, ex. 13/09–09/10) · mesmos dias logo antes (17/08–12/09) · diferença (▲/▼ em número; % só quando os dois lados têm 10 ou mais). Ordem: o que mais mudou primeiro. Linha clicável filtra. No celular, datas em 2 linhas e "Dif.".

## Fase 6 — Relatórios (12/10/2026)

Três folhas A4 (na tela e na impressão; o navegador salva em PDF pelo botão "Imprimir ou salvar PDF"). Aba na URL
(`?relatorio=periodo|abertos|campo`). Valem os filtros globais. Na impressão: só a folha (barra, filtros e navegação
já tinham `print:hidden`), sempre em tema claro (`beforeprint`), `@page` A4 com 12 mm, seções e linhas sem quebrar
no meio, títulos nunca sozinhos no pé da página, cores das barras impressas (`print-color-adjust: exact`).
1. **Do período** (era o "Relatório Mensal", agora qualquer período): resumo (cada número com dono: saíram,
   desses já voltaram/no prazo, executados no período contando os que saíram antes, fila início→fim), 6 indicadores
   com comparação, movimento da fila (extrato no celular), tempo até a execução (barra empilhada nas faixas do Prazo),
   por região, por categoria, bairros com mais saídas, mais antigos em aberto e **observações** (caixa na tela, texto
   no papel; some na impressão se vazia; lembrada neste navegador por período e escopo).
2. **Em aberto** (versão web do `relatorio_abertos.py`): cidade (por região) ou região (por bairro); indicadores,
   há quanto tempo esperam, por lugar/categoria/origem e os 15 mais antigos (com endereço para quem tem acesso).
3. **Lista de campo**: região → bairro (alfabético) → mais antigos; colunas de retorno e obs. em branco; endereço e
   local para quem tem acesso (aviso + "Entrar" para quem não tem); "Todos em aberto / Só em atraso"; cada região
   começa numa página nova; cabeçalho da tabela repete a cada página.
- Conferido imprimindo de verdade (Chrome sem janela pelo protocolo de depuração): período em 2 páginas, abertos de
  Pendotiba em 2, lista de campo de Pendotiba (154 em atraso) em 6.
- **Revisão (12/10): o relatório 1 voltou a ser o do site antigo.** Aba "Mensal" com o seletor próprio "Mês de referência" (Histórico completo + meses fechados, abre no último fechado; `?mes=AAAAMM|tudo`; o período do filtro não vale nesta aba, região/bairro/categoria/origem valem). Duas versões, seção por seção como o `relatorio.js`: **mês** (indicadores do mês com "vs X em ago/26", movimento da fila com executados do mês × de antes, faixas ≤3/4–7/8–15/>15 dos concluídos, categoria, região com fora do prazo, bairros maior volume e maior backlog ≥15, observações) e **histórico completo** (contexto do último mês fechado, indicadores gerais, composição da fila em aberto com acima de 150 dias, últimos 3 meses com fila no fim, faixas, 8 categorias + "demais", região, bairros com backlog ≥50, evolução mensal em DOIS gráficos — o antigo tinha dois eixos — e os 8 mais antigos). Mesmas cores de célula do antigo (tempo médio >5 âmbar, >15 vermelho; fora do prazo ≥40 âmbar, ≥70 vermelho). Conferido contra o CSV pela lógica antiga (set/26: 1.191 · 511 · 680 · 30,7% · 10,8 d · fila 726→1.286 · 631 = 339+292 · reab. 10/11). Impressão: mês em 2 páginas, histórico em 3.
- **"Em aberto" igual ao PDF do `relatorio_abertos.py` (13/10):** unidade = saídas sem retorno; espera = dias desde o registro. Contexto ("Pendotiba concentra 154 dos 1.080… espera média… três bairros… por mês de registro"), 6 indicadores com a barrinha de cor (em aberto % da cidade, em atraso, espera média, acima de 30 dias, mais antigo "desde dd/mm/aaaa", institucionais), composição da fila com "dentro do prazo", por bairro (ou região, na cidade toda) com espera média (>15 âmbar, >30 vermelho), > 30 dias, mais antigo e linha de Total, categoria e origem (6 + "Demais"), linha de vereadores, os 10 mais antigos (8 na cidade) com endereço, origem (nome do vereador) e registro. Compacto (`.folha-compacta`): 1 página como o original. Também: folha na tela até 850 px e legendas das barras centralizadas.
- **Ajustes das tabelas (13/10):** cabeçalhos e números centralizados (1ª coluna e textos longos — endereço, categoria na lista de campo — à esquerda com o cabeçalho junto; bairro/categoria/origem curtos centralizados); cada tabela num cartão com borda (`SecaoFolha cartao` / `.cartao-folha`), como o PDF do script; sem a nota final do "Em aberto". Lista de campo sem "Obs.", "Saiu" → "Saída", endereço mantido (já agrupada por bairro). Número do serviço como pílula que abre a Ficha (`IdServico`) na lista de campo e nos "mais antigos"; no papel, só o número. Impressão: abertos de Pendotiba 1 página, mensal 2, lista de campo 6.

## Fase 7 — conferência (13/10/2026)



Feita: ver `docs/CONFERENCIA_V2.md`. Site antigo × v2 sobre o mesmo CSV (antigo alimentado pelo cache do navegador, sem rede): Visão Geral/Qualidade/Tendência/Relatório batem com Panorama/Prazo/Evolução/Mensal em tudo que mede a mesma coisa; diferenças só de definição (reaberturas no Panorama, abertos de hoje × do período, mês em curso, faixas, mediana). Corrigido: delta do "No prazo" do Panorama em p.p. Próximo: publicação (Actions + divisão do código por página).

**Divisão do código (13/10):** cada página é um arquivo à parte (`src/paginas/carregar.ts`, `React.lazy` + `Suspense` na Moldura com `EsqueletoPagina`); depois da 1ª página, as outras são baixadas quando o navegador fica ocioso — trocar de página continua instantâneo, e a anterior fica na tela até a nova chegar (sem esqueleto). Bibliotecas em arquivos próprios (`react`, `base-ui`, `supabase` — `vite.config.ts`), para ficarem no cache quando só o código do site muda; `papaparse` só baixa com a fonte CSV. Abertura: um arquivo de 1,09 MB (328 kB gzip) → ~290 kB gzip em 5–6 arquivos, sem o aviso de pacote grande; páginas de 1–11 kB gzip cada. Falta: workflow do GitHub Actions. Limpeza: saíram `recharts` e `react-virtuoso` (não usados), código morto (`bateSituacao`, `varRegiao`, `Comparacao`), o `legado/`, os prints e o Apps Script do site antigo (tudo segue na `main`); README reescrito para a v2. **Tema: abre sempre no claro**; escuro só pelo botão.

## Fase 8 — partes novas: plano (13/10/2026, revisto com o usuário)

**Decisões (13/10):** vereadores **públicos, com limites** (abaixo); **LED fica só no banco** por enquanto (repensar se a
chefia perguntar); a origem **não** ganha um 2º nível no seletor da barra (seriam ~60 opções) — o detalhe se escolhe
**tocando nas listas**, como região → bairros; fotos dos vereadores **baixadas e tratadas** (não o link da Câmara).
Fica para depois (item 3 dos dados, ruas): busca por rua confiável, reincidência por rua, pedidos de vereador fora da
planilha (4b). Risco elétrico já está feito.

Números do retrato de 09/10 (serviços): Cidadão 9.909 · Regional 5.156 (19 regionais; ARMISE 1.158, ARO 1.134, Rio do
Ouro 910…) · Vereador 1.044 (22 com nome; Binho 257, Rodrigo Farah 246, Renato Cariello 105, Fernanda Louback 103,
Pipico 94, Beto da Pipa 77, demais ≤ 13; 54 "Indicação (Câmara)" sem nome) · Associação 371 · Direção SECONSER 255 ·
Ouvidoria 189 · Prefeitura Móvel 29 · Secretaria 16 · Deputado 4.

### 8.1 Origem → "quem" tocando na lista
- No card **Quem pede** do Panorama: tocar numa origem troca a lista para os nomes dela (regionais, vereadores,
  associações…), como região → bairros; "← todas as origens" volta. Tocar num nome aplica o filtro **quem**.
- `quem` vai na URL (`?origem=Regional&quem=ARMISE`; vereador pelo id: `quem=v3`) e vale em todas as páginas, como o
  bairro. Na barra de filtros aparece como **etiqueta removível** (não como seletor). Trocar/limpar a origem limpa o quem.

**8.1 FEITO (13/10):** `quem` em `Filtros` (URL `quem`, só com origem; trocar/limpar a origem limpa o quem; etiqueta
removível na barra; títulos das páginas mostram o quem no lugar da origem). `quemDe` (`dados/regras.ts`): vereador
**pela pessoa** (não pelo tipo — ofício/indicação), `SEM_VEREADOR` = "Sem vereador identificado" (54); demais pelo
`origem_detalhe`; Cidadão sem 2º nível. Card "Quem pede" do Panorama: origem com ≥ 2 nomes abre a lista (10 primeiros
+ "Mostrar todos"), com "N na fila agora" e o escolhido marcado; "← Origens" volta. "← Origens" aparece com qualquer origem escolhida (também Cidadão, Ouvidoria…). Transição só no card
(View Transitions, `.vt-quem-*` em estilos.css): altura do card muda suave, lista sai e entra deslizando (entrar = da
direita, voltar = da esquerda); a página não desliza; sem intervalo vazio entre as listas. A marca de direção (`direcaoDaTroca`) só sai quando a
transição termina (`:active-view-transition`) — com tempo fixo de 500 ms ela sumia no meio (a troca calcula ~250 ms
antes de animar) e a lista antiga reaparecia. "Regional Centro e Ponta D'Areia" (563549) é real — fica. Conferido contra o CSV (Regional
5.186: ARMISE 1.158/fila 54, ARO 1.134/76…; Vereador 1.046: Binho 257/26, Rodrigo Farah 246/11…).

### 8.2 Página "Vereadores" (pública, `/vereadores`)
- Cartões com foto e nome (os 6 com mais pedidos grandes; os demais numa lista compacta; linha "Indicação da Câmara sem
  vereador identificado"). Tocar abre o **perfil**: pedidos no período e por mês (13 meses), situação dos pedidos
  (executados / em aberto), bairros e categorias, lista dos em aberto (pílula da Ficha) e "Ver no mapa" (filtro quem).
- **Limites (o sensível):** a página mostra **o que cada vereador pediu e em que pé está**, não "quem é atendido mais
  rápido". Sem tempo médio nem % no prazo por vereador, sem comparação entre vereadores, sem cores de bom/ruim; ordem
  por número de pedidos. Prazo é desempenho da SECONSER, e lado a lado por vereador seria lido como favorecimento.
  (O Prazo e a Evolução continuam aceitando o filtro, para uso interno quando alguém escolher de propósito.)
- **Fotos:** as do site da Câmara variam (130×140 a 360×390, JPEG com extensão .png, umas com moldura branca, rosto
  pequeno em algumas). Baixar uma vez, recortar cada uma à mão no rosto (mesma escala), salvar quadrada pequena (WebP)
  em `public/img/vereadores/<id>.webp`. Sem depender do site da Câmara (link pode mudar; cada visita não avisa a Câmara).
  Sem foto (Eduardo Paiva, Fael): iniciais. Vereador novo: foto nova à mão (anotar no `ROTINA_DIARIA`).

**Fotos FEITAS (13–14/10):** 22 fotos do site da Câmara recortadas no rosto, na mesma escala (topo da cabeça, queixo
e centro marcados à mão com grade de 5%; cabeça = 58% do quadrado; moldura branca descontada) → `public/img/vereadores/<id>.webp`
256×256, WebP 95% (~15 kB cada, ~330 kB no total, só baixam quando aparecem). Parâmetros em `docs/fotos-vereadores.json`;
refazer: `scripts/recortar-fotos-vereadores.mjs <pasta das originais>` (Chrome sem janela). 1ª versão tinha recortes
errados (Fernanda: queixo marcado em 48% da altura, era 60% → cabeça cortada) — remarcados. **Limite de qualidade:**
10 originais têm só 130×140 (Pipico, Emanuel Rocha, Fabiano, Leandro Portugal, Leonardo Giordano, Gallo, Cal, Prof. Tulio,
Beto da Pipa, Romério) — nítidas até ~64 px, suaves acima; a Câmara não publica versão maior (página só tem essa), o
siscam não tem foto e o TSE bloqueia acesso automático (403). `FotoVereador` (`componentes/ui`): foto pelo id; sem foto
(Eduardo Paiva, Fael) ou arquivo faltando (vereador novo) → iniciais; "Sem vereador identificado" → ícone da Câmara.
Já aparece na lista de vereadores do card Quem pede.

**8.2 Página FEITA (14/10):** `/vereadores` (menu: 5ª página, ícone da Câmara; no celular a barra de baixo vai a 6
itens). Cálculos em `calculos/vereadores.ts` (unidade = pedido/serviço; "no período" = com saída no período; em aberto =
fila de hoje; origem sempre Vereador, valem lugar e categoria). **Lista:** frase-resumo (pedidos, nº de vereadores, % de
todos os pedidos, em aberto), cartões com foto dos 6 com mais pedidos no período (pedidos, executados, em aberto hoje),
"Demais vereadores" (2 colunas no computador) e a linha "Sem vereador identificado"; nota de rodapé explicando que prazo
fica no Prazo/Evolução. **Perfil** = filtro global `origem=Vereador&quem=<nome>` (link compartilhável; "Ver no mapa"
leva o filtro): foto, "N pedidos desde mês/ano", 3 números num cartão (pedidos no período, já executados, em aberto
agora), pedidos por mês desde o começo da base (até 24 meses; com 13 meses a Fernanda — 99 dos 103 em jul–ago/25 —
sumia; escala só com inteiros), bairros e categorias (tocar filtra), em aberto hoje (mais antigos primeiro, abre a
Ficha). Sem tempo médio/% no prazo/cores de bom-ruim. Origem de outro tipo na URL → aviso "não vale aqui" com botão para
tirar. Conferido contra o CSV (1.044 pedidos, 82 em aberto, 6,2%; Binho 257/231/26, Rodrigo 246/235/11, Renato
105/91/14, Fernanda 103/103/0, Pipico 94/76/18, Beto 77/70/7). Testado celular/computador, claro/escuro.

**Ajustes do perfil (14/10, pedido do usuário):** onde = **regiões primeiro**, tocar abre os bairros da região ("← Regiões");
**indicações legislativas** (`origem_detalhe` = "Indicação legislativa": 350 no total, 332 com a tag 3067 do Colab — 18
só com o rótulo, anotados no checkpoint para conferir no trabalho); **tempo até a execução** (média das saídas executadas
no período + mediana; sem comparação nem cor — exceção pedida ao limite de 13/10, só no perfil); em aberto com o mesmo
selo de dias do Panorama (cor da situação, raio de risco; no celular o selo desce). 5 números num cartão (2 colunas no
celular). Conferido: Binho 196 indicações, 6,9 dias (mediana 2) em 231 execuções.

**Indicações em aberto e fotos (14/10):** indicação legislativa em aberto ganha destaque discreto (cor de ação, não de
alerta): resumo da lista ("82 em aberto, 48 deles indicações legislativas"), 3ª linha fixa nos cartões, "· N indicações"
nas linhas dos demais, nota do "Em aberto agora" no perfil, selo "Indicação legislativa" na lista de em aberto e opção
"Todos / Indicações" quando há dos dois tipos (Renato 14/3, Allan 3/1; Binho 26/26 e Pipico 18/18 não precisam).
`ehIndicacao` em `calculos/vereadores.ts`. Os 18 "Indicação legislativa" sem a tag 3067 têm a tag 367 "indicação" (a dos
"Indicação (Câmara)"; 367 ≠ 3067) — rótulo do tratamento errado. **RESOLVIDO no trabalho (14/10):** os 18 eram da época da troca de tags do Colab (ficaram com o vestígio da 367);
todos têm ofício/indicação na descrição, então receberam a tag 3067 no banco — as 350 legislativas agora batem com a tag. Fotos: círculo
neutro enquanto chegam e esmaecer de 200 ms (antes "pulavam"); cartões do topo carregam com prioridade.

**Filtros entre páginas (14/10, decisão do usuário):** continuam seguindo de uma página para outra (mesmo recorte em
todas; link e "Ver no mapa" dependem disso). Para não esquecer filtro ligado, o **celular agora mostra as etiquetas**
logo abaixo do botão "Filtros": uma linha só que rola para o lado (a barra é fixa; quebrando em linhas comeria a tela),
"Limpar tudo" primeiro, cada etiqueta com ×. Antes só aparecia "Filtros (n)".

**Ajustes de 14/10 (rodada do usuário):**
- **Mapa respeita o período em todos os modos.** Abertos/Em atraso = em aberto hoje que SAÍRAM para a rua no período
  (pela data de saída: em aberto não tem retorno); com "Todo o período", a fila inteira. Painel avisa "Só os que saíram
  no período… A fila toda tem N · Ver a fila toda"; sem nenhum no período, o vazio diz isso (não "fila zerada") e o
  botão leva à fila toda. Conferido: 30 dias = 506 (CSV). Os blocos "agora" (Panorama, Prazo, Vereadores) continuam fora
  do período — são retrato de hoje e dizem isso na tela.
- Créditos do mapa no escuro: o CSS do Leaflet (carregado depois) deixava o fundo branco com texto claro → regra com
  `.leaflet-container.mapa-tema`.
- Panorama, "Há quanto tempo esperam": cada faixa (barra e legenda) é tocável e mostra só ela na lista "Esperando…"
  (recorte do bloco, não filtro do site; "× Todas as faixas"); as outras esmaecem. Legenda no celular 3 + 2 em colunas;
  nota centralizada.
- **"Onde estão"** (Panorama, bloco Agora): com uma faixa de espera escolhida, as regiões com quantos daquela faixa
  (tocar abre os bairros da região, só ali; "← Regiões"); os bairros são só leitura (usuário, 14/10: filtrar dali
  embaralhava os filtros e não precisa — `LinhaBarra` sem `aoTocar` vira linha comum, não botão). Com região já
  filtrada, vai direto aos bairros. Computador: ao lado da lista; celular: acima. Responde "onde está a fila mais
  velha" (pedido do usuário: não havia referência disso). Conferido: 31–90 dias = 541 (Oceânica 176, Norte 125,
  Pendotiba 84, Praias 82, Leste 74; Leste → Rio do Ouro 33, Muriqui 27, Várzea das Moças 14).
- Mini-linhas dos indicadores (Panorama e Prazo): os meses do período escolhido ganham faixa de fundo e pontos
  (`mesesDoPeriodo`); sem marca em "todo o período" e no "Em atraso agora" (não depende do período). Evolução não
  precisa (a linha já é o período).
- Relatórios no celular: Lista de campo em cartões (nº com a Ficha, selo de dias, categoria, endereço, saída; retorno só
  no papel — imprimindo pelo celular sai a tabela); tabelas largas do Mensal/Em aberto rolam de lado (`Rolavel`) em vez
  de cortar; botões: celular = "Compartilhar" (janela nativa, link com aba/mês/filtros) + "PDF"; computador = "Imprimir
  ou salvar PDF" + "Copiar link". Impressão conferida: em aberto Pendotiba 1 pág., mensal 2, campo 6 (iguais a antes).
- Tabelas dos relatórios (2ª passada, 14/10): a 1ª versão da rolagem não rolava (item de grade não encolhe abaixo do
  conteúdo → `max-sm:min-w-0` na seção e nos itens; largura mínima da `Rolavel` só no celular: `max-sm:min-w-[…]`).
  Grades de 2 colunas na tela só a partir de `lg` (no tablet vazavam); no "Em aberto", tela = "por bairro" na largura
  toda e categoria + origem lado a lado (em 2 colunas vazavam da folha — já acontecia antes); papel sem mudança.
  Conferido por script em 390/418/700/900/1024/1440 (cada tabela cabe ou rola; nada vaza da folha; sem barra de
  rolagem no computador) e impressão (em aberto região 1 pág., cidade 1, mensal 2, histórico 3, campo 6).

**Hover e cursor (14/10):** hover era a tinta a 3% (no escuro quase invisível) → tokens por tema `realce`/`realce-forte`
(`bg-realce`, `hover:bg-realce`…) em todo o site; o que é clicável mostra a mãozinha (o Tailwind 4 tirou o
`cursor: pointer` dos botões). Legenda das faixas: cada item ocupa a sua coluna (tamanho de sempre) e o conteúdo fica centralizado dentro dele
(antes encostava à esquerda e sobrava espaço à direita).

**No prazo e tempo médio contando pela saída (14/10, decisão do usuário):** nos meses recentes muita coisa ainda está
em aberto (set/26: 57% dos 1.191) — o tempo médio só via os rápidos (a mini-linha "caía" quando o tempo sobe) e o "no
prazo entre os executados" deixava de fora os atrasados. Agora (`indicadores(saidas, hoje)` em `calculos/panorama.ts`):
- **No prazo** = em até 5 dias ÷ (executados + em aberto que já passaram do prazo). Set/26: 30,7% → **13,2%** (157 de
  1.191; 680 em aberto vencidos). Pelo retorno não muda (tudo já voltou). Vale no Panorama (KPI, frase, tabela de
  regiões), Prazo (KPI, frase, mini-linha) e Evolução (gráfico e KPI, que agora seguem o "Contar por").
- **Tempo médio** continua só dos executados, mas com **provisório** quando > 10% do período ainda está em aberto
  (`LIMIAR_PROVISORIO`): nota "provisório: 57% ainda em aberto", sem a comparação com o período anterior, e linhas
  tracejadas a partir do 1º mês provisório (mini-linhas e gráficos — `provisorioDesde`). Dica do gráfico: "N dos que
  saíram ainda em aberto — vai mudar".
- Evolução pela saída: os blocos são o mês em que saíram (antes era sempre o mês de execução; pelo retorno continua).
- **Relatório Mensal não muda** (fiel ao site antigo). Conferido contra o CSV: jun/26 19,4 d · 21,5%; jul 9,9 · 49,3%;
  ago 12,3 · 28,4%; set 10,8 · 13,2%; abr 4,9 · 74,7%.

### 8.3 Espaços públicos (praças, parques, campos) — depende dos dados
Hoje só **57** serviços têm `local` (o campo só é preenchido quando o serviço é *dentro* do lugar) e ele está na parte
**restrita** (`servicos_detalhe`). No texto, "praça" aparece em ~510 serviços, "quadra" em ~570 (mas muitas são
"lote/quadra"), "praia" em ~230 (inclui nomes de rua). Para virar recorte no site: **no trabalho**, classificar o tipo de
lugar (praça, parque, campo/quadra esportiva, praia/orla, escadaria, ciclovia) em mais serviços e levar `tipo_local` +
nome do lugar para a camada **pública** (nome de lugar não é dado pessoal). Depois, no site: recorte por tipo de lugar
(origem-like, tocando na lista) e camada no mapa.

### 8.4 Ordem
8.1 filtro quem → 8.2 fotos tratadas → cartões → perfil → conferência dos números contra o CSV (Python) → docs.
8.3 quando o dado existir. Cada etapa testada no celular e no computador, claro e escuro.
