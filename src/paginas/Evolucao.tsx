// Evolução — "Está melhorando ou piorando?". Dentro do período escolhido (cortado no último dia com
// dado), em blocos que acompanham o tamanho dele (dia, ~7 dias ou mês): o que entrou × o que foi
// executado com a fila ao fundo; tempo médio e % no prazo ao longo do tempo; onde a fila cresceu;
// e o que mudou nas categorias.
import { useMemo, type ReactNode } from 'react'
import { EstadoErro, Esqueleto } from '@/componentes/estados/Estados'
import { Card } from '@/componentes/ui/Card'
import { calcularEvolucao, type Evolucao as Dados } from '@/calculos/evolucao'
import { useBase } from '@/dados/consultas'
import type { Periodo } from '@/filtros/filtros'
import { fraseQuando, rotuloComparacao } from '@/filtros/frases'
import { useFiltros } from '@/filtros/useFiltros'
import { formatarDiaCurto } from '@/lib/datas'
import { numero } from '@/lib/formato'
import { useHoje } from '@/lib/ganchos'
import { Categorias } from './evolucao/Categorias'
import { Fluxo, NoPrazo, Tempo } from './evolucao/Graficos'
import { Indicadores } from './evolucao/Indicadores'
import { Saldos } from './evolucao/Saldos'

const B = ({ children }: { children: ReactNode }) => <strong className="font-medium text-ink">{children}</strong>
const POR = { dia: 'por dia', semana: 'em blocos de 7 dias', mes: 'por mês' } as const

// Frase de abertura (revista 17/10/2026): "entraram" é o mesmo número que o Panorama chama de "saíram para a
// rua" (dito junto), e os executados contam também quem tinha saído antes do período — dito, para ninguém ler
// "809 executados dos 650 que entraram".
function Resumo({ e, periodo }: { e: Dados; periodo: Periodo }) {
  const { total } = e
  const quando = fraseQuando(periodo, e.periodo, e.de)
  const inicio = total.filaInicio
  return (
    <p className="text-[15px] leading-relaxed text-ink-2">
      {quando}, entraram na fila <B>{numero(total.entraram)}</B> (saídas para a rua) e foram executados <B>{numero(total.executados)}</B>
      {inicio !== null && total.executados > 0 && ', contando os que tinham entrado antes'}
      {inicio === null ? (
        <>
          ; seguem em aberto <B>{numero(total.filaFim)}</B>.
        </>
      ) : total.filaFim === inicio ? (
        <>: a fila ficou igual, em {numero(total.filaFim)}.</>
      ) : (
        <>
          : a fila {total.filaFim > inicio ? 'cresceu' : 'diminuiu'} <B>{numero(Math.abs(total.filaFim - inicio))}</B>, de {numero(inicio)} para{' '}
          {numero(total.filaFim)}.
        </>
      )}
    </p>
  )
}

function Carregando() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="px-5 py-4">
            <Esqueleto className="h-3 w-24" />
            <Esqueleto className="mt-3 h-8 w-20" />
            <Esqueleto className="mt-3 h-3 w-full" />
            <Esqueleto className="mt-4 h-7 w-full" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <Esqueleto className="h-4 w-56" />
        <Esqueleto className="mt-2 h-3 w-72 max-w-full" />
        <Esqueleto className="mt-5 h-60 w-full" />
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i} className="p-5">
            <Esqueleto className="h-4 w-48" />
            <Esqueleto className="mt-5 h-48 w-full" />
          </Card>
        ))}
      </div>
    </div>
  )
}

export function Evolucao() {
  const { data: base, isLoading, error, refetch } = useBase()
  const { filtros } = useFiltros()
  const hoje = useHoje()
  const e = useMemo(() => (base ? calcularEvolucao(base, filtros, hoje) : null), [base, filtros, hoje])
  const escopo = [filtros.bairro ?? filtros.regiao, filtros.categoria, filtros.quem ?? filtros.origem].filter(Boolean).join(' · ')
  const comparacao = e ? rotuloComparacao(e.periodoAnterior) : null

  return (
    <>
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-normal tracking-[-0.4px] text-ink">Evolução</h1>
          {escopo && <span className="text-sm text-ink-2">{escopo}</span>}
        </div>
        <div className="mt-2">{e ? <Resumo e={e} periodo={filtros.periodo} /> : !error && <Esqueleto className="h-5 w-2/3" />}</div>
      </header>

      {error ? (
        <Card>
          <EstadoErro erro={error} aoTentar={() => refetch()} altura="min-h-72" />
        </Card>
      ) : isLoading || !e ? (
        <Carregando />
      ) : (
        <section aria-labelledby="titulo-periodo" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 id="titulo-periodo" className="text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">
              No período · {e.periodo.rotulo}
            </h2>
            <span className="text-xs text-ink-3">
              gráficos {POR[e.passo]}
              {e.cortadoPelaCarga && ` · dados até ${formatarDiaCurto(e.ultimoDia)} (última carga)`}
            </span>
          </div>
          <Indicadores e={e} comparacao={comparacao} />
          <Fluxo e={e} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Tempo e={e} />
            <NoPrazo e={e} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Saldos linhas={e.saldos} nivelBairro={e.nivelBairro} todo={e.todo} />
            <Categorias linhas={e.categorias} atual={{ de: e.de, ate: e.ate }} anterior={e.janelaAnterior} />
          </div>
        </section>
      )}
    </>
  )
}
