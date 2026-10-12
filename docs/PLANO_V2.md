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

- Projeto Vite 8 + React 19 + TS 6 na raiz da `v2`; site antigo em `legado/` (referência até a troca; sai depois).
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
