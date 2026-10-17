// NO PERÍODO — 4 indicadores (2×2 no celular, 4 numa linha no computador), cada um com a
// comparação com o período anterior e a tendência dos últimos 13 meses.
import { Indicador } from '@/componentes/ui/Indicador'
import { desdeProvisorio } from '@/componentes/graficos/MiniLinha'
import { mesesDoPeriodo } from '@/filtros/filtros'
import type { Indicadores as CalcIndicadores, Panorama } from '@/calculos/panorama'
import { partesDoPrazo } from './FrasePrazo'
import { decimal, enxuto, numero, pctCurto } from '@/lib/formato'
import { rotuloMes } from '@/lib/datas'

/** "provisório: 57% ainda em aberto" na nota do tempo médio */
const provisorio = (i: { abertas: number; saidas: number; provisorio: boolean }) =>
  i.provisorio ? ` · provisório: ${pctCurto(i.abertas, i.saidas)} ainda em aberto` : ''

/** No prazo: as mesmas partes da frase de abertura ("64 a tempo · 495 fora · 91 ainda no prazo") — sem o 559 */
export const notaNoPrazo = (i: CalcIndicadores) => {
  const p = partesDoPrazo(i)
  return [
    `${numero(p.noPrazo)} ${p.noPrazo === 1 ? 'executado' : 'executados'} no prazo`,
    `${numero(p.fora)} ${p.fora === 1 ? 'passou' : 'passaram'} do prazo`,
    p.aindaNoPrazo > 0 && `${numero(p.aindaNoPrazo)} ainda no prazo`,
  ]
    .filter(Boolean)
    .join(' · ')
}

const variacao = (a: number | null, b: number | null) => (a === null || b === null || b === 0 ? null : ((a - b) / b) * 100)

export function Indicadores({ p, comparacao, porRetorno }: { p: Panorama; comparacao: string | null; porRetorno: boolean }) {
  const { atual, previo, serie } = p
  const parcial = serie.length > 0 && serie[serie.length - 1].parcial
  const destaque = mesesDoPeriodo(serie.map((m) => m.mes), p.intervalo)
  const meses = serie.length ? `${rotuloMes(serie[0].mes)} a ${rotuloMes(serie[serie.length - 1].mes)}` : ''
  const desc = (o: string, f: (i: (typeof serie)[number]) => string) =>
    `${o} mês a mês, ${meses}: ${serie.map((m) => `${rotuloMes(m.mes)} ${f(m)}`).join('; ')}`

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Indicador
        rotulo={porRetorno ? 'Executadas' : 'Saídas para a rua'}
        valor={numero(atual.saidas)}
        nota={porRetorno ? 'serviços que voltaram no período' : 'idas à rua no período'}
        delta={variacao(atual.saidas, previo?.saidas ?? null)}
        deltaBom="neutro"
        comparacao={comparacao}
        serie={serie.map((m) => m.ind.saidas)}
        parcialNoFim={parcial}
        destaque={destaque}
        descricaoSerie={desc('Saídas', (m) => numero(m.ind.saidas))}
      />
      <Indicador
        rotulo="No prazo"
        valor={atual.pctNoPrazo === null ? '—' : decimal(atual.pctNoPrazo)}
        sufixo={atual.pctNoPrazo === null ? undefined : '%'}
        nota={notaNoPrazo(atual)}
        // percentual compara em pontos percentuais (como no Prazo e na Evolução), não em "% de %"
        delta={atual.pctNoPrazo === null || previo?.pctNoPrazo == null ? null : atual.pctNoPrazo - previo.pctNoPrazo}
        unidadeDelta="p.p."
        deltaBom="subir"
        comparacao={comparacao}
        serie={serie.map((m) => m.ind.pctNoPrazo)}
        parcialNoFim={parcial}
        destaque={destaque}
        descricaoSerie={desc('No prazo', (m) => (m.ind.pctNoPrazo === null ? 'sem dado' : `${decimal(m.ind.pctNoPrazo)}%`))}
      />
      <Indicador
        rotulo="Tempo médio"
        valor={decimal(atual.tempoMedio)}
        sufixo={atual.tempoMedio === null ? undefined : 'dias'}
        nota={atual.tempoMediano === null ? 'sem execução no período' : `mediana: ${enxuto(atual.tempoMediano)} ${atual.tempoMediano === 1 ? 'dia' : 'dias'}${provisorio(atual)}`}
        // provisório: comparar com o anterior enganaria (a média ainda vai subir)
        delta={atual.provisorio ? null : variacao(atual.tempoMedio, previo?.tempoMedio ?? null)}
        deltaBom="descer"
        comparacao={comparacao}
        serie={serie.map((m) => m.ind.tempoMedio)}
        parcialNoFim={parcial}
        provisorioDesde={desdeProvisorio(serie.map((m) => m.ind.provisorio))}
        destaque={destaque}
        descricaoSerie={desc('Tempo médio', (m) => (m.ind.tempoMedio === null ? 'sem dado' : `${decimal(m.ind.tempoMedio)} dias`))}
      />
      <Indicador
        rotulo="Reaberturas"
        valor={numero(atual.reaberturas)}
        nota={
          atual.pctReaberturas === null
            ? 'voltas a serviço já atendido'
            : `${decimal(atual.pctReaberturas)}% das saídas eram volta a serviço já atendido`
        }
        delta={variacao(atual.reaberturas, previo?.reaberturas ?? null)}
        deltaBom="descer"
        comparacao={comparacao}
        serie={serie.map((m) => m.ind.reaberturas)}
        parcialNoFim={parcial}
        destaque={destaque}
        descricaoSerie={desc('Reaberturas', (m) => numero(m.ind.reaberturas))}
      />
    </div>
  )
}
