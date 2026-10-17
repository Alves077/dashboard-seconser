import { Drawer } from '@base-ui/react/drawer'
import { Popover } from '@base-ui/react/popover'
import { clsx } from 'clsx'
import { CalendarRange, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router'
import { ListaEscolha, type OpcaoLista } from '@/componentes/ui/ListaEscolha'
import { Selecao } from '@/componentes/ui/Selecao'
import { corRegiao } from '@/lib/cores'
import { useBase } from '@/dados/consultas'
import { SEM_REGIAO } from '@/dados/montar'
import { compararTexto, numero } from '@/lib/formato'
import { useHoje } from '@/lib/ganchos'
import { aplicarFiltros, contarAtivos, contarOpcoes, intervaloDo, type Dimensao } from './filtros'
import { PainelPeriodo } from './PainelPeriodo'
import { useFiltros } from './useFiltros'
import { useResumoPeriodo } from './useResumoPeriodo'

/** Opções com contagem (com os OUTROS filtros aplicados); zero fica visível, mas desabilitado */
function useOpcoes() {
  const { data: base } = useBase()
  const { filtros } = useFiltros()
  const hoje = useHoje()
  return useMemo(() => {
    const vazio: Record<'regioes' | 'bairros' | 'categorias' | 'origens', OpcaoLista[]> = {
      regioes: [],
      bairros: [],
      categorias: [],
      origens: [],
    }
    if (!base) return vazio
    const n = contarOpcoes(base.saidas, filtros, hoje)
    const opcao = (valor: string, d: Dimensao, atual: string | null, extra?: Partial<OpcaoLista>): OpcaoLista => {
      const c = n[d].get(valor) ?? 0
      return { valor, texto: valor, contagem: c, desabilitada: c === 0 && valor !== atual, ...extra }
    }
    const regioes = [...new Set(base.bairros.map((b) => b.regiao))].sort(compararTexto)
    const origens = [...new Set(base.servicos.map((s) => s.origem))].sort(
      (a, b) => (n.origem.get(b) ?? 0) - (n.origem.get(a) ?? 0) || compararTexto(a, b),
    )
    return {
      regioes: regioes.map((r) => opcao(r, 'regiao', filtros.regiao, { ponto: corRegiao(r) })),
      // sem região escolhida, bairros agrupados por região (52 nomes ficam fáceis de achar)
      bairros: base.bairros
        .filter((b) => !filtros.regiao || b.regiao === filtros.regiao)
        .sort((a, b) => compararTexto(a.regiao, b.regiao) || compararTexto(a.nome, b.nome))
        .map((b) => opcao(b.nome, 'bairro', filtros.bairro, { grupo: filtros.regiao ? undefined : b.regiao })),
      categorias: base.categorias.map((c) => opcao(c.nome, 'categoria', filtros.categoria)),
      origens: origens.map((o) => opcao(o, 'origem', filtros.origem)),
    }
  }, [base, filtros, hoje])
}

/** <select> do sistema (gaveta do celular): sem contagem no texto, zero desabilitado */
/**
 * O número de cada opção são SAÍDAS no período (o mesmo do contador "650 saídas" à direita), não a fila de hoje:
 * dito no topo da lista (decisão do usuário, 17/10/2026 — "Leste 39" parecia "39 em aberto").
 */
function useLegendaContagem() {
  const { filtros } = useFiltros()
  const hoje = useHoje()
  return `${filtros.contarPor === 'retorno' ? 'Executados' : 'Saídas'} · ${intervaloDo(filtros.periodo, hoje).rotulo}`
}

const paraNativo = (ops: OpcaoLista[]) => ops.map((o) => ({ valor: o.valor, texto: o.texto, disabled: o.desabilitada }))

function CamposLugar({ empilhado = false }: { empilhado?: boolean }) {
  const { filtros, mudar } = useFiltros()
  const { regioes, bairros, categorias } = useOpcoes()
  const { data: base } = useBase()
  // escolher um bairro já acerta a região dele
  const escolherBairro = (b: string | null) =>
    b ? mudar({ regiao: base?.bairros.find((x) => x.nome === b)?.regiao ?? filtros.regiao, bairro: b }) : mudar({ bairro: null })
  const vazioBairro = filtros.regiao && filtros.regiao !== SEM_REGIAO ? `Todos de ${filtros.regiao}` : 'Todos os bairros'
  const legenda = useLegendaContagem()
  if (empilhado)
    return (
      <>
        <Selecao rotulo="Região" vazio="Todas as regiões" opcoes={paraNativo(regioes)} value={filtros.regiao ?? ''} onChange={(e) => mudar({ regiao: e.target.value || null })} />
        <Selecao rotulo="Bairro" vazio={vazioBairro} opcoes={paraNativo(bairros)} value={filtros.bairro ?? ''} onChange={(e) => escolherBairro(e.target.value || null)} />
        <Selecao rotulo="Categoria" vazio="Todas as categorias" opcoes={paraNativo(categorias)} value={filtros.categoria ?? ''} onChange={(e) => mudar({ categoria: e.target.value || null })} />
      </>
    )
  return (
    <>
      <ListaEscolha rotulo="Região" vazio="Todas as regiões" opcoes={regioes} valor={filtros.regiao} aoMudar={(v) => mudar({ regiao: v })} className="w-48" legenda={legenda} />
      <ListaEscolha rotulo="Bairro" vazio={vazioBairro} opcoes={bairros} valor={filtros.bairro} aoMudar={escolherBairro} className="w-52" legenda={legenda} />
      <ListaEscolha rotulo="Categoria" vazio="Todas as categorias" opcoes={categorias} valor={filtros.categoria} aoMudar={(v) => mudar({ categoria: v })} className="w-60" legenda={legenda} />
    </>
  )
}

function CampoOrigem({ nativo = false }: { nativo?: boolean }) {
  const { filtros, mudar } = useFiltros()
  const { origens } = useOpcoes()
  const legenda = useLegendaContagem()
  if (nativo)
    return <Selecao rotulo="Quem pediu" vazio="Todas as origens" opcoes={paraNativo(origens)} value={filtros.origem ?? ''} onChange={(e) => mudar({ origem: e.target.value || null })} />
  return (
    <ListaEscolha rotulo="Quem pediu" vazio="Todas as origens" opcoes={origens} valor={filtros.origem} aoMudar={(v) => mudar({ origem: v })} className="w-48" legenda={legenda} />
  )
}

function BotaoPeriodo() {
  const resumo = useResumoPeriodo()
  const [aberto, setAberto] = useState(false)
  return (
    <Popover.Root open={aberto} onOpenChange={setAberto}>
      <Popover.Trigger
        aria-label={`Período: ${resumo}`}
        className="pressionavel flex h-11 max-w-72 min-w-44 items-center gap-2 rounded-md border border-line-input bg-card pr-3 pl-3 text-left text-ink hover:border-acao/50"
      >
        <CalendarRange aria-hidden className="size-4 shrink-0 text-ink-3" />
        <span className="truncate">{resumo}</span>
        <ChevronDown aria-hidden className="ml-auto size-4 shrink-0 text-ink-3" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" className="z-40">
          <Popover.Popup className="max-h-(--available-height) w-[min(560px,calc(100vw-2rem))] origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-xl border border-line bg-card p-4 shadow-2 transition-[opacity,scale] duration-200 ease-saida data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
            <Popover.Title className="sr-only">Período</Popover.Title>
            <PainelPeriodo aoEscolher={() => setAberto(false)} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

/**
 * Chips dos filtros ativos, cada um com × — o caminho de volta claro (DESIGN.md §8).
 * `linha`: celular — uma linha só que rola para o lado (a barra é fixa no topo; quebrando em várias
 * linhas ela comeria a tela), com "Limpar tudo" primeiro para não ficar escondido no fim da rolagem.
 */
function FiltrosAtivos({ linha = false }: { linha?: boolean }) {
  const { filtros, mudar, limpar } = useFiltros()
  const chips: { texto: string; tirar: () => void }[] = []
  if (filtros.regiao) chips.push({ texto: `Região: ${filtros.regiao}`, tirar: () => mudar({ regiao: null }) })
  if (filtros.bairro) chips.push({ texto: `Bairro: ${filtros.bairro}`, tirar: () => mudar({ bairro: null }) })
  if (filtros.categoria) chips.push({ texto: filtros.categoria, tirar: () => mudar({ categoria: null }) })
  if (filtros.origem) chips.push({ texto: `Quem pediu: ${filtros.origem}`, tirar: () => mudar({ origem: null }) })
  // o 2º nível da origem não tem seletor (são dezenas de nomes): escolhe-se tocando nas listas; aqui só sai
  if (filtros.quem) chips.push({ texto: filtros.quem, tirar: () => mudar({ quem: null }) })
  if (!chips.length) return null
  const limparTudo = contarAtivos(filtros) > 1 && (
    <button
      type="button"
      onClick={limpar}
      className={clsx(
        'h-8 shrink-0 px-2 text-xs whitespace-nowrap underline-offset-2 hover:text-ink hover:underline',
        linha ? 'font-medium text-acao' : 'text-ink-2',
      )}
    >
      Limpar tudo
    </button>
  )
  return (
    <div
      className={clsx(
        'flex items-center gap-2',
        linha
          ? '-mx-4 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'flex-wrap',
      )}
    >
      {linha && limparTudo}
      {chips.map((c) => (
        <button
          key={c.texto}
          type="button"
          onClick={c.tirar}
          className="pressionavel inline-flex h-8 max-w-[16rem] shrink-0 items-center gap-1.5 rounded-full bg-acao-suave pr-2 pl-3 text-xs font-medium whitespace-nowrap text-acao-press"
          aria-label={`Tirar filtro ${c.texto}`}
        >
          <span className="truncate">{c.texto}</span>
          <X aria-hidden className="size-3.5 shrink-0" />
        </button>
      ))}
      {!linha && limparTudo}
    </div>
  )
}

function ContagemResultado() {
  // no Mapa a unidade é serviço (pinos), não saída: a contagem fica no painel do mapa
  const naPaginaMapa = useLocation().pathname === '/mapa'
  const { data: base } = useBase()
  const { filtros } = useFiltros()
  const hoje = useHoje()
  const n = useMemo(() => (base ? aplicarFiltros(base.saidas, filtros, hoje).saidas.length : null), [base, filtros, hoje])
  if (n === null || naPaginaMapa) return null
  return (
    <span className="numeros text-xs text-ink-2" aria-live="polite">
      {numero(n)} {n === 1 ? 'saída' : 'saídas'}
    </span>
  )
}

/** Celular: um botão "Filtros (n)" que abre uma gaveta de baixo */
function GavetaFiltros() {
  const { filtros, limpar } = useFiltros()
  const resumo = useResumoPeriodo()
  const ativos = contarAtivos(filtros)
  const [aberto, setAberto] = useState(false)
  return (
    <Drawer.Root open={aberto} onOpenChange={setAberto} swipeDirection="down">
      <div className="flex items-center gap-2">
        <Drawer.Trigger className="pressionavel flex h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-[13px] font-medium text-ink">
          <SlidersHorizontal aria-hidden className="size-4" />
          Filtros
          {ativos > 0 && (
            <span className="numeros grid size-5 place-items-center rounded-full bg-acao text-[11px] text-sobre-acao">{ativos}</span>
          )}
        </Drawer.Trigger>
        <span className="min-w-0 truncate text-xs text-ink-2">{resumo}</span>
      </div>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/30 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-300 ease-gaveta data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Drawer.Viewport className="fixed inset-0 z-40 flex items-end">
          <Drawer.Popup className="max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-card pb-[env(safe-area-inset-bottom,0px)] shadow-2 [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-300 ease-gaveta data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)] motion-reduce:transition-opacity motion-reduce:data-ending-style:opacity-0 motion-reduce:data-starting-style:opacity-0">
            <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
            <Drawer.Content className="flex flex-col gap-5 p-4">
              <div className="flex items-center justify-between">
                <Drawer.Title className="text-base font-medium text-ink">Filtros</Drawer.Title>
                {ativos > 0 && (
                  <button type="button" onClick={limpar} className="h-10 px-2 text-[13px] text-acao">
                    Limpar
                  </button>
                )}
              </div>
              <section>
                <h3 className="mb-2 text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">Período</h3>
                <PainelPeriodo />
              </section>
              <section className="flex flex-col gap-3 border-t border-line pt-4">
                <CamposLugar empilhado />
                <CampoOrigem nativo />
              </section>
              <Drawer.Close className="pressionavel sticky bottom-2 h-12 rounded-full bg-acao text-sm font-medium text-sobre-acao shadow-2">
                Ver resultado
              </Drawer.Close>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

export function BarraFiltros() {
  return (
    <section aria-label="Filtros" className="barra-na-troca sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] lg:top-[calc(4rem+env(safe-area-inset-top,0px))] z-20 border-b border-line bg-page/90 backdrop-blur-md print:hidden">
      <div className="mx-auto max-w-[1280px] px-4 py-3 sm:px-6">
        {/* celular */}
        <div className="flex flex-col gap-2 md:hidden">
          <GavetaFiltros />
          <FiltrosAtivos linha />
        </div>
        {/* tablet e computador */}
        <div className="hidden flex-col gap-2 md:flex">
          <div className="flex flex-wrap items-center gap-2">
            <BotaoPeriodo />
            <CamposLugar />
            <CampoOrigem />
            <div className="ml-auto pl-2">
              <ContagemResultado />
            </div>
          </div>
          <FiltrosAtivos />
        </div>
      </div>
    </section>
  )
}

