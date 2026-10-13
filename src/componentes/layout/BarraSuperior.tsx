import { Menu } from '@base-ui/react/menu'
import { Popover } from '@base-ui/react/popover'
import { clsx } from 'clsx'
import { Database, History, LogIn, Moon, RefreshCw, Search, Sun, UserRound } from 'lucide-react'
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
 * Fechado: a data, ou o selo âmbar "há N dias" quando a última carga passou de 2 dias.
 */
function StatusDados() {
  const { data, isFetching } = useBase()
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
        aria-label={em ? `Dados de ${curto}${velho ? `, há ${dias} dias` : ''}. Ver detalhes e atualizar` : 'Status dos dados'}
        className={clsx(
          'pressionavel inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
          velho ? 'bg-andamento/15 text-andamento-texto hover:bg-andamento/25' : 'text-ink-2 hover:bg-ink/5 hover:text-ink',
        )}
      >
        {isFetching ? (
          <RefreshCw aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />
        ) : velho ? (
          <History aria-hidden className="size-3.5" />
        ) : (
          <Database aria-hidden className="size-3.5" />
        )}
        {isFetching ? (
          <span className="hidden sm:inline">Atualizando…</span>
        ) : velho ? (
          <span>
            <span className="hidden xl:inline">Dados de {curto} · </span>há {dias} dias
          </span>
        ) : (
          em && <span className="hidden xl:inline">Dados de {curto}</span>
        )}
        {modo === 'local' && <span aria-hidden className="size-1.5 rounded-full bg-andamento" title="Dados locais" />}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="w-72 origin-(--transform-origin) rounded-xl border border-line bg-card p-4 shadow-2 transition-[opacity,scale] duration-150 ease-saida data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
            <Popover.Title className="text-[13px] font-medium text-ink">Dados do painel</Popover.Title>
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
              className="flex h-10 cursor-default items-center rounded-md px-3 text-[13px] text-ink-2 outline-none data-highlighted:bg-ink/5 data-highlighted:text-ink"
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
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 sm:px-6">
        <NavLink to={destino('/')} className="flex min-w-0 shrink-0 items-center gap-2.5" aria-label="Início — Panorama">
          <img src={`${import.meta.env.BASE_URL}img/logo-seconser.png`} alt="" className="h-8 w-auto" />
          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block text-[13px] font-semibold text-ink">Iluminação Pública</span>
            <span className="block text-[11px] text-ink-3">DIP · SECONSER Niterói</span>
          </span>
        </NavLink>

        <nav aria-label="Páginas" className="ml-4 hidden items-center gap-1 lg:flex">
          {paginas.map((p) => (
            <NavLink
              key={p.caminho}
              to={destino(p.caminho)}
              end={p.caminho === '/'}
              title={p.pergunta}
              className={({ isActive }) =>
                clsx(
                  'relative flex h-14 items-center px-3 text-[13px] font-medium transition-colors duration-150',
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
            className="pressionavel mr-1 flex h-9 items-center gap-2 rounded-full border border-line bg-page px-3 text-[13px] text-ink-3 hover:border-acao/40 hover:text-ink-2 max-sm:w-9 max-sm:justify-center max-sm:px-0"
            aria-label="Buscar serviço, bairro ou endereço"
          >
            <Search aria-hidden className="size-4" />
            <span className="hidden sm:inline">Buscar</span>
            <kbd className="ml-3 hidden rounded border border-line px-1.5 font-sans text-[11px] text-ink-3 md:inline">/</kbd>
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
