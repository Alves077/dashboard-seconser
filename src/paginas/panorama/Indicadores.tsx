// NO PERÍODO — 4 indicadores (2×2 no celular, 4 numa linha no computador), cada um com a
// comparação com o período anterior e a tendência dos últimos 13 meses.
import { clsx } from 'clsx'
import { MiniLinha } from '@/componentes/graficos/MiniLinha'
import { Card } from '@/componentes/ui/Card'
import type { Panorama } from '@/calculos/panorama'
import { decimal, numero } from '@/lib/formato'
import { rotuloMes } from '@/lib/datas'

function Indicador({
  rotulo,
  valor,
  sufixo,
  nota,
  delta,
  deltaBom,
  comparacao,
  serie,
  parcialNoFim,
  descricaoSerie,
}: {
  rotulo: string
  valor: string
  sufixo?: string
  nota: string
  delta: number | null
  deltaBom: 'subir' | 'descer' | 'neutro'
  comparacao: string | null
  serie: (number | null)[]
  parcialNoFim: boolean
  descricaoSerie: string
}) {
  const tom =
    delta === null || deltaBom === 'neutro' || Math.abs(delta) < 0.05
      ? 'text-ink-2'
      : (deltaBom === 'subir') === delta > 0
        ? 'text-ok-texto'
        : 'text-atraso-texto'
  return (
    <Card className="flex flex-col px-5 pt-4 pb-3">
      <h3 className="text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">{rotulo}</h3>
      <p className="numeros mt-1.5 text-[30px] leading-none font-light tracking-[-0.6px] text-ink sm:text-[32px]">
        {valor}
        {sufixo && <span className="ml-1 text-sm font-normal tracking-normal text-ink-2">{sufixo}</span>}
      </p>
      <p className="mt-2 text-xs text-ink-2">{nota}</p>
      <p className={clsx('numeros mt-0.5 min-h-4 text-xs font-medium', tom)}>
        {delta !== null && comparacao && (
          <>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {decimal(Math.abs(delta))}%{' '}
            <span className="font-normal text-ink-3">vs. {comparacao}</span>
          </>
        )}
      </p>
      <MiniLinha valores={serie} parcialNoFim={parcialNoFim} descricao={descricaoSerie} className="mt-auto pt-3" />
    </Card>
  )
}

const variacao = (a: number | null, b: number | null) => (a === null || b === null || b === 0 ? null : ((a - b) / b) * 100)

export function Indicadores({ p, comparacao, porRetorno }: { p: Panorama; comparacao: string | null; porRetorno: boolean }) {
  const { atual, previo, serie } = p
  const parcial = serie.length > 0 && serie[serie.length - 1].parcial
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
        descricaoSerie={desc('Saídas', (m) => numero(m.ind.saidas))}
      />
      <Indicador
        rotulo="No prazo"
        valor={atual.pctNoPrazo === null ? '—' : decimal(atual.pctNoPrazo)}
        sufixo={atual.pctNoPrazo === null ? undefined : '%'}
        nota={`${numero(atual.noPrazo)} de ${numero(atual.executadas)} executadas em até 5 dias`}
        delta={variacao(atual.pctNoPrazo, previo?.pctNoPrazo ?? null)}
        deltaBom="subir"
        comparacao={comparacao}
        serie={serie.map((m) => m.ind.pctNoPrazo)}
        parcialNoFim={parcial}
        descricaoSerie={desc('No prazo', (m) => (m.ind.pctNoPrazo === null ? 'sem dado' : `${decimal(m.ind.pctNoPrazo)}%`))}
      />
      <Indicador
        rotulo="Tempo médio"
        valor={decimal(atual.tempoMedio)}
        sufixo={atual.tempoMedio === null ? undefined : 'dias'}
        nota={atual.tempoMediano === null ? 'sem execução no período' : `metade em até ${decimal(atual.tempoMediano)} dias`}
        delta={variacao(atual.tempoMedio, previo?.tempoMedio ?? null)}
        deltaBom="descer"
        comparacao={comparacao}
        serie={serie.map((m) => m.ind.tempoMedio)}
        parcialNoFim={parcial}
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
        descricaoSerie={desc('Reaberturas', (m) => numero(m.ind.reaberturas))}
      />
    </div>
  )
}
