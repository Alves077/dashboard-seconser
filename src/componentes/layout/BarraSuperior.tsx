import { Menu } from '@base-ui/react/menu'
import { Popover } from '@base-ui/react/popover'
import { clsx } from 'clsx'
import { CloudOff, Database, History, LogIn, Moon, RefreshCw, Search, Sun, UserRound } from 'lucide-react'
import { useState } from 'react'
import { DIAS_PARA_DESATUALIZADO } from '@/config'
import { NavLink } from 'react-router'
import { Botao } from '@/componentes/ui/Botao'
import { useBase, useDetalhes, useRecarregar } from '@/dados/consultas'
import { useSessao } from '@/dados/sessao'
import { useDestino, useTema } from '@/lib/ganchos'
import { useInterface } from './interface'
import { usePaginas } from './usePaginas'

/**
 * Status dos dados num botão só (data · fonte · atualizar), para o cabeçalho ter espaço para crescer.
 * Fechado: a data, o selo âmbar "há N dias" quando a última carga passou de 2 dias, ou o vermelho "Sem dados"
 * quando a base não carregou. Aberto: detalhes, datas impossíveis que ficaram de fora e "buscar de novo".
 */
function StatusDados() {
  const { data, isFetching, error, failureCount } = useBase()
  const semDados = !data && !!error && !isFetching
  const impossiveis = data?.datasImpossiveis ?? []
  const { modo } = useSessao()
  const recarregar = useRecarregar()
  const [agora] = useState(() => Date.now())
  const em = data?.atualizadoEm ?? null
  const dias = em ? Math.floor((agora - em.getTime()) / 86_400_000) : null
  const velho = dias !== null && dias >= DIAS_PARA_DESATUALIZADO
  const curto = em?.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  const longo = em?.toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={
          semDados
            ? 'Não foi possível carregar os dados. Ver detalhes e tentar de novo'
            : em
              ? `Dados de ${curto}${velho ? `, há ${dias} dias` : ''}. Ver detalhes e atualizar`
              : 'Status dos dados'
        }
        className={clsx(
          'pressionavel inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
          semDados
            ? 'bg-atraso/12 text-atraso-texto hover:bg-atraso/20'
            : velho
              ? 'bg-andamento/15 text-andamento-texto hover:bg-andamento/25'
              : 'text-ink-2 hover:bg-realce-forte hover:text-ink',
        )}
      >
        {isFetching ? (
          <RefreshCw aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />
        ) : semDados ? (
          <CloudOff aria-hidden className="size-3.5" />
        ) : velho ? (
          <History aria-hidden className="size-3.5" />
        ) : (
          <Database aria-hidden className="size-3.5" />
        )}
        {isFetching ? (
          // a 1ª tentativa falhou e o site tenta mais uma vez: dito, para a espera não parecer travada
          <span className="hidden sm:inline">{failureCount > 0 ? 'Tentando de novo…' : 'Atualizando…'}</span>
        ) : semDados ? (
          <span className="hidden sm:inline">Sem dados</span>
        ) : velho ? (
          // abaixo de 375 px só o ícone âmbar (o texto empurrava o cabeçalho para fora da tela — logado, em 360 px, com o
          // botão da conta; o aviso continua no aria-label e ao tocar)
          <span className="max-[374px]:hidden">há {dias} dias</span>
        ) : null
        // sem a data por escrito (usuário, 24/10/2026): com 7 páginas no menu e a conta, a barra (no máximo 1280 px de
        // largura, em qualquer tela) passava do espaço. Dado em dia: só o ícone; a data completa está no aria-label e ao tocar
        }
        {modo === 'local' && <span aria-hidden className="size-1.5 rounded-full bg-andamento" title="Dados locais" />}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="w-72 origin-(--transform-origin) rounded-xl border border-line bg-card p-4 shadow-2 transition-[opacity,scale] duration-150 ease-saida data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
            <Popover.Title className="text-[13px] font-medium text-ink">Dados do painel</Popover.Title>
            {semDados && (
              <p className="mt-2 rounded-md bg-atraso/10 px-2.5 py-2 text-[13px] text-atraso-texto">
                Não foi possível carregar os dados agora. Confira a internet e busque de novo.
              </p>
            )}
            <dl className="mt-3 flex flex-col gap-2.5 text-[13px]">
              <div>
                <dt className="text-xs text-ink-3">Última atualização</dt>
                <dd className={clsx('text-ink', velho && 'text-andamento-texto')}>
                  {longo ?? '—'}
                  {dias !== null && <span className="text-ink-3"> · {dias === 0 ? 'hoje' : `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Fonte</dt>
                <dd className="text-ink">
                  {modo === 'local' ? 'Retrato local do banco (desenvolvimento) — parte restrita liberada' : 'Banco da DIP, sincronizado uma vez por dia'}
                </dd>
              </div>
              {impossiveis.length > 0 && (
                <div>
                  <dt className="text-xs text-ink-3">Datas impossíveis</dt>
                  <dd className="text-andamento-texto">
                    {impossiveis.length === 1
                      ? '1 registro com data no futuro ficou de fora'
                      : `${impossiveis.length} registros com data no futuro ficaram de fora`}{' '}
                    dos números (erro de digitação na planilha):{' '}
                    <span className="numeros">{impossiveis.slice(0, 5).join(', ')}</span>
                    {impossiveis.length > 5 && ` e mais ${impossiveis.length - 5}`}.
                  </dd>
                </div>
              )}
            </dl>
            <Botao variante="secundario" tamanho="compacto" onClick={recarregar} disabled={isFetching} className="mt-4 w-full">
              <RefreshCw aria-hidden className={clsx('size-4', isFetching && 'animate-spin motion-reduce:animate-none')} />
              {isFetching ? 'Atualizando…' : 'Buscar dados de novo'}
            </Botao>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function Conta() {
  const { modo, usuario, sair } = useSessao()
  const { acesso } = useDetalhes()
  const { setLoginAberto } = useInterface()

  // dados locais: sem login (o status dos dados já mostra a fonte)
  if (modo === 'local') return null
  if (!usuario) {
    // Sem login: botão de ação (índigo cheio) para se destacar dos ícones ao lado; no celular só o ícone
    return (
      <Botao
        variante="primario"
        tamanho="compacto"
        onClick={() => setLoginAberto(true)}
        aria-label="Entrar"
        className="ml-1 max-sm:w-9 max-sm:px-0"
      >
        <LogIn aria-hidden className="size-4" />
        <span className="hidden sm:inline">Entrar</span>
      </Botao>
    )
  }
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Conta"
        className="pressionavel grid size-9 place-items-center rounded-full bg-acao-suave text-acao-press"
      >
        <UserRound aria-hidden className="size-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50">
          <Menu.Popup className="min-w-56 origin-(--transform-origin) rounded-lg border border-line bg-card p-1 shadow-2 transition-[opacity,scale] duration-150 ease-saida data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="px-3 py-2">
              <p className="truncate text-[13px] font-medium text-ink">{usuario.email}</p>
              <p className="text-xs text-ink-3">
                {acesso === true ? 'Acesso à parte restrita' : acesso === false ? 'Sem acesso à parte restrita' : 'Verificando acesso…'}
              </p>
            </div>
            <Menu.Item
              onClick={() => sair()}
              className="flex h-10 cursor-default items-center rounded-md px-3 text-[13px] text-ink-2 outline-none data-highlighted:bg-realce-forte data-highlighted:text-ink"
            >
              Sair
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

export function BarraSuperior() {
  const { tema, alternar } = useTema()
  const { setBuscaAberta } = useInterface()
  const destino = useDestino()
  const paginas = usePaginas()

  return (
    <header className="fixo-na-troca sticky top-0 z-30 border-b border-line bg-card/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md print:hidden">
      {/* computador: 64 px — em tela cheia (F11), sem a barra do navegador, 56 px deixava o logo colado na borda */}
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:h-16">
        <NavLink to={destino('/')} className="flex min-w-0 shrink-0 items-center gap-2.5" aria-label="Início — Panorama">
          <img src={`${import.meta.env.BASE_URL}img/logo-seconser.png`} alt="" className="h-8 w-auto" />
          {/* entre 1024 e 1280 px o menu inteiro + o nome + os botões passavam ~50 px da tela: ali, só o logo */}
          <span className="hidden min-w-0 leading-tight sm:block lg:hidden xl:block">
            <span className="block text-[13px] font-semibold text-ink">Iluminação Pública</span>
            <span className="block text-[11px] text-ink-3">DIP · SECONSER Niterói</span>
          </span>
        </NavLink>

        <nav aria-label="Páginas" className="ml-1 hidden items-center gap-0.5 lg:flex xl:ml-4 xl:gap-1">
          {paginas.map((p) => (
            <NavLink
              key={p.caminho}
              to={destino(p.caminho)}
              end={p.caminho === '/'}
              title={p.pergunta}
              className={({ isActive }) =>
                clsx(
                  // entre 1024 e 1280 px, com 7 páginas, itens mais juntos (px-2.5) para tudo caber na barra
                  'relative flex h-16 items-center px-2.5 text-[13px] font-medium transition-colors duration-150 xl:px-3',
                  isActive
                    ? 'text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-acao'
                    : 'text-ink-2 hover:text-ink',
                )
              }
            >
              {p.nome}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setBuscaAberta(true)}
            data-gatilho-busca
            className="pressionavel mr-1 flex h-9 items-center gap-2 rounded-full border border-line bg-page px-3 text-[13px] text-ink-3 hover:border-acao/40 hover:text-ink-2 max-sm:w-9 max-sm:justify-center max-sm:px-0 lg:max-xl:w-9 lg:max-xl:justify-center lg:max-xl:px-0"
            aria-label="Buscar serviço, bairro ou endereço"
          >
            <Search aria-hidden className="size-4" />
            {/* entre 1024 e 1280 px só a lupa: o menu inteiro ocupa a barra */}
            <span className="hidden sm:inline lg:hidden xl:inline">Buscar</span>
            <kbd className="ml-3 hidden rounded border border-line px-1.5 font-sans text-[11px] text-ink-3 md:inline lg:hidden xl:inline">/</kbd>
          </button>
          <StatusDados />
          <Botao
            variante="icone"
            tamanho="compacto"
            onClick={alternar}
            aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'}
            title={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
          >
            {tema === 'escuro' ? <Sun aria-hidden className="size-4" /> : <Moon aria-hidden className="size-4" />}
          </Botao>
          <Conta />
        </div>
      </div>
    </header>
  )
}
