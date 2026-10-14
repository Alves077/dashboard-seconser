# Conferência dos números — site antigo × v2 (13/10/2026)

**Como foi feita:** os dois sites rodaram sobre o **mesmo dado** (retrato `vw_servicos.csv` de 09/10/2026,
17.303 saídas), na mesma data de referência (13/10). O site antigo (`legado/` na época; hoje só na branch `main`) foi servido localmente com o
cache do navegador (`localStorage['dip_csv_v2']`) pré-carregado com esse CSV convertido para as colunas da
planilha (categoria = **revisada**, a mesma da v2) — sem rede e sem mexer no código dele. Os números foram lidos
das páginas (texto e objetos dos gráficos do Chart.js) num Chrome sem janela, nos mesmos recortes.

## Resultado

| Página antiga → v2 | Recorte | O que foi comparado | Resultado |
|---|---|---|---|
| Visão Geral → Panorama | set/26, 3 meses fechados, tudo | entradas/saídas, concluídos, tempo médio, mediana, total e tempo médio por região | **igual** |
| Qualidade → Prazo | set/26, tudo | tempo médio, mediana, histograma dia a dia (0–15) e a cauda (>15 = soma das faixas da v2) | **igual** |
| Tendência → Evolução | tudo, mês a mês (15 meses) | entradas, concluídos, fila no fim do mês (saldo acumulado), tempo médio, % fora do prazo (complemento do % no prazo) | **igual** |
| Relatório (mês e histórico) → Relatórios · Mensal | set/26 e histórico completo | todas as seções: indicadores, movimento da fila, faixas, categoria, região, bairros (volume e backlog), últimos meses, evolução mensal, mais antigos | **igual, número por número** |

## Diferenças de definição (esperadas, não são erro)

1. **Reaberturas no Panorama:** a v2 conta as **saídas de reabertura dentro do período** (set/26: 9; todo o
   período: 330). A Visão Geral antiga conta os **serviços do período que têm mais de uma ida à rua em qualquer
   data** (set/26: 10 serviços, 11 eventos; todo o período: 287 serviços, 330 eventos — o total de eventos bate).
   O relatório Mensal da v2 mantém a definição antiga (10 / 11), como no site antigo.
2. **"Abertos" por região:** o antigo mostra os abertos **entre as saídas do período**; o Panorama da v2 mostra a
   **fila de hoje** ("Em aberto hoje"). O relatório Mensal da v2 mantém a definição antiga.
3. **% no prazo global da Tendência** (65,6% no antigo × 64,7% na v2): o antigo descarta sozinho o mês em curso
   quando ele tem menos de 40% do anterior (15.992 = 16.223 − 231 executados de outubro); a v2 mostra o mês em
   curso marcado como parcial (decisão do plano, §2 item 4).
4. **Faixas no Prazo:** a v2 usa faixas alinhadas ao prazo (até 3 · 4–5 · 6–15 · 16–30 · > 30); o histograma
   dia a dia bate com o antigo. O relatório Mensal usa as faixas antigas (≤3 · 4–7 · 8–15 · >15) — iguais.
5. **Mediana:** o antigo pega `sorted[floor(n/2)]` (errado em lista par); a v2 usa a mediana correta. Nos
   recortes conferidos o valor coincidiu (7, 6 e 3 dias).

## Corrigido durante a conferência

- Panorama: a variação do "No prazo" saía em % relativo ("▼ 19,6% vs. ago/26"); agora em pontos percentuais
  ("▼ 7,5 p.p."), como no Prazo, na Evolução e no relatório antigo ("vs 38,2% em ago/26").

## Fora da conferência

- **Mapa:** o antigo põe um pino por saída; a v2, um por serviço (decisão do plano, §2 item 2). O total de abertos
  (1.080) bate com o Panorama.
- Números que dependem do dado real no Supabase (carga ainda não feita) — conferir de novo após a 1ª carga.
