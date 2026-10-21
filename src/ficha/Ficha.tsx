// Ficha do serviço: abre de qualquer lugar (mapa, listas, busca, relatórios) pela URL ?servico=…
// Computador: painel à direita. Celular: folha de baixo (arrastar para fechar).
import { Drawer } from '@base-ui/react/drawer'
import { clsx } from 'clsx'
import { FileText, ImageOff, Images, Lightbulb, Lock, MapPin, MapPinned, X } from 'lucide-react'
import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/componentes/estados/Estados'
import { useInterface } from '@/componentes/layout/interface'
import { Botao } from '@/componentes/ui/Botao'
import { SeloRisco, SeloSituacao } from '@/componentes/ui/SeloSituacao'
import { useBase, useDetalhes, useFotos } from '@/dados/consultas'
import { CATEGORIA_RISCO, diasEmAberto, diasExecucao, noPrazo, prazo, rotuloLugar, situacao, ultimaSaida } from '@/dados/regras'
import { useSessao } from '@/dados/sessao'
import type { Saida, Servico } from '@/dados/tipos'
import { formatarDia } from '@/lib/datas'
import { dias, plural } from '@/lib/formato'
import { useDestino, useFicha, useHoje, useMidia } from '@/lib/ganchos'
import { distanciaM, formatarDistancia, RAIO_PERTO_M } from '@/lib/geo'
import { VisualizadorFotos } from './VisualizadorFotos'

const MiniMapa = lazy(() => import('@/mapa/MiniMapa'))

const ORIGEM_TIPO = { post: 'Aberto pela central / regional', event: 'Aberto pelo cidadão no Colab' }

/**
 * Rótulo de seção da ficha: miúdo e maiúsculo, com fio escuro à esquerda (como o nome do bairro na lista de campo) e
 * texto encorpado em ink-2 — um tom abaixo do conteúdo, para marcar a seção sem competir com ela. Antes era cinza-claro
 * e fino, e as seções se confundiam (usuário, 21/10/2026). Sem cor: índigo é só ação.
 */
const Rotulo = ({ children }: { children: ReactNode }) => (
  <h3 className="mb-2.5 border-l-2 border-ink pl-2 text-[11px] leading-tight font-semibold tracking-[0.5px] text-ink-2 uppercase">{children}</h3>
)

/**
 * Seção da ficha. A pilha tem três zonas — o quê (descrição, fotos) · onde (endereço, mapa, perto daqui) · contexto
 * (quem pediu, histórico) — e só a primeira seção de cada zona leva o fio de cima (`fio`); dentro da zona, só espaço.
 * Antes eram 7–8 seções iguais, cada uma com o seu fio: parecia formulário (revisão emil-design-eng, 21/10/2026).
 */
function Bloco({ titulo, children, fio = true }: { titulo: string; children: ReactNode; fio?: boolean }) {
  return (
    <section className={fio ? 'border-t border-line px-5 py-4' : 'px-5 pt-1 pb-4'}>
      <Rotulo>{titulo}</Rotulo>
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

const MAX_MINIATURAS = 9
/** quantas couberem com no mínimo 112 px (~120–170 px cada): foto é para reconhecer e tocar para ampliar — com 1/3
 * da largura cada, na gaveta de 45% viravam quadros de ~270 px que empurravam "Onde" para fora da tela */
const GRADE_FOTOS = 'grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2'

/** Miniatura quadrada; foto que sumiu do Colab vira um quadro "indisponível" (não o ícone quebrado do navegador) */
function Miniatura({ url }: { url: string }) {
  const [falhou, setFalhou] = useState(false)
  if (falhou)
    return (
      <span className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-realce-forte text-ink">
        <ImageOff aria-hidden className="size-5" />
        <span className="text-[11px]">Foto indisponível</span>
      </span>
    )
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFalhou(true)}
      className="aspect-square w-full object-cover transition-opacity duration-150 hover:opacity-90"
    />
  )
}

function Fotos({ chave }: { chave: string }) {
  const { acesso } = useDetalhes()
  const { data, isLoading, isError } = useFotos(chave, acesso)
  const [aberta, setAberta] = useState<number | null>(null)
  if (isLoading)
    return (
      <div className={GRADE_FOTOS}>
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
  // muitas fotos (já houve serviço com 40): 9 quadros, e o último vira "+N" que abre o visualizador ali
  const mostradas = data.length > MAX_MINIATURAS ? data.slice(0, MAX_MINIATURAS) : data
  const resto = data.length - mostradas.length
  return (
    <>
      <ul className={GRADE_FOTOS}>
        {mostradas.map((f, i) => {
          const ultima = resto > 0 && i === mostradas.length - 1
          return (
            <li key={f.url}>
              <button
                type="button"
                onClick={() => setAberta(i)}
                aria-label={ultima ? `Ver mais ${resto + 1} fotos` : `Ampliar foto ${i + 1} de ${data.length}`}
                className="pressionavel relative block w-full cursor-zoom-in overflow-hidden rounded-md bg-line"
              >
                <Miniatura url={f.url} />
                {ultima && (
                  <span className="numeros absolute inset-0 grid place-items-center bg-black/60 text-lg font-medium text-white backdrop-blur-[2px]">
                    +{resto + 1}
                  </span>
                )}
              </button>
            </li>
          )
        })}
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

/**
 * Descrição, endereço e fotos — só para quem tem acesso. Com acesso, a descrição e as fotos vêm logo depois do
 * problema (é o que a equipe procura ao abrir a ficha; antes ficavam no fim, depois de mapa, vizinhos e histórico —
 * usuário, 20/10/2026) e o endereço completo entra em "Onde". Sem acesso, o cartão "Restrito" fica no fim: primeiro o
 * que a pessoa pode ver. `onde` diz de qual dos dois lugares o componente está sendo chamado.
 */
function ParteRestrita({ servico, onde }: { servico: Servico; onde: 'topo' | 'fim' }) {
  const { modo, usuario } = useSessao()
  const { data, acesso, erroRestrito, error: erroDetalhes, refetch: tentarDetalhes } = useDetalhes()
  const { setLoginAberto } = useInterface()

  // no topo: carregando, erro ou o conteúdo; no fim: só o aviso de restrito (sem acesso)
  if ((onde === 'topo') === (acesso === false && !erroRestrito)) return null

  if (erroRestrito)
    return (
      <Bloco titulo="Descrição, endereço e fotos">
        <EstadoErro erro={erroDetalhes} aoTentar={() => tentarDetalhes()} altura="min-h-40" titulo="Não foi possível carregar esta parte" />
      </Bloco>
    )

  if (acesso === undefined)
    return (
      <Bloco titulo="Descrição e fotos">
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
        {/* até ~68 letras por linha: na gaveta larga a linha passava de 100 e cansava a leitura */}
        <p className="max-w-[68ch] text-sm leading-relaxed whitespace-pre-line text-ink">{d?.descricao ?? 'Sem descrição tratada.'}</p>
      </Bloco>
      <Bloco titulo="Fotos" fio={false}>
        <Fotos chave={servico.chave} />
      </Bloco>
    </>
  )
}

/**
 * Outros pedidos em aberto PERTO deste (até 300 m, qualquer rua): quem abre um pedido vê o que dá para resolver
 * na mesma ida. Pela distância e não pelo nome da rua — avenida/estrada longa tem o mesmo nome a quilômetros
 * (usuário, 17/10/2026). Sem pino, cai para a mesma rua e bairro. Público, como o resto da ficha fora do endereço.
 */
/** Pedidos perto deste (até 300 m; sem pino, mesma rua e bairro): a lista "Perto daqui" e os pontos do mapa */
function useVizinhos(servico: Servico) {
  const { data: base } = useBase()
  const hoje = useHoje()
  const comPino = servico.lat !== null && servico.lng !== null
  const { abertos, noAno } = useMemo(() => {
    const vizinhos: { s: Servico; m: number | null }[] = []
    for (const s of base?.servicos ?? []) {
      if (s === servico) continue
      if (comPino) {
        if (s.lat === null || s.lng === null) continue
        const m = distanciaM(servico.lat!, servico.lng!, s.lat, s.lng)
        if (m <= RAIO_PERTO_M) vizinhos.push({ s, m })
      } else if (s.rua === servico.rua && s.bairro === servico.bairro) vizinhos.push({ s, m: null })
    }
    return {
      abertos: vizinhos
        .map((v) => ({ ...v, saida: ultimaSaida(v.s.saidas) }))
        .filter(({ saida }) => saida.dataRetorno === null)
        .sort((a, b) => (a.m ?? 0) - (b.m ?? 0) || a.saida.dataSaida - b.saida.dataSaida),
      // pedidos ali (este incluído) com saída nos últimos 12 meses
      noAno: vizinhos.filter(({ s }) => s.saidas.some((x) => x.dataSaida > hoje - 365)).length + 1,
    }
  }, [base, servico, hoje, comPino])
  return { abertos, noAno, comPino }
}

function Perto({ servico }: { servico: Servico }) {
  const hoje = useHoje()
  const { abrir } = useFicha()
  const [todos, setTodos] = useState(false)
  const { abertos, noAno, comPino } = useVizinhos(servico)
  const visiveis = todos ? abertos : abertos.slice(0, 5)
  const onde = comPino ? `até ${formatarDistancia(RAIO_PERTO_M)} daqui` : 'nesta rua'
  return (
    <Bloco titulo={comPino ? 'Perto daqui' : 'Nesta rua'} fio={false}>
      <p className="text-[13px] text-ink-2">
        {abertos.length === 0
          ? `Nenhum outro pedido em aberto ${onde}.`
          : `${plural(abertos.length, 'outro pedido em aberto', 'outros pedidos em aberto')} ${onde} — dá para resolver na mesma ida.`}{' '}
        <span className="text-ink-3">
          {plural(noAno, 'pedido', 'pedidos')} {comPino ? 'nesse raio' : 'na rua'} nos últimos 12 meses.
        </span>
      </p>
      {visiveis.length > 0 && (
        <ul className="-mx-2 mt-2 divide-y divide-line">
          {visiveis.map(({ s, saida, m }) => (
            <li key={s.chave}>
              <button
                type="button"
                onClick={() => abrir(s.chave)}
                className="group flex min-h-12 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left tocavel hover:bg-realce"
              >
                <span className="numeros w-14 shrink-0 text-[13px] font-medium text-ink">{s.idColab}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink">{s.categoria ?? 'Sem categoria'}</span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {m !== null && <span className="numeros">{formatarDistancia(m)} · </span>}
                    {s.rua ?? s.bairro}
                    {/* o raio não respeita divisa: vizinho de outro bairro (ou região) diz qual */}
                    {s.rua && s.bairro !== servico.bairro && ` · ${s.bairro}`}
                    {s.regiao !== servico.regiao && ` (${s.regiao})`}
                  </span>
                </span>
                <SeloSituacao situacao={situacao(saida, hoje)} texto={dias(diasEmAberto(saida, hoje))} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {abertos.length > 5 && (
        <button type="button" onClick={() => setTodos((v) => !v)} className="mt-1 h-9 text-[13px] font-medium text-acao hover:underline">
          {todos ? 'Mostrar menos' : `Mostrar todos (${abertos.length})`}
        </button>
      )}
    </Bloco>
  )
}

function Conteudo({ servico }: { servico: Servico }) {
  const hoje = useHoje()
  const destino = useDestino()
  const { abrir } = useFicha()
  const { data: detalhes, acesso } = useDetalhes()
  const det = acesso ? detalhes?.get(servico.chave) : undefined
  const { abertos: vizinhos } = useVizinhos(servico)
  const pontosPerto = useMemo(
    () =>
      vizinhos
        .filter(({ s }) => s.lat !== null && s.lng !== null)
        .map(({ s, saida }) => ({ chave: s.chave, lat: s.lat!, lng: s.lng!, situacao: situacao(saida, hoje), rotulo: `${s.idColab} · ${s.categoria ?? 'Sem categoria'}` })),
    [vizinhos, hoje],
  )
  // já no Mapa, o próprio mapa voa até o pino: o link "Ver no mapa" seria redundante
  const naPaginaMapa = useLocation().pathname === '/mapa'
  const atual = ultimaSaida(servico.saidas)
  const sit = situacao(atual, hoje)

  return (
    <>
      {/* o título é o assunto (a categoria), não o número: antes "Serviço 925835" em letra fina era o título e a categoria
          vinha num bloco à parte, destacada no meio da pilha (usuário, 21/10/2026). O número segue em cima, para quem procura */}
      <header className="px-5 pt-5 pb-4 pr-14">
        {/* o número em 15 px (é por ele que a equipe procura e fala do pedido); a origem fica miúda ao lado */}
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs text-ink-3">
          <span className="numeros text-[15px] font-medium text-ink-2">Serviço {servico.idColab}</span>
          <span aria-hidden>·</span>
          {ORIGEM_TIPO[servico.type]}
        </p>
        {/* categoria e situação na mesma linha (o selo quebra para baixo se o nome for longo). A categoria antiga do Colab
            ("Aberto no Colab como …") saiu da ficha — usuário, 21/10/2026 */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Drawer.Title className="text-[20px] leading-snug font-normal tracking-[-0.2px] text-ink">
            {servico.categoria ?? 'Sem categoria revisada'}
          </Drawer.Title>
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

      <ParteRestrita servico={servico} onde="topo" />

      <Bloco titulo="Onde">
        {/* com acesso: o endereço completo (com número) no lugar da rua — antes era outra seção, "Endereço", no fim.
            Sem acesso: só a rua e o espaço público, que são públicos */}
        {det?.endereco ? (
          <p className="text-sm text-ink">{det.endereco}</p>
        ) : (
          servico.rua && <p className="text-sm text-ink">{servico.rua}</p>
        )}
        <p className={det?.endereco || servico.rua ? 'text-[13px] text-ink-2' : 'text-sm text-ink'}>
          {servico.bairro} <span className="text-ink-3">·</span> {servico.regiao}
        </p>
        {rotuloLugar(servico) && (
          <p className="mt-1 flex items-start gap-1.5 text-[13px] text-ink-2">
            <MapPinned aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
            {rotuloLugar(servico)}
          </p>
        )}
        {/* o espaço público já aparece acima: aqui só se o tratamento anotou outro texto */}
        {det?.local && det.local !== servico.local && <p className="mt-1 text-[13px] text-ink-2">Local: {det.local}</p>}
        {det?.mudouLogradouro && <p className="mt-1 text-xs text-ink-3">Endereço corrigido no tratamento (diferente do aberto no Colab).</p>}
        {servico.lat !== null && servico.lng !== null && (
          <div className="mt-3 rounded-lg border border-line">
            <Suspense fallback={<Esqueleto className="h-56 w-full rounded-lg" />}>
              <MiniMapa
                lat={servico.lat}
                lng={servico.lng}
                situacao={sit}
                titulo={`Serviço ${servico.idColab}`}
                perto={pontosPerto}
                aoAbrir={abrir}
              />
            </Suspense>
          </div>
        )}
        {/* "Como chegar" (rota no Google Maps: google.com/maps/dir/?api=1&destination=lat,lng) foi feito e tirado em
            20/10/2026 — o usuário pede de volta se as equipes passarem a usar o painel na rua */}
        {servico.lat !== null && !naPaginaMapa && (
          <Link
            to={destino('/mapa', { servico: servico.chave })}
            className="mt-2 inline-flex h-9 items-center gap-1.5 text-[13px] font-medium text-acao hover:underline"
          >
            <MapPin aria-hidden className="size-4" /> Ver no mapa
          </Link>
        )}
      </Bloco>

      {(servico.lat !== null || servico.rua) && <Perto key={servico.chave} servico={servico} />}

      {/* zona "contexto": curtos e secundários — lado a lado quando a gaveta tem largura (computador), um embaixo do outro
          no celular; a medida é a largura da gaveta (@container no Drawer.Content), não a da tela */}
      <section className="border-t border-line px-5 py-4">
        <div className="grid gap-x-8 gap-y-5 @min-[34rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div>
            <Rotulo>Quem pediu</Rotulo>
            <p className="text-sm text-ink">{servico.origem}</p>
            {(servico.vereador || servico.origemDetalhe) && (
              <p className="mt-0.5 text-[13px] text-ink-2">{servico.vereador ?? servico.origemDetalhe}</p>
            )}
          </div>
          <div>
            <Rotulo>{servico.saidas.length > 1 ? `Histórico · ${servico.saidas.length} saídas` : 'Histórico'}</Rotulo>
            <Historico servico={servico} />
          </div>
        </div>
      </section>

      <ParteRestrita servico={servico} onde="fim" />
    </>
  )
}

export function Ficha() {
  const { chave, fechar } = useFicha()
  const { data: base, isLoading, error: erroBase, refetch: tentarBase } = useBase()
  const lateral = useMidia('(min-width: 768px)')
  const servico = chave ? base?.porChave.get(chave) : undefined

  return (
    <Drawer.Root open={chave !== null} onOpenChange={(v) => !v && fechar()} swipeDirection={lateral ? 'right' : 'down'}>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/25 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-300 ease-gaveta data-ending-style:duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 print:hidden" />
        <Drawer.Viewport className={clsx('fixed inset-0 z-50 flex', lateral ? 'justify-end' : 'items-end')}>
          <Drawer.Popup
            aria-label="Ficha do serviço"
            className={clsx(
              // entra em 300 ms, sai em 200 ms: fechar é a pessoa dispensando — tem que ser mais rápido que abrir
              'overflow-y-auto overscroll-contain bg-card shadow-2 transition-transform duration-300 ease-gaveta data-ending-style:duration-200',
              'motion-reduce:transition-opacity motion-reduce:data-ending-style:opacity-0 motion-reduce:data-starting-style:opacity-0',
              lateral
                ? 'h-full w-[min(max(560px,45vw),100vw)] border-l border-line pt-[env(safe-area-inset-top,0px)] [transform:translateX(var(--drawer-swipe-movement-x))] data-ending-style:[transform:translateX(100%)] data-starting-style:[transform:translateX(100%)]'
                : 'max-h-[88dvh] w-full rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)] [transform:translateY(var(--drawer-swipe-movement-y))] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]',
            )}
          >
            {!lateral && <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />}
            <Drawer.Content className="@container relative pb-6">
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
              ) : erroBase && !base ? (
                // os dados não carregaram: não é que o serviço não exista
                <div className="p-5 pt-12">
                  <Drawer.Title className="sr-only">Não foi possível carregar o serviço</Drawer.Title>
                  <EstadoErro erro={erroBase} aoTentar={() => tentarBase()} altura="min-h-64" />
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
