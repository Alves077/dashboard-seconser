// Indicador: rótulo, valor grande, uma nota do que o número é, a comparação com o período anterior
// (cor pelo sentido bom) e a tendência mês a mês. Usado no Panorama e no Prazo.
import { clsx } from 'clsx'
import { MiniLinha } from '@/componentes/graficos/MiniLinha'
import { Card } from '@/componentes/ui/Card'
import { decimal } from '@/lib/formato'

export function Indicador({
  rotulo,
  valor,
  sufixo,
  nota,
  delta,
  deltaBom,
  unidadeDelta = '%',
  comparacao,
  serie,
  parcialNoFim,
  destaque,
  descricaoSerie,
}: {
  rotulo: string
  valor: string
  sufixo?: string
  nota: string
  /** variação já calculada (em % ou em pontos percentuais, conforme `unidadeDelta`) */
  delta: number | null
  deltaBom: 'subir' | 'descer' | 'neutro'
  /** percentuais comparam em pontos percentuais ("p.p."), não em "% de %" */
  unidadeDelta?: '%' | 'p.p.'
  comparacao: string | null
  serie: (number | null)[]
  parcialNoFim: boolean
  /** meses do período escolhido, marcados na mini-linha (ver MiniLinha) */
  destaque?: boolean[]
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
        {sufixo && <span className={clsx('text-sm font-normal tracking-normal text-ink-2', sufixo === '%' ? 'ml-0.5' : 'ml-1')}>{sufixo}</span>}
      </p>
      <p className="mt-2 text-xs text-ink-2">{nota}</p>
      <p className={clsx('numeros mt-0.5 min-h-4 text-xs font-medium', tom)}>
        {delta !== null && comparacao && (
          <>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {decimal(Math.abs(delta))}
            {unidadeDelta === '%' ? '%' : ' p.p.'} <span className="font-normal text-ink-3">vs. {comparacao}</span>
          </>
        )}
      </p>
      <MiniLinha valores={serie} parcialNoFim={parcialNoFim} destaque={destaque} descricao={descricaoSerie} className="mt-auto pt-3" />
    </Card>
  )
}
