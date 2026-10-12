import { Menu } from '@base-ui/react/menu'
import { clsx } from 'clsx'
import { LogIn, Moon, RefreshCw, Search, Sun, UserRound } from 'lucide-react'
import { NavLink } from 'react-router'
import { Botao } from '@/componentes/ui/Botao'
import { useBase, useDetalhes, useRecarregar } from '@/dados/consultas'
import { useSessao } from '@/dados/sessao'
import { useDestino, useTema } from '@/lib/ganchos'
import { useInterface } from './interface'
import { PAGINAS } from './paginas'

function DataDosDados() {
  const { data, isFetching } = useBase()
  if (!data?.atualizadoEm) return null
  const quando = data.atualizadoEm.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <span className="hidden text-xs text-ink-2 xl:inline" title="Fim da última atualização dos dados">
      {isFetching ? 'Atualizando…' : `Dados de ${quando}`}
    </span>
  )
}

function Conta() {
  const { modo, usuario, sair } = useSessao()
  const { acesso } = useDetalhes()
  const { setLoginAberto } = useInterface()

  if (modo === 'local') {
    return (
      <span
        className="hidden rounded-full bg-andamento/15 px-2.5 py-1 text-[11px] font-medium text-andamento-texto sm:inline"
        title="Desenvolvimento: dados do retrato local, parte restrita liberada"
      >
        Dados locais
      </span>
    )
  }
  if (!usuario) {
    return (
      <Botao variante="fantasma" tamanho="compacto" onClick={() => setLoginAberto(true)}>
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
  const recarregar = useRecarregar()
  const { isFetching } = useBase()
  const { setBuscaAberta } = useInterface()
  const destino = useDestino()

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 sm:px-6">
        <NavLink to={destino('/')} className="flex min-w-0 shrink-0 items-center gap-2.5" aria-label="Início — Panorama">
          <img src={`${import.meta.env.BASE_URL}img/logo-seconser.png`} alt="" className="h-8 w-auto" />
          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block text-[13px] font-semibold text-ink">Iluminação Pública</span>
            <span className="block text-[11px] text-ink-3">DIP · SECONSER Niterói</span>
          </span>
        </NavLink>

        <nav aria-label="Páginas" className="ml-4 hidden items-center gap-1 lg:flex">
          {PAGINAS.map((p) => (
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
          <DataDosDados />
          <Botao
            variante="icone"
            tamanho="compacto"
            onClick={recarregar}
            aria-label="Atualizar dados"
            title="Atualizar dados"
            disabled={isFetching}
          >
            <RefreshCw aria-hidden className={clsx('size-4', isFetching && 'animate-spin motion-reduce:animate-none')} />
          </Botao>
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
