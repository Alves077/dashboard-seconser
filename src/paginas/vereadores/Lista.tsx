// Lista dos vereadores: cartões com foto para os que mais pediram no período, os demais numa lista
// compacta e a linha das indicações da Câmara sem o nome. Tocar abre o perfil (filtro origem + quem).
// Sem cores de bom/ruim e sem prazo por vereador (ver calculos/vereadores.ts).
import { clsx } from 'clsx'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { EstadoVazio } from '@/componentes/estados/Estados'
import { FotoVereador } from '@/componentes/ui/FotoVereador'
import { Card, CabecalhoCard } from '@/componentes/ui/Card'
import type { DadosVereadores, LinhaVereador } from '@/calculos/vereadores'
import type { Periodo } from '@/filtros/filtros'
import { fraseQuando } from '@/filtros/frases'
import { numero, pct, plural } from '@/lib/formato'

const B = ({ children }: { children: ReactNode }) => <strong className="font-medium text-ink">{children}</strong>

function Resumo({ d, periodo }: { d: DadosVereadores; periodo: Periodo }) {
  const quando = fraseQuando(periodo, d.intervalo, null)
  if (d.pedidos === 0)
    return (
      <p className="text-[15px] leading-relaxed text-ink-2">
        {quando}, nenhum pedido de vereador com esses filtros.
        {d.emAberto > 0 && (
          <>
            {' '}
            Hoje há <B>{plural(d.emAberto, 'pedido', 'pedidos')}</B> de vereador em aberto, de antes.
          </>
        )}
      </p>
    )
  return (
    <p className="text-[15px] leading-relaxed text-ink-2">
      {quando}, chegaram <B>{plural(d.pedidos, 'pedido', 'pedidos')}</B> de vereador
      {d.vereadoresComPedido > 0 && <> ({plural(d.vereadoresComPedido, 'vereador', 'vereadores')} com nome identificado)</>}
      {d.pedidosTodos > 0 && <>, {pct(d.pedidos, d.pedidosTodos)} de todos os pedidos</>}. Hoje{' '}
      {d.emAberto === 0 ? (
        'nenhum está em aberto'
      ) : (
        <>
          <B>{numero(d.emAberto)}</B> {d.emAberto === 1 ? 'está' : 'estão'} em aberto
          {d.indicacoesAbertas > 0 && (
            <>
              , <B>{numero(d.indicacoesAbertas)}</B> {d.indicacoesAbertas === 1 ? 'deles é indicação legislativa' : 'deles indicações legislativas'}
            </>
          )}
        </>
      )}
      .
    </p>
  )
}

function Cartao({ l, aoAbrir }: { l: LinhaVereador; aoAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={aoAbrir}
      className="pressionavel group flex h-full w-full flex-col items-center rounded-xl border border-line bg-card px-3 pt-4 pb-3 text-center shadow-1 hover:border-acao/40"
    >
      <FotoVereador vereador={l.vereador} className="size-16" prioridade />
      {/* até 3 linhas: nome é o que identifica ("Professora Ana Cláudia Bittencourt de Albuquerque Mello") */}
      <span className="mt-2.5 line-clamp-3 min-h-[2.5em] text-[13px] leading-tight font-medium text-ink" title={l.nome}>
        {l.nome}
      </span>
      <span className="numeros mt-2 text-[28px] leading-none font-light tracking-[-0.5px] text-ink">{numero(l.pedidos)}</span>
      <span className="mt-1 text-[11px] text-ink-3">{l.pedidos === 1 ? 'pedido' : 'pedidos'} no período</span>
      {/* duas linhas sempre (numa só, quebrava em uns e não em outros e desalinhava os cartões) */}
      <span className="numeros mt-2 w-full border-t border-line pt-2 text-[11px] leading-snug text-ink-2">
        <span className="block">{numero(l.executados)} {l.executados === 1 ? 'executado' : 'executados'}</span>
        <span className="block">{numero(l.emAberto)} em aberto hoje</span>
        {/* sempre 3 linhas: os cartões da mesma fileira ficam alinhados */}
        <span className={clsx('block', l.indicacoesAbertas > 0 ? 'font-medium text-acao-press' : 'text-ink-3')}>
          {l.indicacoesAbertas > 0
            ? `${numero(l.indicacoesAbertas)} ${l.indicacoesAbertas === 1 ? 'indicação' : 'indicações'} em aberto`
            : 'nenhuma indicação em aberto'}
        </span>
      </span>
    </button>
  )
}

function Linha({ l, aoAbrir, nota }: { l: LinhaVereador; aoAbrir: () => void; nota?: string }) {
  return (
    <li className="border-b border-line last:border-b-0 lg:odd:border-r lg:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
      <button type="button" onClick={aoAbrir} className="group flex min-h-14 w-full items-center gap-3 px-5 py-2 text-left hover:bg-realce">
        <FotoVereador vereador={l.vereador} className="size-9" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] text-ink" title={l.nome}>
            {l.nome}
          </span>
          {nota && <span className="block truncate text-[11px] text-ink-3">{nota}</span>}
        </span>
        <span className="numeros shrink-0 text-right text-[13px] text-ink">
          {numero(l.pedidos)} <span className="text-xs text-ink-3">{l.pedidos === 1 ? 'pedido' : 'pedidos'}</span>
          <span className="block text-[11px] text-ink-3">
            {numero(l.emAberto)} em aberto
            {l.indicacoesAbertas > 0 && (
              <span className="font-medium text-acao-press"> · {plural(l.indicacoesAbertas, 'indicação', 'indicações')}</span>
            )}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" />
      </button>
    </li>
  )
}

export function Lista({ d, periodo, aoAbrir }: { d: DadosVereadores; periodo: Periodo; aoAbrir: (nome: string) => void }) {
  const vazio = d.destaques.length === 0 && d.outros.length === 0 && !d.semNome
  return (
    <>
      <div className="mb-6">
        <Resumo d={d} periodo={periodo} />
      </div>
      {vazio ? (
        <Card>
          <EstadoVazio titulo="Nenhum pedido de vereador" texto="Nada no período nem em aberto com esses filtros." altura="min-h-60" />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {d.destaques.length > 0 && (
            <section aria-labelledby="titulo-mais-pediram">
              <h2 id="titulo-mais-pediram" className="mb-3 text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">
                Mais pedidos no período · {d.intervalo.rotulo}
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {d.destaques.map((l) => (
                  <li key={l.nome}>
                    <Cartao l={l} aoAbrir={() => aoAbrir(l.nome)} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(d.outros.length > 0 || d.semNome) && (
            <Card aria-labelledby="titulo-outros">
              <CabecalhoCard
                id="titulo-outros"
                titulo={d.destaques.length > 0 ? 'Demais vereadores' : 'Vereadores'}
                subtitulo="Pedidos no período e em aberto hoje. Toque para ver os pedidos de cada um."
              />
              <ul className="mt-3 grid grid-cols-1 border-t border-line lg:grid-cols-2">
                {d.outros.map((l) => (
                  <Linha key={l.nome} l={l} aoAbrir={() => aoAbrir(l.nome)} />
                ))}
                {d.semNome && (
                  <Linha l={d.semNome} aoAbrir={() => aoAbrir(d.semNome!.nome)} nota="Indicação da Câmara cujo autor não foi encontrado" />
                )}
              </ul>
            </Card>
          )}
          <p className="text-xs text-ink-3">
            Aqui aparece o que cada vereador pediu e em que pé está. Prazo e tempo de atendimento ficam no Prazo e na
            Evolução: dependem da equipe, não de quem pediu.
          </p>
        </div>
      )}
    </>
  )
}
