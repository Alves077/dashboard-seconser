// Ficha do serviço: abre de qualquer lugar (mapa, listas, busca, relatórios) pela URL ?servico=…
// Computador: painel à direita. Celular: folha de baixo (arrastar para fechar).
import { Drawer } from '@base-ui/react/drawer'
import { clsx } from 'clsx'
import { FileText, ImageOff, Images, Lightbulb, Lock, MapPin, X } from 'lucide-react'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { EstadoVazio, Esqueleto } from '@/componentes/estados/Estados'
import { useInterface } from '@/componentes/layout/interface'
import { Botao } from '@/componentes/ui/Botao'
import { SeloRisco, SeloSituacao } from '@/componentes/ui/SeloSituacao'
import { useBase, useDetalhes, useFotos } from '@/dados/consultas'
import { CATEGORIA_RISCO, diasEmAberto, diasExecucao, noPrazo, prazo, situacao, ultimaSaida } from '@/dados/regras'
import { useSessao } from '@/dados/sessao'
import type { Saida, Servico } from '@/dados/tipos'
import { formatarDia } from '@/lib/datas'
import { dias } from '@/lib/formato'
import { useDestino, useFicha, useHoje, useMidia } from '@/lib/ganchos'
import { VisualizadorFotos } from './VisualizadorFotos'

const MiniMapa = lazy(() => import('@/mapa/MiniMapa'))

const ORIGEM_TIPO = { post: 'Aberto pela central / regional', event: 'Aberto pelo cidadão no Colab' }

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-4">
      <h3 className="mb-2 text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">{titulo}</h3>
      {children}
    </section>
  )
}

/** Linha do tempo das saídas: saída → retorno (ou em aberto), reaberturas em sequência */
function Historico({ servico }: { servico: Servico }) {
  const hoje = useHoje()
  return (
    <ol className="relative flex flex-col gap-4 pl-5 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-line">
      {servico.saidas.map((s: Saida) => {
        const sit = situacao(s, hoje)
        const exec = diasExecucao(s)
        return (
          <li key={s.ordem} className="relative">
            <span
              aria-hidden
              className={clsx(
                'absolute top-1.5 -left-5 size-[11px] rounded-full ring-2 ring-card',
                sit === 'ok' ? 'bg-ok' : sit === 'atraso' ? 'bg-atraso' : 'bg-andamento',
              )}
            />
            <p className="text-[13px] font-medium text-ink">
              {s.ordem === 1 ? 'Saída para a rua' : `${s.ordem - 1}ª reabertura`} · {formatarDia(s.dataSaida)}
            </p>
            <p className="numeros mt-0.5 text-[13px] text-ink-2">
              {exec !== null ? (
                <>
                  Executado em {formatarDia(s.dataRetorno)} — {dias(exec)}
                  {noPrazo(s) ? ', no prazo' : ', fora do prazo'}
                </>
              ) : (
                <>
                  Em aberto há {dias(diasEmAberto(s, hoje))} · prazo {formatarDia(prazo(s))}
                </>
              )}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

function Fotos({ chave }: { chave: string }) {
  const { acesso } = useDetalhes()
  const { data, isLoading, isError } = useFotos(chave, acesso)
  const [aberta, setAberta] = useState<number | null>(null)
  if (isLoading)
    return (
      <div className="grid grid-cols-3 gap-2">
        <Esqueleto className="aspect-square" />
        <Esqueleto className="aspect-square" />
      </div>
    )
  if (isError) return <p className="text-[13px] text-ink-3">Não foi possível carregar as fotos.</p>
  if (!data?.length)
    return (
      <p className="flex items-center gap-2 text-[13px] text-ink-3">
        <ImageOff aria-hidden className="size-4" /> Nenhuma foto neste serviço.
      </p>
    )
  return (
    <>
      <ul className="grid grid-cols-3 gap-2">
        {data.map((f, i) => (
          <li key={f.url}>
            <button
              type="button"
              onClick={() => setAberta(i)}
              aria-label={`Ampliar foto ${i + 1} de ${data.length}`}
              className="pressionavel block w-full cursor-zoom-in overflow-hidden rounded-md bg-line"
            >
              <img
                src={f.url}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="aspect-square w-full object-cover transition-opacity duration-150 hover:opacity-90"
              />
            </button>
          </li>
        ))}
      </ul>
      <VisualizadorFotos fotos={data} indice={aberta} aoMudar={setAberta} aoFechar={() => setAberta(null)} />
    </>
  )
}

// O que fica escondido sem acesso (a largura da linha apagada imita o tamanho do conteúdo)
const ITENS_RESTRITOS = [
  { icone: FileText, nome: 'Descrição', largura: 'flex-1' },
  { icone: MapPin, nome: 'Endereço', largura: 'w-1/2' },
  { icone: Images, nome: 'Fotos', largura: 'w-1/3' },
]

/** Descrição, endereço e fotos — só para quem tem acesso */
function ParteRestrita({ servico }: { servico: Servico }) {
  const { modo, usuario } = useSessao()
  const { data, acesso } = useDetalhes()
  const { setLoginAberto } = useInterface()

  if (acesso === undefined)
    return (
      <Bloco titulo="Descrição e endereço">
        <Esqueleto className="mb-2 h-4 w-full" />
        <Esqueleto className="h-4 w-2/3" />
      </Bloco>
    )

  if (!acesso)
    return (
      <Bloco titulo="Descrição, endereço e fotos">
        <div className="rounded-xl border border-line bg-page p-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-realce-forte px-2 py-0.5 text-xs font-medium text-ink-2">
            <Lock aria-hidden className="size-3.5" /> Restrito
          </span>
          {/* O que existe aqui, sem mostrar o conteúdo: linhas apagadas no lugar do texto */}
          <ul aria-hidden className="mt-3 flex flex-col gap-2.5 select-none">
            {ITENS_RESTRITOS.map(({ icone: Icone, nome, largura }) => (
              <li key={nome} className="flex items-center gap-3">
                <Icone className="size-4 shrink-0 text-ink-3" />
                <span className="w-[72px] shrink-0 text-[13px] text-ink-3">{nome}</span>
                <span className={clsx('h-2.5 rounded-full bg-ink/10', largura)} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-ink-2">
            {usuario
              ? 'Sua conta não tem acesso à parte restrita. Fale com o administrador.'
              : 'Só para usuários autorizados: a descrição pode citar ruas, comércios e pessoas.'}
          </p>
          {!usuario && modo === 'supabase' && (
            <Botao variante="primario" tamanho="normal" className="mt-3 w-full" onClick={() => setLoginAberto(true)}>
              <Lock aria-hidden className="size-4" /> Entrar para ver
            </Botao>
          )}
        </div>
      </Bloco>
    )

  const d = data?.get(servico.chave)
  return (
    <>
      <Bloco titulo="Descrição">
        <p className="text-sm leading-relaxed whitespace-pre-line text-ink">{d?.descricao ?? 'Sem descrição tratada.'}</p>
      </Bloco>
      <Bloco titulo="Endereço">
        <p className="text-sm text-ink">{d?.endereco ?? '—'}</p>
        {d?.local && <p className="mt-1 text-[13px] text-ink-2">Local: {d.local}</p>}
        {d?.mudouLogradouro && (
          <p className="mt-1 text-xs text-ink-3">Endereço corrigido no tratamento (diferente do aberto no Colab).</p>
        )}
      </Bloco>
      <Bloco titulo="Fotos">
        <Fotos chave={servico.chave} />
      </Bloco>
    </>
  )
}

function Conteudo({ servico }: { servico: Servico }) {
  const hoje = useHoje()
  const destino = useDestino()
  // já no Mapa, o próprio mapa voa até o pino: o link "Ver no mapa" seria redundante
  const naPaginaMapa = useLocation().pathname === '/mapa'
  const atual = ultimaSaida(servico.saidas)
  const sit = situacao(atual, hoje)

  return (
    <>
      <header className="px-5 pt-5 pb-4">
        <p className="text-xs text-ink-3">{ORIGEM_TIPO[servico.type]}</p>
        <Drawer.Title className="numeros mt-0.5 text-[22px] font-light tracking-[-0.4px] text-ink">
          Serviço {servico.idColab}
        </Drawer.Title>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <SeloSituacao
            situacao={sit}
            texto={sit === 'ok' ? undefined : `${sit === 'atraso' ? 'Em atraso' : 'Em atendimento'} · ${dias(diasEmAberto(atual, hoje))}`}
          />
          {servico.categoria === CATEGORIA_RISCO && sit !== 'ok' && <SeloRisco />}
          {servico.led && (
            <span className="inline-flex items-center gap-1 rounded-full bg-s1/10 px-2 py-0.5 text-xs font-medium text-ink-2 ring-1 ring-s1/25 ring-inset">
              <Lightbulb aria-hidden className="size-3.5" /> Via modernizada (LED)
            </span>
          )}
        </div>
      </header>

      <Bloco titulo="Problema">
        <p className="text-[15px] font-medium text-ink">{servico.categoria ?? 'Sem categoria revisada'}</p>
        {servico.categoriaColab && servico.categoriaColab !== servico.categoria && (
          <p className="mt-0.5 text-xs text-ink-3">Aberto no Colab como “{servico.categoriaColab}”</p>
        )}
      </Bloco>

      <Bloco titulo="Onde">
        <p className="text-sm text-ink">
          {servico.bairro} <span className="text-ink-3">·</span> {servico.regiao}
        </p>
        {servico.lat !== null && servico.lng !== null && (
          <div className="mt-3 overflow-hidden rounded-lg border border-line">
            <Suspense fallback={<Esqueleto className="h-48 w-full rounded-none" />}>
              <MiniMapa lat={servico.lat} lng={servico.lng} situacao={sit} />
            </Suspense>
          </div>
        )}
        {servico.lat !== null && !naPaginaMapa && (
          <Link
            to={destino('/mapa', { servico: servico.chave })}
            className="mt-2 inline-flex h-9 items-center gap-1.5 text-[13px] font-medium text-acao hover:underline"
          >
            <MapPin aria-hidden className="size-4" /> Ver no mapa
          </Link>
        )}
      </Bloco>

      <Bloco titulo="Quem pediu">
        <p className="text-sm text-ink">{servico.origem}</p>
        {(servico.vereador || servico.origemDetalhe) && (
          <p className="mt-0.5 text-[13px] text-ink-2">{servico.vereador ?? servico.origemDetalhe}</p>
        )}
      </Bloco>

      <Bloco titulo={servico.saidas.length > 1 ? `Histórico · ${servico.saidas.length} saídas` : 'Histórico'}>
        <Historico servico={servico} />
      </Bloco>

      <ParteRestrita servico={servico} />
    </>
  )
}

export function Ficha() {
  const { chave, fechar } = useFicha()
  const { data: base, isLoading } = useBase()
  const lateral = useMidia('(min-width: 768px)')
  const servico = chave ? base?.porChave.get(chave) : undefined

  return (
    <Drawer.Root open={chave !== null} onOpenChange={(v) => !v && fechar()} swipeDirection={lateral ? 'right' : 'down'}>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/25 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-300 ease-gaveta data-ending-style:opacity-0 data-starting-style:opacity-0 print:hidden" />
        <Drawer.Viewport className={clsx('fixed inset-0 z-50 flex', lateral ? 'justify-end' : 'items-end')}>
          <Drawer.Popup
            aria-label="Ficha do serviço"
            className={clsx(
              'overflow-y-auto overscroll-contain bg-card shadow-2 transition-transform duration-300 ease-gaveta',
              'motion-reduce:transition-opacity motion-reduce:data-ending-style:opacity-0 motion-reduce:data-starting-style:opacity-0',
              lateral
                ? 'h-full w-[min(max(560px,40vw),100vw)] border-l border-line pt-[env(safe-area-inset-top,0px)] [transform:translateX(var(--drawer-swipe-movement-x))] data-ending-style:[transform:translateX(100%)] data-starting-style:[transform:translateX(100%)]'
                : 'max-h-[88dvh] w-full rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)] [transform:translateY(var(--drawer-swipe-movement-y))] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]',
            )}
          >
            {!lateral && <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />}
            <Drawer.Content className="relative pb-6">
              <Drawer.Close
                aria-label="Fechar ficha"
                className="pressionavel absolute top-3 right-3 grid size-10 place-items-center rounded-full text-ink-2 hover:bg-realce-forte hover:text-ink"
              >
                <X aria-hidden className="size-5" />
              </Drawer.Close>
              {servico ? (
                <Conteudo servico={servico} />
              ) : isLoading ? (
                <div className="flex flex-col gap-3 p-5">
                  <Drawer.Title className="sr-only">Carregando serviço</Drawer.Title>
                  <Esqueleto className="h-3 w-40" />
                  <Esqueleto className="h-7 w-52" />
                  <Esqueleto className="h-6 w-36 rounded-full" />
                  <Esqueleto className="mt-4 h-24 w-full" />
                </div>
              ) : (
                <>
                  <Drawer.Title className="sr-only">Serviço não encontrado</Drawer.Title>
                  <EstadoVazio
                    titulo="Serviço não encontrado"
                    texto={`Não há serviço ${chave?.replace('-', ' (') ?? ''}${chave ? ')' : ''} na planilha.`}
                    altura="min-h-64"
                  />
                </>
              )}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
