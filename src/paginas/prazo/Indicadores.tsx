// 4 indicadores do Prazo (2×2 no celular, 4 numa linha no computador): no prazo, tempo médio,
// em atraso agora e precisou voltar. Cada um com a comparação e a tendência de 13 meses.
// Percentuais comparam em pontos percentuais; o atraso de agora compara com o fim do mês passado.
import { Indicador } from '@/componentes/ui/Indicador'
import { mesesDoPeriodo } from '@/filtros/filtros'
import type { Prazo } from '@/calculos/prazo'
import { rotuloMes } from '@/lib/datas'
import { decimal, enxuto, numero, pctCurto } from '@/lib/formato'

const variacao = (a: number | null, b: number | null) => (a === null || b === null || b === 0 ? null : ((a - b) / b) * 100)
const diferenca = (a: number | null, b: number | null | undefined) => (a === null || b === null || b === undefined ? null : a - b)

export function Indicadores({ p, comparacao }: { p: Prazo; comparacao: string | null }) {
  const { atual, previo, agora, retrabalho: r, serie } = p
  const parcial = serie.length > 0 && serie[serie.length - 1].parcial
  const destaque = mesesDoPeriodo(serie.map((m) => m.mes), p.intervalo)
  const meses = serie.length ? `${rotuloMes(serie[0].mes)} a ${rotuloMes(serie[serie.length - 1].mes)}` : ''
  const desc = (o: string, f: (m: (typeof serie)[number]) => string) =>
    `${o} mês a mês, ${meses}: ${serie.map((m) => `${rotuloMes(m.mes)} ${f(m)}`).join('; ')}`
  // atraso é foto do dia: compara com o fim do mês anterior
  const mesPassado = parcial && serie.length > 1 ? serie[serie.length - 2] : null

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Indicador
        rotulo="No prazo"
        valor={decimal(atual.pctNoPrazo)}
        sufixo={atual.pctNoPrazo === null ? undefined : '%'}
        nota={`${numero(atual.noPrazo)} de ${numero(atual.executadas)} executados`}
        delta={diferenca(atual.pctNoPrazo, previo?.pctNoPrazo)}
        unidadeDelta="p.p."
        deltaBom="subir"
        comparacao={comparacao}
        serie={serie.map((m) => m.pctNoPrazo)}
        parcialNoFim={parcial}
        destaque={destaque}
        descricaoSerie={desc('No prazo', (m) => (m.pctNoPrazo === null ? 'sem dado' : `${decimal(m.pctNoPrazo)}%`))}
      />
      <Indicador
        rotulo="Tempo médio"
        valor={decimal(atual.tempoMedio)}
        sufixo={atual.tempoMedio === null ? undefined : 'dias'}
        nota={atual.tempoMediano === null ? 'sem execução no período' : `mediana: ${enxuto(atual.tempoMediano)} ${atual.tempoMediano === 1 ? 'dia' : 'dias'}`}
        delta={variacao(atual.tempoMedio, previo?.tempoMedio ?? null)}
        deltaBom="descer"
        comparacao={comparacao}
        serie={serie.map((m) => m.tempoMedio)}
        parcialNoFim={parcial}
        destaque={destaque}
        descricaoSerie={desc('Tempo médio', (m) => (m.tempoMedio === null ? 'sem dado' : `${decimal(m.tempoMedio)} dias`))}
      />
      <Indicador
        rotulo="Em atraso agora"
        valor={numero(agora.atraso)}
        nota={
          agora.fila === 0
            ? 'fila zerada'
            : `${pctCurto(agora.atraso, agora.fila)} da fila · ${numero(agora.atrasoLongo)} com +30 dias`
        }
        delta={mesPassado ? variacao(agora.atraso, mesPassado.atraso) : null}
        deltaBom="descer"
        comparacao={mesPassado ? `fim de ${rotuloMes(mesPassado.mes)}` : null}
        serie={serie.map((m) => m.atraso)}
        parcialNoFim={parcial}
        descricaoSerie={desc('Em atraso no fim do mês', (m) => numero(m.atraso))}
      />
      <Indicador
        rotulo="Precisou voltar"
        valor={decimal(r.pct)}
        sufixo={r.pct === null ? undefined : '%'}
        nota={`${numero(r.reabertos)} de ${numero(r.servicos)} serviços com nova saída`}
        delta={diferenca(r.pct, r.previo?.pct)}
        unidadeDelta="p.p."
        deltaBom="descer"
        comparacao={comparacao}
        serie={serie.map((m) => m.pctReabertura)}
        parcialNoFim={parcial}
        destaque={destaque}
        descricaoSerie={desc('Reabertura', (m) => (m.pctReabertura === null ? 'sem dado' : `${decimal(m.pctReabertura)}%`))}
      />
    </div>
  )
}
