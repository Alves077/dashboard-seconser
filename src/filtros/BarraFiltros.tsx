import { Drawer } from '@base-ui/react/drawer'
import { Popover } from '@base-ui/react/popover'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { CalendarRange, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Selecao } from '@/componentes/ui/Selecao'
import { useBase } from '@/dados/consultas'
import { compararTexto, numero } from '@/lib/formato'
import { useHoje } from '@/lib/ganchos'
import { aplicarFiltros, contarAtivos, type FiltroSituacao } from './filtros'
import { PainelPeriodo } from './PainelPeriodo'
import { useFiltros } from './useFiltros'
import { useResumoPeriodo } from './useResumoPeriodo'

const SITUACOES: { v: FiltroSituacao; texto: string }[] = [
  { v: 'todas', texto: 'Todas' },
  { v: 'abertos', texto: 'Abertos' },
  { v: 'atraso', texto: 'Em atraso' },
  { v: 'ok', texto: 'Concluídos' },
]

function useOpcoes() {
  const { data: base } = useBase()
  const { filtros } = useFiltros()
  return useMemo(() => {
    if (!base) return { regioes: [], bairros: [], categorias: [] }
    const regioes = [...new Set(base.bairros.map((b) => b.regiao))].sort(compararTexto)
    const bairros = base.bairros
      .filter((b) => !filtros.regiao || b.regiao === filtros.regiao)
      .map((b) => ({ valor: b.nome, texto: b.nome }))
    const categorias = base.categorias.map((c) => ({ valor: c.nome, texto: c.nome }))
    return { regioes: regioes.map((r) => ({ valor: r, texto: r })), bairros, categorias }
  }, [base, filtros.regiao])
}

function SeletorSituacao() {
  const { filtros, mudar } = useFiltros()
  return (
    <ToggleGroup
      aria-label="Situação"
      value={[filtros.situacao]}
      onValueChange={(v) => mudar({ situacao: (v[0] as FiltroSituacao) ?? 'todas' })}
      className="flex h-11 items-center rounded-full border border-line bg-page p-1"
    >
      {SITUACOES.map((s) => (
        <Toggle
          key={s.v}
          value={s.v}
          className="pressionavel h-full rounded-full px-3 text-[13px] whitespace-nowrap text-ink-2 hover:text-ink data-pressed:bg-card data-pressed:font-medium data-pressed:text-ink data-pressed:shadow-1"
        >
          {s.texto}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}

function CamposLugar({ empilhado = false }: { empilhado?: boolean }) {
  const { filtros, mudar } = useFiltros()
  const { regioes, bairros, categorias } = useOpcoes()
  const classe = empilhado ? '' : 'w-44'
  return (
    <>
      <Selecao
        rotulo="Região"
        vazio="Todas as regiões"
        opcoes={regioes}
        value={filtros.regiao ?? ''}
        onChange={(e) => mudar({ regiao: e.target.value || null })}
        className={classe}
      />
      <Selecao
        rotulo="Bairro"
        vazio={filtros.regiao ? `Todos de ${filtros.regiao}` : 'Todos os bairros'}
        opcoes={bairros}
        value={filtros.bairro ?? ''}
        onChange={(e) => mudar({ bairro: e.target.value || null })}
        className={classe}
      />
      <Selecao
        rotulo="Categoria"
        vazio="Todas as categorias"
        opcoes={categorias}
        value={filtros.categoria ?? ''}
        onChange={(e) => mudar({ categoria: e.target.value || null })}
        className={empilhado ? '' : 'w-56'}
      />
    </>
  )
}

function BotaoPeriodo() {
  const resumo = useResumoPeriodo()
  const [aberto, setAberto] = useState(false)
  return (
    <Popover.Root open={aberto} onOpenChange={setAberto}>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">Período</span>
        <Popover.Trigger className="pressionavel flex h-11 max-w-72 items-center gap-2 rounded-md border border-line-input bg-card pr-3 pl-3 text-left text-ink hover:border-acao/50">
          <CalendarRange aria-hidden className="size-4 shrink-0 text-ink-3" />
          <span className="truncate">{resumo}</span>
          <ChevronDown aria-hidden className="ml-auto size-4 shrink-0 text-ink-3" />
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" className="z-40">
          <Popover.Popup className="w-[min(560px,calc(100vw-2rem))] origin-(--transform-origin) rounded-xl border border-line bg-card p-4 shadow-2 transition-[opacity,scale] duration-200 ease-saida data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
            <Popover.Title className="sr-only">Período</Popover.Title>
            <PainelPeriodo aoEscolher={() => setAberto(false)} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** Chips dos filtros ativos, cada um com × — o caminho de volta claro (DESIGN.md §8) */
function FiltrosAtivos() {
  const { filtros, mudar, limpar } = useFiltros()
  const chips: { texto: string; tirar: () => void }[] = []
  if (filtros.regiao) chips.push({ texto: `Região: ${filtros.regiao}`, tirar: () => mudar({ regiao: null }) })
  if (filtros.bairro) chips.push({ texto: `Bairro: ${filtros.bairro}`, tirar: () => mudar({ bairro: null }) })
  if (filtros.categoria) chips.push({ texto: filtros.categoria, tirar: () => mudar({ categoria: null }) })
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.texto}
          type="button"
          onClick={c.tirar}
          className="pressionavel inline-flex h-8 items-center gap-1.5 rounded-full bg-acao-suave pr-2 pl-3 text-xs font-medium text-acao-press"
          aria-label={`Tirar filtro ${c.texto}`}
        >
          {c.texto}
          <X aria-hidden className="size-3.5" />
        </button>
      ))}
      {contarAtivos(filtros) > 1 && (
        <button type="button" onClick={limpar} className="h-8 px-2 text-xs text-ink-2 underline-offset-2 hover:text-ink hover:underline">
          Limpar tudo
        </button>
      )}
    </div>
  )
}

function ContagemResultado() {
  const { data: base } = useBase()
  const { filtros } = useFiltros()
  const hoje = useHoje()
  const n = useMemo(() => (base ? aplicarFiltros(base.saidas, filtros, hoje).saidas.length : null), [base, filtros, hoje])
  if (n === null) return null
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
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">Situação</span>
                  <SeletorSituacao />
                </div>
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
    <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-20 border-b border-line bg-page/90 backdrop-blur-md print:hidden">
      <div className="mx-auto max-w-[1280px] px-4 py-3 sm:px-6">
        {/* celular */}
        <div className="md:hidden">
          <GavetaFiltros />
        </div>
        {/* tablet e computador */}
        <div className="hidden flex-col gap-3 md:flex">
          <div className="flex flex-wrap items-end gap-3">
            <BotaoPeriodo />
            <CamposLugar />
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">Situação</span>
              <SeletorSituacao />
            </div>
            <div className="ml-auto pb-3">
              <ContagemResultado />
            </div>
          </div>
          <FiltrosAtivos />
        </div>
      </div>
    </div>
  )
}

