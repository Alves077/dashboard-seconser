// Precisou voltar à rua (retrabalho): serviço executado que teve nova saída no período — a primeira
// ida não resolveu. Em cima, o tamanho do problema; à esquerda, onde acontece (categoria); à direita,
// quais serviços (abrem a ficha). Numerador e denominador em serviços.
import { clsx } from 'clsx'
import { ArrowRight, ChevronRight, Zap } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { EstadoVazio } from '@/componentes/estados/Estados'
import { Card, CabecalhoCard } from '@/componentes/ui/Card'
import { SeloSituacao } from '@/componentes/ui/SeloSituacao'
import { ehRisco, MINIMO_REABERTURA, situacaoAtual, VOLTA_RAPIDA_DIAS, type Prazo } from '@/calculos/prazo'
import type { Saida } from '@/dados/tipos'
import { useFiltros } from '@/filtros/useFiltros'
import { formatarDiaCurto } from '@/lib/datas'
import { decimal, numero, pctCurto } from '@/lib/formato'
import { useFicha, useHoje } from '@/lib/ganchos'

function Fato({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-ink-3">{rotulo}</dt>
      <dd className="mt-0.5 text-[13px] text-ink-2">{children}</dd>
    </div>
  )
}

const N = ({ children }: { children: ReactNode }) => <span className="numeros text-[15px] font-medium text-ink">{children}</span>

function PorCategoria({ r }: { r: Prazo['retrabalho'] }) {
  const { filtros, mudar } = useFiltros()
  const com = r.categorias.filter((l) => l.reabertos > 0 || l.nome === filtros.categoria)
  const sem = r.categorias.filter((l) => l.reabertos === 0 && l.nome !== filtros.categoria)
  // escala de no mínimo 10%: com taxas baixas (1–2%), a maior não pode parecer barra cheia
  const max = Math.max(10, ...com.map((l) => l.pct))
  return (
    <div className="min-w-0">
      <h3 className="px-2 pb-1 text-[13px] font-medium text-ink">Por categoria</h3>
      {com.length === 0 ? (
        <p className="px-2 py-3 text-[13px] text-ink-2">Nenhuma categoria com reabertura no período.</p>
      ) : (
        <ul>
          {com.map((l) => {
            const ativo = filtros.categoria === l.nome
            return (
              <li key={l.nome}>
                <button
                  type="button"
                  onClick={() => mudar({ categoria: ativo ? null : l.nome })}
                  aria-pressed={ativo}
                  className={clsx(
                    'grid min-h-12 w-full grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3.5rem] items-center gap-x-3 rounded-md px-2 py-1.5 text-left sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_3.5rem]',
                    ativo ? 'bg-acao-suave' : 'tocavel hover:bg-realce',
                  )}
                >
                  <span className="min-w-0">
                    <span className={clsx('flex items-start gap-1 text-[13px] leading-snug text-ink', ativo && 'font-medium')}>
                      {ehRisco(l.nome) && <Zap aria-hidden className="mt-0.5 size-3.5 shrink-0 text-risco-texto" />}
                      <span className="line-clamp-2">{l.nome}</span>
                    </span>
                    <span className="numeros block text-[11px] text-ink-3">
                      {numero(l.reabertos)} de {numero(l.servicos)} serviços
                    </span>
                  </span>
                  <span aria-hidden className="h-2.5 w-full rounded-full bg-line/60">
                    <span
                      className={clsx('block h-full rounded-full', ehRisco(l.nome) ? 'bg-risco' : 'bg-s7')}
                      style={{ width: `${l.pct > 0 ? Math.max((l.pct / max) * 100, 2) : 0}%` }}
                    />
                  </span>
                  <span className="numeros text-right text-[15px] font-medium text-ink">{decimal(l.pct)}%</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {(sem.length > 0 || r.poucas.length > 0) && (
        <div className="mt-2 flex flex-col gap-1 px-2 text-[11px] leading-relaxed text-ink-3">
          {sem.length > 0 && <p>Sem reabertura: {sem.map((l) => `${l.nome} (${numero(l.servicos)})`).join(', ')}.</p>}
          {r.poucas.length > 0 && (
            <p>
              Com menos de {MINIMO_REABERTURA} serviços (fora da lista): {r.poucas.map((l) => `${l.nome} (${numero(l.reabertos)} de ${numero(l.servicos)})`).join(', ')}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * A história inteira do serviço, em datas, até a situação de hoje: executado → voltou (+dias) →
 * refeito → voltou… → ainda na rua. Só o último passo tem cor (é ele que bate com o selo); mostrar
 * só a volta do período enganava quando o serviço voltou de novo depois e está aberto.
 */
function Historia({ saidas }: { saidas: Saida[] }) {
  const passos: { texto: string; extra?: string; ultimo?: 'ok' | 'aberto' }[] = []
  saidas.forEach((s, i) => {
    const fim = i === saidas.length - 1
    if (i > 0) {
      const antes = saidas[i - 1].dataRetorno
      passos.push({ texto: `voltou ${formatarDiaCurto(s.dataSaida)}`, extra: antes !== null ? `(+${numero(s.dataSaida - antes)} d)` : undefined })
    }
    if (s.dataRetorno === null) passos.push({ texto: i === 0 ? `saiu ${formatarDiaCurto(s.dataSaida)} · na rua` : 'ainda na rua', ultimo: 'aberto' })
    else passos.push({ texto: `${i === 0 ? 'executado' : 'refeito'} ${formatarDiaCurto(s.dataRetorno)}`, ultimo: fim ? 'ok' : undefined })
  })
  return (
    <span className="numeros mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-2">
      {passos.map((p, i) => (
        <span key={i} className="flex items-center gap-x-1.5">
          {i > 0 && <ArrowRight aria-hidden className="size-3 text-ink-3" />}
          <span className={clsx(p.ultimo === 'ok' && 'text-ok-texto', p.ultimo === 'aberto' && 'font-medium text-atraso-texto')}>
            {p.texto}
            {p.extra && <span className="text-ink-3"> {p.extra}</span>}
          </span>
        </span>
      ))}
    </span>
  )
}

function QuaisVoltaram({ r }: { r: Prazo['retrabalho'] }) {
  const { abrir } = useFicha()
  const hoje = useHoje()
  const [mais, setMais] = useState(false)
  const lista = r.voltaram.slice(0, mais ? 20 : 6)
  return (
    <div className="min-w-0">
      <h3 className="px-2 pb-1 text-[13px] font-medium text-ink">Quais voltaram</h3>
      <ul className="divide-y divide-line border-y border-line">
        {lista.map(({ servico, idas }) => (
          <li key={servico.chave}>
            <button
              type="button"
              onClick={() => abrir(servico.chave)}
              className="group flex min-h-14 w-full items-center gap-3 px-2 py-2 text-left tocavel hover:bg-realce"
            >
              {/* quantas idas à rua: o número que importa aqui */}
              <span className="flex w-11 shrink-0 flex-col items-center rounded-md bg-s7/10 py-1 text-s7">
                <span className="numeros text-[15px] leading-none font-semibold">{idas}ª</span>
                <span className="mt-0.5 text-[10px] leading-none">ida</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="numeros text-[13px] font-medium text-ink">{servico.idColab}</span>
                  <span className="truncate text-[13px] text-ink">{servico.categoria ?? 'Sem categoria'}</span>
                </span>
                <span className="block truncate text-xs text-ink-3">{servico.bairro}</span>
                <Historia saidas={servico.saidas} />
              </span>
              <SeloSituacao situacao={situacaoAtual(servico, hoje)} className="max-sm:hidden" />
              <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>
          </li>
        ))}
      </ul>
      {r.voltaram.length > 6 && (
        <button
          type="button"
          onClick={() => setMais((v) => !v)}
          className="h-10 w-full text-[13px] font-medium text-acao tocavel hover:bg-realce"
        >
          {mais ? 'Mostrar menos' : `Mostrar mais (${numero(Math.min(r.voltaram.length, 20) - 6)})`}
        </button>
      )}
    </div>
  )
}

export function Retrabalho({ r }: { r: Prazo['retrabalho'] }) {
  const tresOuMais = r.voltaram.filter((v) => v.idas >= 3).length
  return (
    <Card aria-labelledby="titulo-retrabalho">
      <CabecalhoCard
        id="titulo-retrabalho"
        titulo="Precisou voltar à rua"
        subtitulo="Serviço já executado que teve nova saída no período (reabertura): a primeira ida não resolveu."
      />
      {r.servicos === 0 ? (
        <EstadoVazio titulo="Nada no período" texto="Nenhuma saída com esses filtros neste período." altura="min-h-40" />
      ) : (
        <>
          <dl className="mx-5 mt-3 flex flex-wrap items-end gap-x-10 gap-y-3 border-b border-line pb-4">
            <div>
              <dt className="sr-only">Parte dos serviços que precisaram voltar</dt>
              <dd className="numeros text-[40px] leading-none font-light tracking-[-0.8px] text-ink">
                {decimal(r.pct)}
                <span className="ml-0.5 text-lg text-ink-2">%</span>
              </dd>
              <dd className="mt-1.5 text-xs text-ink-2">
                <span className="numeros">{numero(r.reabertos)}</span> de <span className="numeros">{numero(r.servicos)}</span> serviços do período
              </dd>
            </div>
            {r.comIntervalo > 0 && (
              <Fato rotulo={`Voltaram em até ${VOLTA_RAPIDA_DIAS} dias da execução`}>
                <N>{numero(r.rapidas)}</N> ({pctCurto(r.rapidas, r.comIntervalo)})
              </Fato>
            )}
            {tresOuMais > 0 && (
              <Fato rotulo="Com 3 idas à rua ou mais">
                <N>{numero(tresOuMais)}</N> ({pctCurto(tresOuMais, r.voltaram.length)})
              </Fato>
            )}
          </dl>
          {r.reabertos === 0 ? (
            <EstadoVazio titulo="Nenhuma reabertura" texto="Nenhum serviço precisou de nova saída neste período." altura="min-h-32" />
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 px-3 pt-4 pb-3 lg:grid-cols-2">
              <PorCategoria r={r} />
              <QuaisVoltaram r={r} />
            </div>
          )}
        </>
      )}
    </Card>
  )
}
