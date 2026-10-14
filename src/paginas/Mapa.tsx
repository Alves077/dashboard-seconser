// Mapa — "Onde está o problema?". Mapa em primeiro plano + painel clicável (tocar filtra e o mapa
// reenquadra; tocar num serviço abre a Ficha e voa até o pino). No celular o mapa aparece (antes sumia).
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { clsx } from 'clsx'
import { ChevronRight, MapPinOff, Zap } from 'lucide-react'
import { lazy, Suspense, useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/componentes/estados/Estados'
import { Card } from '@/componentes/ui/Card'
import { SeloSituacao } from '@/componentes/ui/SeloSituacao'
import { calcularMapa, OPCOES_MOSTRAR, type Contagem, type DadosMapa, type Mostrar } from '@/calculos/mapa'
import { useBase } from '@/dados/consultas'
import { CATEGORIA_RISCO } from '@/dados/regras'
import { useFiltros } from '@/filtros/useFiltros'
import { corRegiao } from '@/lib/cores'
import { formatarDia } from '@/lib/datas'
import { dias, numero, pct } from '@/lib/formato'
import { useFicha, useHoje, useMidia } from '@/lib/ganchos'

const MapaGrande = lazy(() => import('@/mapa/MapaGrande'))

/**
 * Computador: mapa e painel vão exatamente até o fim da janela (a página não rola à toa). A altura
 * depende do cabeçalho e da barra de filtros (que pode quebrar em 2 linhas) — por isso é medida.
 */
function useAlturaAteOFim() {
  const grade = useRef<HTMLDivElement>(null)
  const [alturaFixa, setAlturaFixa] = useState<number | null>(null)
  const computador = useMidia('(min-width: 1024px)')
  useLayoutEffect(() => {
    if (!computador) return
    const medir = () => {
      const el = grade.current
      if (!el) return
      const topo = el.getBoundingClientRect().top + window.scrollY
      setAlturaFixa(Math.max(480, window.innerHeight - topo - 16))
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [computador])
  // fora do computador a altura vem do CSS (58dvh do mapa + painel embaixo)
  return { grade, alturaFixa: computador ? alturaFixa : null }
}

/** "O que mostrar" é da página (não é filtro global): fica na URL como ?mostrar= */
function useMostrar(): [Mostrar, (m: Mostrar) => void] {
  const [params, setParams] = useSearchParams()
  const v = params.get('mostrar')
  const mostrar: Mostrar = v === 'atraso' || v === 'executados' || v === 'todos' ? v : 'abertos'
  const mudar = useCallback(
    (m: Mostrar) =>
      setParams((p) => {
        const n = new URLSearchParams(p)
        if (m === 'abertos') n.delete('mostrar')
        else n.set('mostrar', m)
        return n
      }),
    [setParams],
  )
  return [mostrar, mudar]
}

/** Celular: grade 2×2 (cabe sem cortar); tablet/computador: uma linha */
function SeletorMostrar({ valor, aoMudar }: { valor: Mostrar; aoMudar: (m: Mostrar) => void }) {
  return (
    <ToggleGroup
      aria-label="Mostrar no mapa"
      value={[valor]}
      onValueChange={(v) => v[0] && aoMudar(v[0] as Mostrar)}
      className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-line bg-card p-1 sm:flex sm:h-11 sm:w-auto sm:rounded-full"
    >
      {OPCOES_MOSTRAR.map((o) => (
        <Toggle
          key={o.id}
          value={o.id}
          className="pressionavel h-10 rounded-xl px-3 text-[13px] whitespace-nowrap text-ink-2 hover:text-ink data-pressed:bg-acao data-pressed:font-medium data-pressed:text-sobre-acao sm:h-full sm:rounded-full"
        >
          {o.rotulo}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-line px-4 py-3 first:border-t-0">
      <h2 className="mb-1.5 text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">{titulo}</h2>
      {children}
    </section>
  )
}

/** Linha do painel: nome · total · atraso. Tocar filtra (e o mapa reenquadra); tocar de novo tira. */
function LinhaPainel({ c, ativo, aoTocar, ponto, icone }: { c: Contagem; ativo: boolean; aoTocar: () => void; ponto?: string; icone?: ReactNode }) {
  return (
    <li>
      <button
        type="button"
        onClick={aoTocar}
        aria-pressed={ativo}
        className={clsx(
          'flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] pointer-coarse:min-h-11',
          ativo ? 'bg-acao-suave font-medium text-ink' : 'text-ink hover:bg-ink/[0.03]',
        )}
      >
        {ponto && <span aria-hidden className={clsx('size-2.5 shrink-0 rounded-full', ponto)} />}
        {icone}
        <span className="min-w-0 flex-1 truncate">{c.nome}</span>
        <span className="numeros text-ink">{numero(c.total)}</span>
        <span className={clsx('numeros w-14 text-right text-xs', c.atraso > 0 ? 'text-atraso-texto' : 'text-ink-3')}>
          {c.atraso > 0 ? `${numero(c.atraso)} atr.` : '—'}
        </span>
      </button>
    </li>
  )
}

function Painel({ d, mostrar }: { d: DadosMapa; mostrar: Mostrar }) {
  const { filtros, mudar } = useFiltros()
  const { abrir } = useFicha()
  const abertosModo = mostrar === 'abertos' || mostrar === 'atraso'

  return (
    <div>
      <Secao titulo="No mapa">
        <p className="numeros text-[28px] leading-tight font-light tracking-[-0.5px] text-ink">
          {numero(d.pontos.length)} <span className="text-sm font-normal tracking-normal text-ink-2">{d.pontos.length === 1 ? 'serviço' : 'serviços'}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {d.porSituacao.atraso > 0 && <SeloSituacao situacao="atraso" texto={`${numero(d.porSituacao.atraso)} em atraso`} />}
          {d.porSituacao.andamento > 0 && <SeloSituacao situacao="andamento" texto={`${numero(d.porSituacao.andamento)} no prazo`} />}
          {d.porSituacao.ok > 0 && <SeloSituacao situacao="ok" texto={`${numero(d.porSituacao.ok)} executados`} />}
        </div>
        {d.semCoordenada > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">
            <MapPinOff aria-hidden className="size-3.5" />
            {numero(d.semCoordenada)} sem coordenada válida (fora do mapa)
          </p>
        )}
      </Secao>

      {abertosModo && d.maisAntigos.length > 0 && (
        <Secao titulo="Esperando há mais tempo">
          <ul className="-mx-2 divide-y divide-line">
            {d.maisAntigos.slice(0, 6).map((p) => (
              <li key={p.servico.chave}>
                <button
                  type="button"
                  onClick={() => abrir(p.servico.chave)}
                  className="group flex min-h-12 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-ink/[0.03]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 truncate text-[13px] text-ink">
                      {p.risco && <Zap aria-label="risco elétrico" className="size-3.5 shrink-0 text-risco-texto" />}
                      <span className="truncate">{p.servico.categoria}</span>
                    </span>
                    <span className="block truncate text-xs text-ink-3">
                      {p.servico.idColab} · {p.servico.bairro} · saiu {formatarDia(p.saida.dataSaida)}
                    </span>
                  </span>
                  <SeloSituacao situacao={p.situacao} texto={dias(p.dias)} />
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3" />
                </button>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao titulo="Regiões">
        <ul className="-mx-2">
          {d.regioes.map((c) => (
            <LinhaPainel
              key={c.nome}
              c={c}
              ponto={corRegiao(c.nome)}
              ativo={filtros.regiao === c.nome}
              aoTocar={() => mudar({ regiao: filtros.regiao === c.nome ? null : c.nome })}
            />
          ))}
        </ul>
      </Secao>

      <Secao titulo={`Bairros ${abertosModo ? 'com mais abertos' : 'com mais serviços'}`}>
        <ul className="-mx-2">
          {d.bairros.slice(0, 8).map((c) => (
            <LinhaPainel
              key={c.nome}
              c={c}
              ativo={filtros.bairro === c.nome}
              aoTocar={() => {
                const regiao = d.pontos.find((p) => p.servico.bairro === c.nome)?.servico.regiao ?? null
                mudar(filtros.bairro === c.nome ? { bairro: null } : { regiao, bairro: c.nome })
              }}
            />
          ))}
        </ul>
      </Secao>

      <Secao titulo="Categorias">
        <ul className="-mx-2">
          {d.categorias.slice(0, 8).map((c) => (
            <LinhaPainel
              key={c.nome}
              c={c}
              icone={c.nome === CATEGORIA_RISCO ? <Zap aria-hidden className="size-3.5 shrink-0 text-risco-texto" /> : undefined}
              ativo={filtros.categoria === c.nome}
              aoTocar={() => mudar({ categoria: filtros.categoria === c.nome ? null : c.nome })}
            />
          ))}
        </ul>
        {d.categorias.length > 0 && (
          <p className="mt-1 px-0 text-[11px] text-ink-3">
            {pct(d.categorias[0].total, d.pontos.length)} dos pontos são “{d.categorias[0].nome}”.
          </p>
        )}
      </Secao>
    </div>
  )
}

export function Mapa() {
  const { data: base, isLoading, error, refetch } = useBase()
  const { filtros, limpar } = useFiltros()
  const { chave: selecionado, abrir } = useFicha()
  const [mostrar, setMostrar] = useMostrar()
  const hoje = useHoje()

  const d = useMemo(() => (base ? calcularMapa(base, filtros, mostrar, hoje) : null), [base, filtros, mostrar, hoje])
  const { grade, alturaFixa } = useAlturaAteOFim()
  // muda o recorte → o mapa reenquadra (o período só conta quando "mostrar" usa período)
  const usaPeriodo = OPCOES_MOSTRAR.find((o) => o.id === mostrar)!.usaPeriodo
  const chaveEnquadre = JSON.stringify([filtros.regiao, filtros.bairro, filtros.categoria, filtros.origem, filtros.quem, mostrar, usaPeriodo ? [filtros.periodo, filtros.contarPor] : null])

  return (
    <>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-normal tracking-[-0.4px] text-ink">Mapa</h1>
        <SeletorMostrar valor={mostrar} aoMudar={setMostrar} />
      </header>

      {error ? (
        <Card>
          <EstadoErro erro={error} aoTentar={() => refetch()} altura="min-h-96" />
        </Card>
      ) : (
        <div ref={grade} style={alturaFixa ? { height: alturaFixa } : undefined} className="grid grid-cols-1 gap-4 lg:min-h-[480px] lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="h-[58dvh] min-w-0 overflow-hidden lg:h-auto">
            {isLoading || !d ? (
              <Esqueleto className="h-full w-full rounded-none" />
            ) : d.pontos.length === 0 ? (
              <EstadoVazio
                titulo="Nenhum serviço para mostrar"
                texto={mostrar === 'abertos' || mostrar === 'atraso' ? 'Com esses filtros, a fila está zerada.' : 'Nada neste período com esses filtros.'}
                aoLimpar={limpar}
                altura="h-full"
              />
            ) : (
              <Suspense fallback={<Esqueleto className="h-full w-full rounded-none" />}>
                <MapaGrande
                  pontos={d.pontos}
                  porSituacao={d.porSituacao}
                  risco={d.risco}
                  selecionado={selecionado}
                  aoEscolher={abrir}
                  chaveEnquadre={chaveEnquadre}
                />
              </Suspense>
            )}
          </Card>
          <Card className="min-w-0 lg:overflow-y-auto lg:overscroll-contain">
            {isLoading || !d ? (
              <div className="flex flex-col gap-3 p-4" aria-busy="true">
                <Esqueleto className="h-8 w-28" />
                <Esqueleto className="h-5 w-48 rounded-full" />
                {Array.from({ length: 6 }, (_, i) => (
                  <Esqueleto key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <Painel d={d} mostrar={mostrar} />
            )}
          </Card>
        </div>
      )}
    </>
  )
}
