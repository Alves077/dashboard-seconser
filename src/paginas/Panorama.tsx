// Panorama — "Como estamos agora?". Dois blocos com nome: AGORA (fila de hoje, não depende do
// período) e NO PERÍODO (o que saiu/voltou no período escolhido). Toda quebra é clicável e vira filtro.
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { EstadoErro, Esqueleto } from '@/componentes/estados/Estados'
import { Card } from '@/componentes/ui/Card'
import { calcularPanorama, type Panorama as Dados } from '@/calculos/panorama'
import { useBase } from '@/dados/consultas'
import type { Intervalo, Periodo } from '@/filtros/filtros'
import { useFiltros } from '@/filtros/useFiltros'
import { chaveMes, fimDoMes, inicioDoMes, rotuloMes } from '@/lib/datas'
import { decimal, numero } from '@/lib/formato'
import { useHoje } from '@/lib/ganchos'
import { Agora } from './panorama/Agora'
import { Indicadores } from './panorama/Indicadores'
import { Movimento } from './panorama/Movimento'
import { Bairros, Categorias, Origens, Regioes } from './panorama/Quebras'

/** "ago/26" quando o período anterior é um mês inteiro; senão "período anterior" */
function rotuloComparacao(a: Intervalo | null): string | null {
  if (!a || a.de === null || a.ate === null) return null
  const mesInteiro = a.de === inicioDoMes(a.de) && a.ate === fimDoMes(a.de)
  return mesInteiro ? rotuloMes(chaveMes(a.de)) : 'período anterior'
}

/** "Nos últimos 30 dias", "Em setembro de 2026", "Neste ano"… (português natural, não "Em últimos 30 dias") */
function fraseQuando(p: Periodo, i: Intervalo, primeiraSaida: number | null): string {
  if (p.tipo === 'mes') return `Em ${i.rotulo}`
  if (p.tipo === 'intervalo') return `De ${i.rotulo}`
  switch (p.atalho) {
    case 'tudo':
      return `Desde ${primeiraSaida !== null ? rotuloMes(chaveMes(primeiraSaida)) : 'o início'}`
    case '7d':
    case '30d':
    case '90d':
      return `Nos últimos ${parseInt(p.atalho)} dias`
    case '3m':
    case '6m':
    case '12m':
      return `Nos últimos ${parseInt(p.atalho)} meses fechados`
    case 'este-mes':
      return 'Neste mês'
    case 'este-ano':
      return 'Neste ano'
    case 'mes-anterior':
      return `Em ${i.rotulo}`
  }
}

const B = ({ children }: { children: ReactNode }) => <strong className="font-medium text-ink">{children}</strong>

/** Uma frase que diz o essencial antes dos números (para quem só vai ler o topo) */
function Resumo({ d, porRetorno, periodo }: { d: Dados; porRetorno: boolean; periodo: Periodo }) {
  const { agora, atual, intervalo, primeiraSaida } = d
  const quando = fraseQuando(periodo, intervalo, primeiraSaida)
  return (
    <p className="text-[15px] leading-relaxed text-ink-2">
      Hoje há <B>{numero(agora.total)} {agora.total === 1 ? 'serviço' : 'serviços'} na fila</B>
      {agora.total > 0 && (
        <>
          , {numero(agora.atraso)} em atraso{agora.risco > 0 && <> e {numero(agora.risco)} com risco elétrico</>}
        </>
      )}
      .{' '}
      {atual.saidas === 0 ? (
        <>{quando}, nada com esses filtros.</>
      ) : porRetorno ? (
        <>
          {quando}, foram executados <B>{numero(atual.saidas)}</B>
          {atual.pctNoPrazo !== null && (
            <>
              , <B>{decimal(atual.pctNoPrazo)}%</B> dentro do prazo
            </>
          )}
          .
        </>
      ) : (
        <>
          {quando}, saíram <B>{numero(atual.saidas)}</B> para a rua
          {atual.pctNoPrazo !== null && (
            <>
              ; dos já executados, <B>{decimal(atual.pctNoPrazo)}%</B> ficaram no prazo
            </>
          )}
          .
        </>
      )}
    </p>
  )
}

function Carregando() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <Esqueleto className="h-5 w-2/3" />
      <Card className="p-5">
        <div className="grid gap-8 md:grid-cols-[240px_1fr]">
          <div>
            <Esqueleto className="h-11 w-32" />
            <Esqueleto className="mt-3 h-3 w-40" />
            <Esqueleto className="mt-5 h-3 w-36" />
            <Esqueleto className="mt-3 h-3 w-40" />
          </div>
          <div>
            <Esqueleto className="h-3 w-40" />
            <Esqueleto className="mt-4 h-4 w-full" />
            <div className="mt-4 grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Esqueleto key={i} className="h-8" />
              ))}
            </div>
          </div>
        </div>
      </Card>
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
        <Esqueleto className="h-4 w-40" />
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Esqueleto key={i} className="h-20" />
          ))}
        </div>
      </Card>
    </div>
  )
}

export function Panorama() {
  const { data: base, isLoading, error, refetch } = useBase()
  const { filtros } = useFiltros()
  const hoje = useHoje()

  const d = useMemo(() => (base ? calcularPanorama(base, filtros, hoje) : null), [base, filtros, hoje])
  const regiaoDe = useMemo(() => {
    const m = new Map(base?.bairros.map((b) => [b.nome, b.regiao]))
    return (bairro: string) => m.get(bairro) ?? ''
  }, [base])

  // Período e "contar por" só mudam o bloco "No período": ao trocá-los, a tela vai até lá
  // (senão parece que o filtro não fez nada — o "Agora", no topo, não muda). Só rola se o bloco
  // estiver fora de vista; com movimento reduzido, salta sem animar.
  const secaoPeriodo = useRef<HTMLElement>(null)
  const chavePeriodo = JSON.stringify([filtros.periodo, filtros.contarPor])
  const chaveAnterior = useRef(chavePeriodo)
  useEffect(() => {
    if (chaveAnterior.current === chavePeriodo) return
    chaveAnterior.current = chavePeriodo
    const el = secaoPeriodo.current
    if (!el) return
    const topo = el.getBoundingClientRect().top
    if (topo > window.innerHeight * 0.45 || topo < 0) {
      const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' })
    }
  }, [chavePeriodo])

  const porRetorno = filtros.contarPor === 'retorno'
  const escopo = [filtros.bairro ?? filtros.regiao, filtros.categoria, filtros.origem].filter(Boolean).join(' · ')

  return (
    <>
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-normal tracking-[-0.4px] text-ink">Panorama</h1>
          {escopo && <span className="text-sm text-ink-2">{escopo}</span>}
        </div>
        <div className="mt-2">{d ? <Resumo d={d} porRetorno={porRetorno} periodo={filtros.periodo} /> : !error && <Esqueleto className="h-5 w-2/3" />}</div>
      </header>

      {error ? (
        <Card>
          <EstadoErro erro={error} aoTentar={() => refetch()} altura="min-h-72" />
        </Card>
      ) : isLoading || !d ? (
        <Carregando />
      ) : (
        <div className="flex flex-col gap-8">
          <Agora agora={d.agora} hoje={hoje} />

          <section ref={secaoPeriodo} aria-labelledby="titulo-periodo" className="flex scroll-mt-36 flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 id="titulo-periodo" className="text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">
                No período · {d.intervalo.rotulo}
              </h2>
              <span className="text-xs text-ink-3">
                por data de {porRetorno ? 'retorno (execução)' : 'saída para a rua'}
                {d.intervalo.parcial && d.intervalo.de !== null && ' · em curso, números ainda mudam'}
              </span>
            </div>
            <Indicadores p={d} comparacao={rotuloComparacao(d.anterior)} porRetorno={porRetorno} />
            <Movimento m={d.movimento} primeiraSaida={d.primeiraSaida} hoje={hoje} />
            {/* duas colunas independentes (sem buraco entre cards de alturas diferentes):
                à esquerda ONDE (regiões, bairros), à direita O QUÊ e QUEM (categorias, origem) */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <Regioes linhas={d.regioes} />
                {/* o último card de cada coluna estica: as duas colunas terminam na mesma linha */}
                <Bairros linhas={d.bairros} regiaoDe={regiaoDe} className="lg:flex-1" />
              </div>
              <div className="flex flex-col gap-4">
                <Categorias linhas={d.categorias} total={d.atual.saidas} />
                <Origens linhas={d.origens} total={d.atual.saidas} className="lg:flex-1" />
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
