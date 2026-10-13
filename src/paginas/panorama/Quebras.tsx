// Onde, o quê e quem: região, categoria, bairro e origem. Toda linha é um filtro: tocar aplica
// (e o mapa vai reenquadrar quando existir); tocar de novo tira. Barras em uma cor só (série única).
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { clsx } from 'clsx'
import { Zap } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { EstadoVazio } from '@/componentes/estados/Estados'
import { Card, CabecalhoCard } from '@/componentes/ui/Card'
import type { LinhaQuebra } from '@/calculos/panorama'
import { CATEGORIA_RISCO } from '@/dados/regras'
import { useFiltros } from '@/filtros/useFiltros'
import { corRegiao } from '@/lib/cores'
import { compararTexto, decimal, numero, pct } from '@/lib/formato'

/** Linha clicável com barra: rótulo · barra · valor · complemento (também usada no Prazo) */
export function LinhaBarra({
  rotulo,
  apoio,
  valor,
  maximo,
  complemento,
  ativo,
  aoTocar,
  icone,
  corBarra = 'bg-s1',
  pontoApoio,
  compacta = false,
  textoValor,
}: {
  rotulo: string
  apoio?: string
  valor: number
  maximo: number
  complemento?: ReactNode
  ativo: boolean
  aoTocar: () => void
  icone?: ReactNode
  corBarra?: string
  /** pontinho de cor antes do texto de apoio (ex.: região do bairro) */
  pontoApoio?: string
  /** linha mais baixa com mouse; no toque continua com 44px */
  compacta?: boolean
  /** valor escrito, quando não é contagem (ex.: "4,2%") */
  textoValor?: string
}) {
  const largura = maximo > 0 ? Math.max((valor / maximo) * 100, valor > 0 ? 1.5 : 0) : 0
  return (
    <li>
      <button
        type="button"
        onClick={aoTocar}
        aria-pressed={ativo}
        title={apoio ? `${rotulo} · ${apoio}` : rotulo}
        className={clsx(
          'grid w-full grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_auto] items-center gap-x-3 rounded-md px-2 text-left sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto]',
          compacta ? 'min-h-9 py-1 pointer-coarse:min-h-11' : 'min-h-11 py-1.5',
          ativo ? 'bg-acao-suave' : 'hover:bg-ink/[0.03]',
        )}
      >
        <span className="min-w-0">
          {/* nome quebra em até 2 linhas em vez de cortar ("Direcionamento / ofuscamento") */}
          <span className={clsx('flex items-start gap-1 text-[13px] leading-snug', ativo ? 'font-medium text-ink' : 'text-ink')}>
            {icone && <span className="mt-0.5">{icone}</span>}
            <span className="line-clamp-2">{rotulo}</span>
          </span>
          {apoio && (
            <span className="flex items-center gap-1.5 truncate text-[11px] text-ink-3">
              {pontoApoio && <span aria-hidden className={clsx('size-1.5 shrink-0 rounded-full', pontoApoio)} />}
              {apoio}
            </span>
          )}
        </span>
        <span aria-hidden className="h-2 w-full rounded-full bg-line/60">
          <span className={clsx('block h-full rounded-full', corBarra)} style={{ width: `${largura}%` }} />
        </span>
        <span className="numeros min-w-16 text-right text-[13px] text-ink">
          {textoValor ?? numero(valor)}
          {complemento && <span className="ml-1.5 text-xs text-ink-3">{complemento}</span>}
        </span>
      </button>
    </li>
  )
}

const Vazio = () => <EstadoVazio titulo="Nada no período" texto="Nenhuma saída com esses filtros neste período." altura="min-h-40" />

// ── Regiões: tabela (poucas linhas, várias medidas) ─────────────────────────
// Mesmo comportamento das listas: a linha inteira é tocável, com o mesmo destaque.
export function Regioes({ linhas }: { linhas: LinhaQuebra[] }) {
  const { filtros, mudar } = useFiltros()
  const ordem = [...linhas].sort((a, b) => b.fila - a.fila || compararTexto(a.nome, b.nome))
  const maxFila = Math.max(1, ...ordem.map((l) => l.fila))
  const alternar = (nome: string) => mudar({ regiao: filtros.regiao === nome ? null : nome })
  return (
    <Card aria-labelledby="titulo-regioes" className="overflow-hidden">
      <CabecalhoCard id="titulo-regioes" titulo="Regiões" subtitulo="Fila de agora e desempenho no período. Toque numa região para filtrar." />
      <div className="mt-2 overflow-x-auto px-3 pb-3">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <caption className="sr-only">Regiões: fila de agora, em atraso, saídas no período, no prazo e tempo médio</caption>
          <thead>
            <tr className="text-left text-[11px] tracking-[0.4px] text-ink-3 uppercase">
              <th scope="col" className="py-2 pr-2 pl-2 font-medium">Região</th>
              <th scope="col" className="px-2 py-2 font-medium">Fila agora</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Atraso</th>
              <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">Saídas</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">No prazo</th>
              <th scope="col" className="hidden py-2 pr-2 pl-2 text-right font-medium sm:table-cell">Tempo médio</th>
            </tr>
          </thead>
          <tbody className="numeros">
            {ordem.map((l) => {
              const ativo = filtros.regiao === l.nome
              const celula = clsx('py-2.5 first:rounded-l-md last:rounded-r-md', ativo ? 'bg-acao-suave' : 'group-hover:bg-ink/[0.03]')
              return (
                <tr key={l.nome} onClick={() => alternar(l.nome)} className="group cursor-pointer">
                  <th scope="row" className={clsx(celula, 'pr-2 pl-2 text-left font-normal')}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        alternar(l.nome)
                      }}
                      aria-pressed={ativo}
                      className={clsx('flex min-h-6 items-center gap-2 text-left', ativo ? 'font-medium text-ink' : 'text-ink')}
                    >
                      <span aria-hidden className={clsx('size-2.5 shrink-0 rounded-full', corRegiao(l.nome))} />
                      {l.nome}
                    </button>
                  </th>
                  <td className={clsx(celula, 'px-2')}>
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="h-2 w-16 rounded-full bg-line/60 sm:w-24">
                        <span className="block h-full rounded-full bg-s1" style={{ width: `${(l.fila / maxFila) * 100}%` }} />
                      </span>
                      {numero(l.fila)}
                    </span>
                  </td>
                  <td className={clsx(celula, 'px-2 text-right', l.atraso > 0 ? 'text-atraso-texto' : 'text-ink-3')}>{numero(l.atraso)}</td>
                  <td className={clsx(celula, 'hidden px-2 text-right text-ink sm:table-cell')}>{numero(l.saidas)}</td>
                  <td className={clsx(celula, 'px-2 text-right text-ink')}>{l.pctNoPrazo === null ? '—' : `${decimal(l.pctNoPrazo)}%`}</td>
                  <td className={clsx(celula, 'hidden pr-2 pl-2 text-right text-ink sm:table-cell')}>
                    {l.tempoMedio === null ? '—' : `${decimal(l.tempoMedio)} d`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Categorias (revisadas): o que mais se pede ─────────────────────────────
// Quando uma categoria passa do dobro da segunda (hoje "Lâmpada apagada", ~83%), ela sai da
// escala: vira um destaque com a sua fatia, e as demais ganham escala própria (senão viram tracinhos).
export function Categorias({ linhas, total }: { linhas: LinhaQuebra[]; total: number }) {
  const { filtros, mudar } = useFiltros()
  const ordem = linhas.filter((l) => l.saidas > 0 || l.nome === filtros.categoria).sort((a, b) => b.saidas - a.saidas)
  const domina = ordem.length > 2 && ordem[0].saidas > 2 * ordem[1].saidas ? ordem[0] : null
  const demais = domina ? ordem.slice(1) : ordem
  const somaDemais = demais.reduce((s, l) => s + l.saidas, 0)
  const max = Math.max(1, ...demais.map((l) => l.saidas))
  const alternar = (nome: string) => mudar({ categoria: filtros.categoria === nome ? null : nome })
  const linha = (l: LinhaQuebra) => (
    <LinhaBarra
      key={l.nome}
      rotulo={l.nome}
      valor={l.saidas}
      maximo={max}
      complemento={pct(l.saidas, total)}
      apoio={l.fila > 0 ? `${numero(l.fila)} na fila agora` : undefined}
      ativo={filtros.categoria === l.nome}
      aoTocar={() => alternar(l.nome)}
      corBarra={l.nome === CATEGORIA_RISCO ? 'bg-risco' : 'bg-s1'}
      icone={l.nome === CATEGORIA_RISCO ? <Zap aria-label="risco" className="size-3.5 shrink-0 text-risco-texto" /> : undefined}
    />
  )
  return (
    <Card aria-labelledby="titulo-categorias">
      <CabecalhoCard id="titulo-categorias" titulo="O que mais se pede" subtitulo="Saídas no período por categoria revisada." />
      <div className="px-3 pt-2 pb-3">
        {ordem.length === 0 ? (
          <Vazio />
        ) : (
          <>
            {domina && (
              <button
                type="button"
                onClick={() => alternar(domina.nome)}
                aria-pressed={filtros.categoria === domina.nome}
                className={clsx(
                  'mb-2 w-full rounded-lg px-2 py-2 text-left',
                  filtros.categoria === domina.nome ? 'bg-acao-suave' : 'hover:bg-ink/[0.03]',
                )}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-medium text-ink">{domina.nome}</span>
                  <span className="numeros text-[13px] text-ink">
                    {numero(domina.saidas)} <span className="text-xs text-ink-3">{pct(domina.saidas, total)} das saídas</span>
                  </span>
                </span>
                {/* fatia da dominante x resto, numa barra só */}
                <span aria-hidden className="mt-2 flex h-2.5 gap-[2px] overflow-hidden rounded-full">
                  <span className="bg-s1" style={{ flexGrow: domina.saidas }} />
                  <span className="bg-s1/35" style={{ flexGrow: somaDemais }} />
                </span>
                <span className="mt-1 block text-[11px] text-ink-3">{numero(domina.fila)} na fila agora</span>
              </button>
            )}
            {domina && (
              <p className="border-t border-line px-2 pt-3 pb-1 text-xs text-ink-2">
                Demais categorias · <span className="numeros">{numero(somaDemais)}</span> ({pct(somaDemais, total)}) — escala própria
              </p>
            )}
            <ul>{demais.map(linha)}</ul>
          </>
        )}
      </div>
    </Card>
  )
}

// ── Bairros: alternar entre "maior fila agora" e "mais pedidos no período" ──
export function Bairros({
  linhas,
  regiaoDe,
  className,
}: {
  linhas: LinhaQuebra[]
  regiaoDe: (bairro: string) => string
  className?: string
}) {
  const { filtros, mudar } = useFiltros()
  const [modo, setModo] = useState<'fila' | 'saidas'>('fila')
  const [todos, setTodos] = useState(false)
  const campo = modo === 'fila' ? 'fila' : 'saidas'
  const ordem = linhas.filter((l) => l[campo] > 0).sort((a, b) => b[campo] - a[campo] || compararTexto(a.nome, b.nome))
  const visiveis = ordem.slice(0, todos ? 30 : 12)
  const max = Math.max(1, ...visiveis.map((l) => l[campo]))
  return (
    <Card aria-labelledby="titulo-bairros" className={clsx('flex flex-col', className)}>
      <CabecalhoCard
        id="titulo-bairros"
        titulo="Bairros"
        subtitulo={modo === 'fila' ? 'Onde a fila de agora está maior.' : 'Onde mais saiu serviço no período.'}
        acao={
          <ToggleGroup
            aria-label="Ordenar bairros por"
            value={[modo]}
            onValueChange={(v) => v[0] && setModo(v[0] as 'fila' | 'saidas')}
            className="flex h-9 items-center rounded-full border border-line bg-page p-0.5"
          >
            {[
              { v: 'fila', t: 'Fila agora' },
              { v: 'saidas', t: 'No período' },
            ].map((o) => (
              <Toggle
                key={o.v}
                value={o.v}
                className="pressionavel h-full rounded-full px-3 text-xs text-ink-2 data-pressed:bg-card data-pressed:font-medium data-pressed:text-ink data-pressed:shadow-1"
              >
                {o.t}
              </Toggle>
            ))}
          </ToggleGroup>
        }
      />
      <div className="flex flex-1 flex-col px-3 pt-2 pb-3">
        {visiveis.length === 0 ? (
          modo === 'fila' ? (
            <EstadoVazio titulo="Fila zerada" texto="Nenhum serviço em aberto com esses filtros." altura="min-h-40" />
          ) : (
            <Vazio />
          )
        ) : (
          <>
            <ol>
              {visiveis.map((l) => (
                <LinhaBarra
                  key={l.nome}
                  rotulo={l.nome}
                  apoio={regiaoDe(l.nome)}
                  pontoApoio={corRegiao(regiaoDe(l.nome))}
                  valor={l[campo]}
                  maximo={max}
                  complemento={modo === 'fila' && l.atraso > 0 ? `${pct(l.atraso, l.fila)} atr.` : undefined}
                  ativo={filtros.bairro === l.nome}
                  aoTocar={() =>
                    filtros.bairro === l.nome ? mudar({ bairro: null }) : mudar({ regiao: regiaoDe(l.nome), bairro: l.nome })
                  }
                />
              ))}
            </ol>
            {ordem.length > 12 && (
              <button
                type="button"
                onClick={() => setTodos((v) => !v)}
                className="mt-auto h-10 w-full rounded-md pt-1 text-[13px] font-medium text-acao hover:bg-ink/[0.03]"
              >
                {todos ? 'Mostrar só os 12 primeiros' : `Mostrar até 30 (de ${numero(ordem.length)})`}
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

// ── Quem pede (origem) ─────────────────────────────────────────────────────
export function Origens({ linhas, total, className }: { linhas: LinhaQuebra[]; total: number; className?: string }) {
  const { filtros, mudar } = useFiltros()
  const ordem = linhas.filter((l) => l.saidas > 0 || l.nome === filtros.origem).sort((a, b) => b.saidas - a.saidas)
  const max = Math.max(1, ...ordem.map((l) => l.saidas))
  return (
    <Card aria-labelledby="titulo-origens" className={className}>
      <CabecalhoCard id="titulo-origens" titulo="Quem pede" subtitulo="De onde vieram as saídas do período." />
      <div className="px-3 pt-2 pb-3">
        {ordem.length === 0 ? (
          <Vazio />
        ) : (
          <ul>
            {ordem.map((l) => (
              <LinhaBarra
                key={l.nome}
                rotulo={l.nome}
                valor={l.saidas}
                maximo={max}
                complemento={pct(l.saidas, total)}
                ativo={filtros.origem === l.nome}
                aoTocar={() => mudar({ origem: filtros.origem === l.nome ? null : l.nome })}
                compacta
              />
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
