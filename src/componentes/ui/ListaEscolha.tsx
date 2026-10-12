// Lista de escolha da barra de filtros (computador): altura máxima com rolagem, contagem em cinza
// alinhada à direita, opção sem dado visível mas desabilitada, grupos (bairros por região) e busca
// por digitação (tecla a tecla, nativa do Base UI). No celular a gaveta usa o <select> do sistema.
import { Select } from '@base-ui/react/select'
import { clsx } from 'clsx'
import { Check, ChevronDown } from 'lucide-react'
import { Fragment } from 'react'
import { numero } from '@/lib/formato'

export interface OpcaoLista {
  valor: string
  texto: string
  contagem?: number
  desabilitada?: boolean
  grupo?: string
  /** classe de cor de um pontinho à esquerda (identidade, ex.: região) */
  ponto?: string
}

const TODAS = '__todas__'

export function ListaEscolha({
  rotulo,
  valor,
  vazio,
  opcoes,
  aoMudar,
  className,
}: {
  rotulo: string
  valor: string | null
  vazio: string
  opcoes: OpcaoLista[]
  aoMudar: (v: string | null) => void
  className?: string
}) {
  const itens = [{ value: TODAS, label: vazio }, ...opcoes.map((o) => ({ value: o.valor, label: o.texto }))]
  const grupos = [...new Set(opcoes.map((o) => o.grupo ?? ''))]

  const item = (o: OpcaoLista) => (
    <Select.Item
      key={o.valor}
      value={o.valor}
      disabled={o.desabilitada}
      className="grid min-h-10 cursor-default grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md pr-4 pl-2 text-[13px] text-ink outline-none select-none data-disabled:opacity-40 data-highlighted:bg-acao-suave"
    >
      <Select.ItemIndicator className="col-start-1 text-acao">
        <Check aria-hidden className="size-4" />
      </Select.ItemIndicator>
      <span className="col-start-2 flex min-w-0 items-center gap-2">
        {o.ponto && <span aria-hidden className={clsx('size-2 shrink-0 rounded-full', o.ponto)} />}
        <Select.ItemText className="truncate">{o.texto}</Select.ItemText>
      </span>
      {o.contagem !== undefined && <span className="numeros col-start-3 text-xs text-ink-3">{numero(o.contagem)}</span>}
    </Select.Item>
  )

  return (
    <Select.Root
      items={itens}
      value={valor ?? TODAS}
      onValueChange={(v) => aoMudar(v === TODAS || v === null ? null : String(v))}
    >
      <Select.Trigger
        aria-label={rotulo}
        title={rotulo}
        className={clsx(
          'pressionavel flex h-11 min-w-0 items-center gap-2 rounded-md border bg-card pr-3 pl-3 text-left hover:border-acao/50 data-popup-open:border-acao',
          valor ? 'border-acao/60 text-ink' : 'border-line-input text-ink',
          className,
        )}
      >
        <Select.Value className="min-w-0 flex-1 truncate" />
        <Select.Icon className="shrink-0 text-ink-3">
          <ChevronDown aria-hidden className="size-4" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} alignItemWithTrigger={false} align="start" className="z-50 outline-none">
          <Select.Popup className="min-w-[max(var(--anchor-width),15rem)] origin-(--transform-origin) rounded-xl border border-line bg-card p-1 shadow-2 transition-[opacity,scale] duration-150 ease-saida outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
            <Select.List className="max-h-[min(22rem,var(--available-height))] scroll-py-2 overflow-y-auto overscroll-contain pr-1">
              <Select.Item
                value={TODAS}
                className="grid min-h-10 cursor-default grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-md pr-4 pl-2 text-[13px] font-medium text-ink outline-none select-none data-highlighted:bg-acao-suave"
              >
                <Select.ItemIndicator className="col-start-1 text-acao">
                  <Check aria-hidden className="size-4" />
                </Select.ItemIndicator>
                <Select.ItemText className="col-start-2">{vazio}</Select.ItemText>
              </Select.Item>
              {grupos.map((g) =>
                g ? (
                  <Select.Group key={g} className="mt-1 border-t border-line pt-1">
                    <Select.GroupLabel className="px-2 pt-1.5 pb-1 text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">
                      {g}
                    </Select.GroupLabel>
                    {opcoes.filter((o) => o.grupo === g).map(item)}
                  </Select.Group>
                ) : (
                  <Fragment key="sem-grupo">{opcoes.filter((o) => !o.grupo).map(item)}</Fragment>
                ),
              )}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
