import { diasEmAberto, diasExecucao, emAberto, media, mediana, noPrazo, situacao, ultimaSaida } from '@/dados/regras'
import type { Saida, Servico } from '@/dados/tipos'
import { CATEGORIA_RISCO } from '@/dados/regras'
import type { Dia } from '@/lib/datas'

/** Fila de agora: serviços cuja saída mais recente ainda não voltou (independe do período) */
export function filaAtual(servicos: Servico[], hoje: Dia) {
  let abertos = 0
  let atraso = 0
  let risco = 0
  const lista: { servico: Servico; saida: Saida; dias: number }[] = []
  for (const s of servicos) {
    const u = ultimaSaida(s.saidas)
    if (!emAberto(u)) continue
    abertos++
    if (situacao(u, hoje) === 'atraso') atraso++
    if (s.categoria === CATEGORIA_RISCO) risco++
    lista.push({ servico: s, saida: u, dias: diasEmAberto(u, hoje) })
  }
  lista.sort((a, b) => b.dias - a.dias)
  return { abertos, atraso, risco, maisAntigos: lista }
}

/** Indicadores de um recorte de saídas (já filtradas por período/lugar) */
export function indicadoresPeriodo(saidas: Saida[]) {
  const execucoes: number[] = []
  let noPrazoN = 0
  for (const s of saidas) {
    const d = diasExecucao(s)
    if (d === null) continue
    execucoes.push(d)
    if (noPrazo(s)) noPrazoN++
  }
  return {
    saidas: saidas.length,
    concluidas: execucoes.length,
    noPrazo: noPrazoN,
    pctNoPrazo: execucoes.length ? (noPrazoN / execucoes.length) * 100 : null,
    tempoMedio: media(execucoes),
    tempoMediano: mediana(execucoes),
  }
}

/** Variação percentual com sinal; null quando não há base de comparação */
export function variacao(atual: number | null, anterior: number | null): number | null {
  if (atual === null || anterior === null || anterior === 0) return null
  return ((atual - anterior) / anterior) * 100
}
