// 4 indicadores da Evolução: entraram, executados, fila no fim (vs. o início do período) e % no prazo
// dos executados. A mini-linha de cada um é a própria série do período (dia, bloco de 7 dias ou mês).
// Em "todo o período" não há início nem anterior para comparar: sem variação.
import { Indicador } from '@/componentes/ui/Indicador'
import type { Evolucao } from '@/calculos/evolucao'
import { PRAZO_DIAS } from '@/config'
import { formatarDiaCurto } from '@/lib/datas'
import { decimal, numero } from '@/lib/formato'

const variacao = (a: number, b: number | null | undefined) => (b === null || b === undefined || b === 0 ? null : ((a - b) / b) * 100)

export function Indicadores({ e, comparacao }: { e: Evolucao; comparacao: string | null }) {
  const { total, anterior, pontos, blocos } = e
  const parcial = blocos.length > 0 && blocos[blocos.length - 1].parcial
  const desc = (o: string, f: (i: number) => string) => `${o}: ${blocos.map((b, i) => `${b.rotulo} ${f(i)}`).join('; ')}`
  const diferenca = total.executados - total.entraram

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Indicador
        rotulo="Entraram"
        valor={numero(total.entraram)}
        nota="saídas para a rua"
        delta={variacao(total.entraram, anterior?.entraram)}
        deltaBom="neutro"
        comparacao={comparacao}
        serie={pontos.map((p) => p.entraram)}
        parcialNoFim={parcial}
        descricaoSerie={desc('Entraram', (i) => numero(pontos[i].entraram))}
      />
      <Indicador
        rotulo="Executados"
        valor={numero(total.executados)}
        nota={diferenca === 0 ? 'o mesmo que entrou' : `${numero(Math.abs(diferenca))} a ${diferenca > 0 ? 'mais' : 'menos'} que as entradas`}
        delta={variacao(total.executados, anterior?.executados)}
        deltaBom="subir"
        comparacao={comparacao}
        serie={pontos.map((p) => p.executados)}
        parcialNoFim={parcial}
        descricaoSerie={desc('Executados', (i) => numero(pontos[i].executados))}
      />
      <Indicador
        rotulo="Fila no fim"
        valor={numero(total.filaFim)}
        nota={total.filaInicio === null ? `em aberto em ${formatarDiaCurto(e.ate)}` : `começou o período com ${numero(total.filaInicio)}`}
        delta={total.filaInicio === null ? null : variacao(total.filaFim, total.filaInicio)}
        deltaBom="descer"
        comparacao="início do período"
        serie={pontos.map((p) => p.fila)}
        parcialNoFim={parcial}
        descricaoSerie={desc('Fila no fim', (i) => numero(pontos[i].fila))}
      />
      <Indicador
        rotulo="No prazo"
        valor={decimal(total.pctNoPrazo)}
        sufixo={total.pctNoPrazo === null ? undefined : '%'}
        nota={`dos executados, em até ${PRAZO_DIAS} dias`}
        delta={total.pctNoPrazo === null || anterior?.pctNoPrazo == null ? null : total.pctNoPrazo - anterior.pctNoPrazo}
        unidadeDelta="p.p."
        deltaBom="subir"
        comparacao={comparacao}
        serie={pontos.map((p) => p.pctNoPrazo)}
        parcialNoFim={parcial}
        descricaoSerie={desc('No prazo', (i) => (pontos[i].pctNoPrazo === null ? 'sem dado' : `${decimal(pontos[i].pctNoPrazo)}%`))}
      />
    </div>
  )
}
