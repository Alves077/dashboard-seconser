// Serviços — "Onde está tal serviço?". Todos os serviços, em aberto e executados, de qualquer data (pedido do usuário,
// 24/10/2026: a busca rápida mostra poucos; aqui, a lista inteira com uma busca dentro). Só a equipe (PaginaRestrita:
// fechada por decisão do usuário, 24/10/2026). O período do filtro não vale nesta página (dito na tela); região,
// bairro, categoria e origem valem. Busca, situação e ordem ficam na URL (?q=…&estado=…&ordem=…), dá para mandar o
// link; não seguem para as outras páginas (lib/ganchos.ts). Páginas de 50 (1, 2, 3… — usuário, 24/10/2026: "mostrar
// mais" ia empurrando a lista para baixo sem fim). Datas sempre com o ano (a lista vai até 2016).
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { clsx } from 'clsx'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/componentes/estados/Estados'
import { PaginaRestrita } from '@/componentes/layout/PaginaRestrita'
import { Card } from '@/componentes/ui/Card'
import { MarcadorChave } from '@/componentes/ui/MarcadorChave'
import { SeloSituacao } from '@/componentes/ui/SeloSituacao'
import { Selecao } from '@/componentes/ui/Selecao'
import { buscar, criarIndice, prepararConsulta } from '@/busca/casar'
import { listarServicos, passaEstado, type Estado, type LinhaServico } from '@/calculos/servicos'
import { useBase, useDetalhes } from '@/dados/consultas'
import { enderecoCurto, rotuloLugar } from '@/dados/regras'
import type { Detalhe } from '@/dados/tipos'
import { useFiltros } from '@/filtros/useFiltros'
import { formatarDia } from '@/lib/datas'
import { dias, normalizarBusca, numero, plural } from '@/lib/formato'
import { useEntradaSuave, useHoje } from '@/lib/ganchos'
import { IdServico } from './relatorios/Folha'

const POR_PAGINA = 50

const ESTADOS: { id: Estado; texto: string }[] = [
  { id: 'todos', texto: 'Todos' },
  { id: 'aberto', texto: 'Em aberto' },
  { id: 'atraso', texto: 'Em atraso' },
  { id: 'executado', texto: 'Executados' },
]

// ── Ordem ──
type Campo = 'saida' | 'execucao' | 'numero'
type Direcao = 'desc' | 'asc'
interface Ordem {
  campo: Campo
  dir: Direcao
}
const ORDENS: { valor: string; texto: string }[] = [
  { valor: 'saida', texto: 'Saída: mais recente primeiro' },
  { valor: 'saida-asc', texto: 'Saída: mais antiga primeiro' },
  { valor: 'execucao', texto: 'Execução: mais recente primeiro' },
  { valor: 'execucao-asc', texto: 'Execução: mais antiga primeiro' },
  { valor: 'numero', texto: 'Número: maior primeiro' },
  { valor: 'numero-asc', texto: 'Número: menor primeiro' },
]
const lerOrdem = (v: string | null): Ordem | null => {
  const m = /^(saida|execucao|numero)(-asc)?$/.exec(v ?? '')
  return m ? { campo: m[1] as Campo, dir: m[2] ? 'asc' : 'desc' } : null
}
const escreverOrdem = (o: Ordem) => `${o.campo}${o.dir === 'asc' ? '-asc' : ''}`
const valorDe = (l: LinhaServico, c: Campo) => (c === 'saida' ? l.saida.dataSaida : c === 'numero' ? l.servico.idColab : l.saida.dataRetorno)
function ordenar(linhas: LinhaServico[], o: Ordem) {
  const s = o.dir === 'asc' ? 1 : -1
  return [...linhas].sort((a, b) => {
    const va = valorDe(a, o.campo)
    const vb = valorDe(b, o.campo)
    // por execução, os ainda em aberto vão para o fim nos dois sentidos (não têm data)
    if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1
    return (va - vb) * s || b.saida.dataSaida - a.saida.dataSaida || b.servico.idColab - a.servico.idColab
  })
}

/** Selo: executado diz só "Concluído"; em aberto, a situação e há quantos dias saiu */
function Situacao({ l }: { l: LinhaServico }) {
  return (
    <SeloSituacao
      situacao={l.situacao}
      texto={l.situacao === 'ok' ? undefined : `${l.situacao === 'atraso' ? 'Em atraso' : 'Em atendimento'} · ${l.dias === 0 ? 'hoje' : dias(l.dias)}`}
    />
  )
}

/** rua e número, sem o fim " - Bairro, Niterói - RJ, CEP" (o bairro tem coluna própria) */
function enderecoDe(l: LinhaServico, detalhes: Map<string, Detalhe> | null) {
  const e = detalhes?.get(l.servico.chave)?.endereco
  return e ? enderecoCurto(e) : (l.servico.rua ?? '—')
}

/** "1 … 4 5 6 7 8 … 355": a primeira, a última e duas de cada lado da atual */
function numerosDePagina(atual: number, total: number): (number | '…')[] {
  const r: (number | '…')[] = []
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - atual) <= 2) r.push(p)
    else if (r[r.length - 1] !== '…') r.push('…')
  }
  return r
}

function Paginacao({ pagina, total, aoIr }: { pagina: number; total: number; aoIr: (p: number) => void }) {
  if (total <= 1) return null
  const botao = 'pressionavel grid h-10 min-w-10 place-items-center rounded-lg px-2 text-[13px] numeros'
  return (
    <nav aria-label="Páginas da lista" className="flex items-center justify-center gap-1">
      <button type="button" onClick={() => aoIr(pagina - 1)} disabled={pagina === 1} className={clsx(botao, 'text-ink-2 hover:bg-realce-forte disabled:opacity-40')}>
        <span className="flex items-center gap-1">
          <ChevronLeft aria-hidden className="size-4" />
          <span className="max-sm:sr-only">Anterior</span>
        </span>
      </button>
      {/* celular: "Página 6 de 355" (os números não cabem); computador: 1 … 4 5 6 7 8 … 355 */}
      <span className="numeros px-2 text-[13px] text-ink-2 sm:hidden" aria-live="polite">
        Página {numero(pagina)} de {numero(total)}
      </span>
      <span className="hidden items-center gap-1 sm:flex">
        {numerosDePagina(pagina, total).map((p, i) =>
          p === '…' ? (
            <span key={`r${i}`} aria-hidden className="px-1 text-ink-3">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => aoIr(p)}
              aria-current={p === pagina ? 'page' : undefined}
              aria-label={`Página ${p}`}
              className={clsx(botao, p === pagina ? 'bg-acao font-medium text-sobre-acao' : 'text-ink-2 hover:bg-realce-forte')}
            >
              {numero(p)}
            </button>
          ),
        )}
      </span>
      <button type="button" onClick={() => aoIr(pagina + 1)} disabled={pagina === total} className={clsx(botao, 'text-ink-2 hover:bg-realce-forte disabled:opacity-40')}>
        <span className="flex items-center gap-1">
          <span className="max-sm:sr-only">Próxima</span>
          <ChevronRight aria-hidden className="size-4" />
        </span>
      </button>
    </nav>
  )
}

/** Título de coluna que ordena: tocar alterna mais recente/mais antigo (ou maior/menor); a seta mostra o sentido */
function Ordenavel({
  campo,
  ordem,
  aoOrdenar,
  children,
  className,
}: {
  campo: Campo
  ordem: Ordem | null
  aoOrdenar: (o: Ordem) => void
  children: string
  className?: string
}) {
  const ativo = ordem?.campo === campo
  const Icone = !ativo ? ArrowUpDown : ordem.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th className={className} aria-sort={ativo ? (ordem.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => aoOrdenar({ campo, dir: ativo && ordem.dir === 'desc' ? 'asc' : 'desc' })}
        className={clsx('inline-flex items-center gap-1 uppercase hover:text-ink', ativo && 'text-ink')}
      >
        {children}
        <Icone aria-hidden className={clsx('size-3', !ativo && 'opacity-50')} />
      </button>
    </th>
  )
}

function Carregando() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Esqueleto className="h-11 w-full max-w-xl rounded-full" />
      <Esqueleto className="h-9 w-80 max-w-full rounded-full" />
      <Card className="p-5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line py-3 last:border-b-0">
            <Esqueleto className="h-4 w-16" />
            <Esqueleto className="h-4 flex-1" />
            <Esqueleto className="h-5 w-24 rounded-full" />
          </div>
        ))}
      </Card>
    </div>
  )
}

export function Servicos() {
  return (
    <PaginaRestrita
      nome="Serviços"
      titulo="A lista de serviços é para a equipe da DIP"
      texto="Entre com a sua conta para ver todos os serviços, em aberto e executados, com o endereço."
      tituloErro="Não foi possível abrir a lista de serviços"
    >
      <PaginaServicos />
    </PaginaRestrita>
  )
}

function PaginaServicos() {
  const { data: base, isLoading, error, refetch } = useBase()
  const { data: dadosDetalhes } = useDetalhes()
  const detalhes = dadosDetalhes ?? null
  const entrada = useEntradaSuave(isLoading)
  const { filtros, limpar } = useFiltros()
  const hoje = useHoje()
  const [params, setParams] = useSearchParams()
  const estado: Estado = ESTADOS.find((e) => e.id === params.get('estado'))?.id ?? 'todos'
  const paramOrdem = params.get('ordem')
  const [texto, setTexto] = useState(() => params.get('q') ?? '')
  const consulta = useDeferredValue(texto)
  const [pagina, setPagina] = useState(1)
  const topoLista = useRef<HTMLDivElement>(null)

  // o texto vai para a URL (dá para mandar o link e voltar com ele), sem empilhar uma entrada no histórico por letra
  useEffect(() => {
    const t = window.setTimeout(() => {
      setParams(
        (p) => {
          const n = new URLSearchParams(p)
          if (texto.trim()) n.set('q', texto.trim())
          else n.delete('q')
          return n
        },
        { replace: true },
      )
    }, 300)
    return () => window.clearTimeout(t)
  }, [texto, setParams])
  const trocar = (chave: string, valor: string | null) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (valor === null) n.delete(chave)
        else n.set(chave, valor)
        return n
      },
      { viewTransition: true },
    )

  const todas = useMemo(() => (base ? listarServicos(base, filtros, hoje) : null), [base, filtros, hoje])
  // índice da busca na ordem da lista (mais recente primeiro): no empate de pontos, fica a ordem da data
  const indice = useMemo(
    () =>
      todas &&
      criarIndice(todas, (l) => {
        const d = detalhes?.get(l.servico.chave)
        return [l.servico.idColab, l.servico.rua, l.servico.bairro, l.servico.categoria, rotuloLugar(l.servico), d?.endereco, d?.local].filter(Boolean).join(' ')
      }),
    [todas, detalhes],
  )
  const q = normalizarBusca(consulta)
  const buscando = q.length >= 2 || /^\d+$/.test(q)
  const achadas = useMemo(() => {
    if (!todas || !indice) return null
    return buscando ? buscar(indice, prepararConsulta(consulta), Infinity) : todas
  }, [todas, indice, consulta, buscando])
  const contagem = useMemo(() => {
    const c: Record<Estado, number> = { todos: 0, aberto: 0, atraso: 0, executado: 0 }
    for (const l of achadas ?? []) for (const e of ESTADOS) if (passaEstado(l, e.id)) c[e.id]++
    return c
  }, [achadas])
  // sem ordem escolhida: com busca, as que mais batem primeiro; sem busca, a saída mais recente
  const ordem = useMemo<Ordem | null>(() => lerOrdem(paramOrdem) ?? (buscando ? null : { campo: 'saida', dir: 'desc' }), [paramOrdem, buscando])
  const linhas = useMemo(() => {
    const l = achadas ? achadas.filter((x) => passaEstado(x, estado)) : []
    return ordem ? ordenar(l, ordem) : l
  }, [achadas, estado, ordem])

  // busca, situação, ordem ou filtro mudou: volta à página 1
  const chaveLista = JSON.stringify([consulta, estado, ordem, filtros])
  const [chaveAntes, setChaveAntes] = useState(chaveLista)
  if (chaveAntes !== chaveLista) {
    setChaveAntes(chaveLista)
    setPagina(1)
  }
  const totalPaginas = Math.max(1, Math.ceil(linhas.length / POR_PAGINA))
  const atual = Math.min(pagina, totalPaginas)
  const visiveis = linhas.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA)
  const irPara = (p: number) => {
    setPagina(Math.max(1, Math.min(totalPaginas, p)))
    // a lista nova começa no topo (a página não fica parada no rodapé da anterior)
    const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches
    topoLista.current?.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' })
  }
  const ordenarPor = (o: Ordem) => trocar('ordem', escreverOrdem(o) === 'saida' && !buscando ? null : escreverOrdem(o))
  const escopo = [filtros.bairro ?? filtros.regiao, filtros.categoria, filtros.quem ?? filtros.origem].filter(Boolean).join(' · ')

  return (
    <>
      <header className="mb-5">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-normal tracking-[-0.4px] text-ink">Serviços</h1>
          {escopo && <span className="text-sm text-ink-2">{escopo}</span>}
        </div>
        <p className="mt-1 text-[13px] text-ink-2">
          Todos os serviços, em aberto e executados, de qualquer data (o período do filtro não vale nesta página). Toque no número para ver a
          ficha.
        </p>
      </header>

      {error ? (
        <Card>
          <EstadoErro erro={error} aoTentar={() => refetch()} altura="min-h-72" />
        </Card>
      ) : isLoading || !todas ? (
        <Carregando />
      ) : (
        <div className={clsx(entrada, 'flex flex-col gap-4')}>
          {/* busca dentro da lista: 16 px no celular (menos que isso, o iPhone aproxima a página ao tocar) */}
          <label className="flex h-11 w-full max-w-xl items-center gap-2 rounded-full border border-line bg-card px-4 focus-within:border-acao">
            <Search aria-hidden className="size-4 shrink-0 text-ink-3" />
            <span className="sr-only">Buscar na lista</span>
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              // curto: no celular, o mais longo era cortado (bairro e categoria também são achados, sem precisar dizer)
              placeholder="Nº do serviço, rua ou endereço…"
              enterKeyHint="search"
              autoComplete="off"
              className="h-full w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-3 sm:text-[14px] [&::-webkit-search-cancel-button]:hidden"
            />
            {texto && (
              <button type="button" onClick={() => setTexto('')} aria-label="Limpar a busca" className="pressionavel -mr-2 grid size-9 place-items-center rounded-full text-ink-3 hover:text-ink">
                <X aria-hidden className="size-4" />
              </button>
            )}
          </label>

          <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
            <ToggleGroup
              aria-label="Situação"
              value={[estado]}
              onValueChange={(v) => v[0] && trocar('estado', v[0] === 'todos' ? null : (v[0] as string))}
              // celular: os quatro dividem a largura, com o número embaixo do nome (numa linha só, a chave passava de
              // 360 px e o celular reduzia a página inteira); a partir de sm, pílula numa linha
              className="relative grid w-full auto-cols-fr grid-flow-col gap-0.5 rounded-xl border border-line bg-page p-0.5 sm:flex sm:h-9 sm:w-fit sm:items-center sm:rounded-full"
            >
              <MarcadorChave className="bg-card shadow-1" />
              {ESTADOS.map((e) => (
                <Toggle
                  key={e.id}
                  value={e.id}
                  className="opcao-chave flex min-h-11 flex-col items-center justify-center rounded-lg px-1 py-1 text-xs leading-tight whitespace-nowrap text-ink-2 data-pressed:font-medium data-pressed:text-ink sm:h-full sm:min-h-0 sm:flex-row sm:gap-1 sm:rounded-full sm:px-3 sm:py-0"
                >
                  {e.texto} <span className="numeros text-ink-3">{numero(contagem[e.id])}</span>
                </Toggle>
              ))}
            </ToggleGroup>
            {/* ordem no celular (no computador, tocando no título da coluna) */}
            <Selecao
              rotulo="Ordenar"
              rotuloVisivel={false}
              className="w-full md:hidden"
              opcoes={[...(buscando ? [{ valor: '', texto: 'As que mais batem com a busca' }] : []), ...ORDENS]}
              value={ordem ? escreverOrdem(ordem) : ''}
              onChange={(e) => trocar('ordem', e.target.value || null)}
            />
          </div>

          <div ref={topoLista} className="flex scroll-mt-40 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="numeros text-xs text-ink-3">
              {linhas.length === 0
                ? ''
                : `${numero((atual - 1) * POR_PAGINA + 1)}–${numero(Math.min(atual * POR_PAGINA, linhas.length))} de ${plural(linhas.length, 'serviço', 'serviços')}${buscando ? ` para “${consulta.trim()}”` : ''}`}
            </p>
            <p className="text-xs text-ink-3 max-md:hidden">
              {ordem ? ORDENS.find((o) => o.valor === escreverOrdem(ordem))?.texto : 'As que mais batem com a busca primeiro'} · clique no título da coluna
              para mudar
            </p>
          </div>

          {linhas.length === 0 ? (
            <Card>
              <EstadoVazio
                titulo={buscando ? `Nada encontrado para “${consulta.trim()}”` : 'Nenhum serviço com esses filtros'}
                texto={buscando ? 'Confira o número ou tente só uma parte do nome da rua.' : undefined}
                aoLimpar={buscando ? () => setTexto('') : limpar}
                rotuloAcao={buscando ? 'Limpar a busca' : 'Limpar filtros'}
                altura="min-h-56"
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {/* celular: um cartão por serviço (situação à direita, à mão do polegar) */}
              <ul className="divide-y divide-line md:hidden">
                {visiveis.map((l) => {
                  const lugar = rotuloLugar(l.servico) ?? detalhes?.get(l.servico.chave)?.local
                  return (
                    <li key={l.servico.chave} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px]">
                          <IdServico servico={l.servico} ordem={l.saida.ordem} />
                        </span>
                        <Situacao l={l} />
                      </div>
                      <p className="mt-1.5 text-[13px] text-ink">{l.servico.categoria ?? 'Sem categoria'}</p>
                      <p className="text-[12px] text-ink-2">
                        {enderecoDe(l, detalhes)} · {l.servico.bairro}
                      </p>
                      {lugar && <p className="text-[11px] text-ink-3">{lugar}</p>}
                      <p className="numeros mt-0.5 text-[11px] text-ink-3">
                        Saiu em {formatarDia(l.saida.dataSaida)}
                        {l.saida.dataRetorno !== null && ` · executado em ${formatarDia(l.saida.dataRetorno)}`}
                      </p>
                    </li>
                  )
                })}
              </ul>
              {/* computador: a tabela; os títulos de Serviço, Saída e Execução ordenam */}
              <div className="max-md:hidden">
                <table className="tabela-folha tabela-servicos w-full">
                  <thead>
                    <tr>
                      <Ordenavel campo="numero" ordem={ordem} aoOrdenar={ordenarPor} className="pl-5">
                        Serviço
                      </Ordenavel>
                      <th className="esq">Categoria</th>
                      <th className="esq">Endereço</th>
                      <th className="esq">Bairro</th>
                      <Ordenavel campo="saida" ordem={ordem} aoOrdenar={ordenarPor} className="num">
                        Saída
                      </Ordenavel>
                      <Ordenavel campo="execucao" ordem={ordem} aoOrdenar={ordenarPor} className="num">
                        Execução
                      </Ordenavel>
                      <th className="pr-5">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((l) => (
                      <LinhaTabela key={l.servico.chave} l={l} detalhes={detalhes} />
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPaginas > 1 && (
                <div className="border-t border-line px-3 py-3">
                  <Paginacao pagina={atual} total={totalPaginas} aoIr={irPara} />
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </>
  )
}

function LinhaTabela({ l, detalhes }: { l: LinhaServico; detalhes: Map<string, Detalhe> | null }) {
  const lugar = rotuloLugar(l.servico) ?? detalhes?.get(l.servico.chave)?.local
  return (
    <tr>
      <td className="pl-5">
        <IdServico servico={l.servico} ordem={l.saida.ordem} />
      </td>
      <td>{l.servico.categoria ?? 'Sem categoria'}</td>
      <td>
        {enderecoDe(l, detalhes)}
        {lugar && <span className="block text-[11px] text-ink-3">{lugar}</span>}
      </td>
      <td>{l.servico.bairro}</td>
      <td className="num">{formatarDia(l.saida.dataSaida)}</td>
      <td className="num">{l.saida.dataRetorno === null ? '—' : formatarDia(l.saida.dataRetorno)}</td>
      <td className="centro pr-5">
        <Situacao l={l} />
      </td>
    </tr>
  )
}
