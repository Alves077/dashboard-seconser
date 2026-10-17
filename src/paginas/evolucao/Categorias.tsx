// Categorias: o que mudou. Tabela simples com as datas escritas: pedidos de cada categoria no período
// e nos mesmos dias logo antes, e a diferença. Ordenada pelo que mais mudou (em número, não em %).
// Percentual só quando os dois lados têm 10 ou mais — "3 para 5 = +66,7%" ao lado de "958 para 624"
// pesaria igual. Mais pedidos não é bom nem ruim: a diferença fica em tinta neutra, com ▲/▼.
// Em "todo o período" não há anterior: só a coluna do período.
import { clsx } from 'clsx'
import { Zap } from 'lucide-react'
import { EstadoVazio } from '@/componentes/estados/Estados'
import { Card, CabecalhoCard } from '@/componentes/ui/Card'
import type { LinhaCategoria } from '@/calculos/evolucao'
import { CATEGORIA_RISCO } from '@/dados/regras'
import { useFiltros } from '@/filtros/useFiltros'
import { formatarDiaCurto, partes, type Dia } from '@/lib/datas'
import { compararTexto, decimal, numero } from '@/lib/formato'

/** Abaixo disso, a variação sai só em número */
const MINIMO_PCT = 10

/** "13/09–09/10" (com o ano quando o intervalo não é todo no ano de referência); no celular, em 2 linhas */
function RotuloDias({ de, ate, anoRef }: { de: Dia; ate: Dia; anoRef: number }) {
  const mesmoAno = partes(de).ano === anoRef && partes(ate).ano === anoRef
  const f = (d: Dia) => (mesmoAno ? formatarDiaCurto(d) : `${formatarDiaCurto(d)}/${String(partes(d).ano).slice(2)}`)
  return (
    <>
      <span className="block sm:inline">{f(de)}–</span>
      <span>{f(ate)}</span>
    </>
  )
}

export function Categorias({
  linhas,
  atual,
  anterior,
}: {
  linhas: LinhaCategoria[]
  atual: { de: Dia; ate: Dia }
  anterior: { de: Dia; ate: Dia } | null
}) {
  const { filtros, mudar } = useFiltros()
  const anoRef = partes(atual.ate).ano
  const dif = (l: LinhaCategoria) => (l.anterior === null ? 0 : l.atual - l.anterior)
  const visiveis = linhas
    .filter((l) => l.atual > 0 || (l.anterior ?? 0) > 0 || l.nome === filtros.categoria)
    .sort((a, b) => Math.abs(dif(b)) - Math.abs(dif(a)) || b.atual - a.atual || compararTexto(a.nome, b.nome))

  return (
    <Card aria-labelledby="titulo-categorias-ev" className="flex flex-col">
      <CabecalhoCard
        id="titulo-categorias-ev"
        titulo="Categorias: o que mudou"
        subtitulo={
          anterior
            ? 'Pedidos de cada categoria no período e nos mesmos dias logo antes. O que mais mudou primeiro; toque para filtrar.'
            : 'Pedidos de cada categoria no período. Toque para filtrar.'
        }
      />
      <div className="flex flex-1 flex-col px-3 pt-2 pb-3">
        {visiveis.length === 0 ? (
          <EstadoVazio titulo="Nada no período" texto="Nenhum pedido com esses filtros." altura="min-h-40" />
        ) : (
          <table className="w-full border-separate border-spacing-0 text-[13px]">
            <caption className="sr-only">Pedidos por categoria no período{anterior ? ' e nos mesmos dias logo antes' : ''}</caption>
            <thead>
              <tr className="text-[11px] text-ink-3">
                <th scope="col" className="py-2 pl-2 text-left font-medium tracking-[0.4px] uppercase">
                  Categoria
                </th>
                <th scope="col" className="numeros px-1.5 py-2 text-right font-medium whitespace-nowrap sm:px-2">
                  {anterior ? <RotuloDias de={atual.de} ate={atual.ate} anoRef={anoRef} /> : 'No período'}
                </th>
                {anterior && (
                  <>
                    <th scope="col" className="numeros px-1.5 py-2 text-right font-medium whitespace-nowrap sm:px-2">
                      <RotuloDias de={anterior.de} ate={anterior.ate} anoRef={anoRef} />
                    </th>
                    <th scope="col" className="py-2 pr-2 pl-1.5 text-right font-medium sm:pl-2">
                      <span className="sm:hidden" aria-hidden>
                        Dif.
                      </span>
                      <span className="max-sm:sr-only">Diferença</span>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="numeros">
              {visiveis.map((l) => {
                const ativo = filtros.categoria === l.nome
                const d = dif(l)
                const pct = l.anterior !== null && l.anterior >= MINIMO_PCT && l.atual >= MINIMO_PCT ? (d / l.anterior) * 100 : null
                const celula = clsx('border-t border-line py-2', ativo ? 'bg-acao-suave' : 'group-hover:bg-realce')
                const alternar = () => mudar({ categoria: ativo ? null : l.nome })
                return (
                  <tr key={l.nome} onClick={alternar} className="group cursor-pointer">
                    <th scope="row" className={clsx(celula, 'pr-2 pl-2 text-left font-normal')}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          alternar()
                        }}
                        aria-pressed={ativo}
                        className={clsx('flex items-start gap-1 text-left leading-snug text-ink', ativo && 'font-medium')}
                      >
                        {l.nome === CATEGORIA_RISCO && <Zap aria-hidden className="mt-0.5 size-3.5 shrink-0 text-risco-texto" />}
                        <span className="line-clamp-2">{l.nome}</span>
                      </button>
                    </th>
                    <td className={clsx(celula, 'px-1.5 text-right font-medium text-ink sm:px-2')}>{numero(l.atual)}</td>
                    {l.anterior !== null && (
                      <>
                        <td className={clsx(celula, 'px-1.5 text-right text-ink-2 sm:px-2')}>{numero(l.anterior)}</td>
                        <td className={clsx(celula, 'pr-2 pl-1.5 text-right whitespace-nowrap sm:pl-2')}>
                          {d === 0 ? (
                            <span className="text-ink-3">igual</span>
                          ) : (
                            <>
                              <span className="text-ink">
                                {d > 0 ? '▲' : '▼'} {numero(Math.abs(d))}
                              </span>
                              {pct !== null && (
                                <span className="block text-[11px] text-ink-3 sm:ml-1 sm:inline">
                                  ({d > 0 ? '+' : '−'}
                                  {decimal(Math.abs(pct))}%)
                                </span>
                              )}
                            </>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {anterior && (
          <p className="mt-auto px-2 pt-3 text-[11px] text-ink-3">Percentual só quando os dois períodos têm {MINIMO_PCT} pedidos ou mais.</p>
        )}
      </div>
    </Card>
  )
}
