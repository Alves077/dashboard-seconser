import { Menu } from '@base-ui/react/menu'
import { clsx } from 'clsx'
import { Ellipsis } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { useDestino } from '@/lib/ganchos'
import { usePaginas } from './usePaginas'

// classes inteiras (o Tailwind não enxerga nome montado)
const COLUNAS: Record<number, string> = { 4: 'grid-cols-4', 5: 'grid-cols-5' }
/** no máximo 5 destinos embaixo: com mais (a equipe logada tem 7), estes e um "Mais" com o resto */
const PRINCIPAIS = ['/', '/mapa', '/servicos', '/relatorios']

const classeItem = (ativo: boolean) =>
  clsx(
    'pressionavel flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium max-[359px]:text-[10px] max-[359px]:tracking-tight',
    ativo ? 'text-acao' : 'text-ink-3',
  )

// Celular/tablet: navegação embaixo, ao alcance do polegar (uso na rua, com uma mão). Até 5 destinos (usuário, 24/10/2026:
// com 7 ícones de ~51 px e nome em 10 px ficava apertado): sem login são 5 (Panorama, Mapa, Prazo, Evolução,
// Vereadores); a equipe tem Panorama, Mapa, Serviços, Relatórios e "Mais" (Prazo, Evolução, Vereadores). Numa página do
// "Mais", ele fica marcado e mostra o nome dela — para saber onde se está.
export function NavInferior() {
  const destino = useDestino()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const paginas = usePaginas()
  const comMais = paginas.length > 5
  const visiveis = comMais ? PRINCIPAIS.map((c) => paginas.find((p) => p.caminho === c)).filter((p) => p !== undefined) : paginas
  const resto = comMais ? paginas.filter((p) => !PRINCIPAIS.includes(p.caminho)) : []
  const atualNoMais = resto.find((p) => p.caminho === pathname)
  const IconeMais = atualNoMais?.icone ?? Ellipsis

  return (
    <nav
      aria-label="Páginas"
      className="nav-na-troca fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md lg:hidden print:hidden"
    >
      <ul className={clsx('mx-auto grid max-w-lg', COLUNAS[visiveis.length + (comMais ? 1 : 0)] ?? 'grid-cols-5')}>
        {visiveis.map(({ caminho, nome, icone: Icone }) => (
          <li key={caminho}>
            <NavLink to={destino(caminho)} end={caminho === '/'} className={({ isActive }) => classeItem(isActive)}>
              <Icone aria-hidden className="size-5" />
              {nome}
            </NavLink>
          </li>
        ))}
        {comMais && (
          <li>
            <Menu.Root>
              <Menu.Trigger className={classeItem(!!atualNoMais)} aria-label={atualNoMais ? `${atualNoMais.nome} — mais páginas` : 'Mais páginas'}>
                <IconeMais aria-hidden className="size-5" />
                {atualNoMais?.nome ?? 'Mais'}
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner side="top" align="end" sideOffset={8} className="z-50">
                  <Menu.Popup className="mr-2 min-w-60 origin-(--transform-origin) rounded-xl border border-line bg-card p-1 shadow-2 transition-[opacity,scale] duration-150 ease-saida data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
                    {resto.map(({ caminho, nome, pergunta, icone: Icone }) => (
                      <Menu.Item
                        key={caminho}
                        onClick={() => navegar(destino(caminho))}
                        className={clsx(
                          'flex min-h-12 cursor-default items-center gap-3 rounded-lg px-3 py-2 outline-none data-highlighted:bg-realce-forte',
                          pathname === caminho ? 'text-acao' : 'text-ink',
                        )}
                      >
                        <Icone aria-hidden className="size-5 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-[14px] font-medium">{nome}</span>
                          <span className="block text-[12px] text-ink-3">{pergunta}</span>
                        </span>
                      </Menu.Item>
                    ))}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </li>
        )}
      </ul>
    </nav>
  )
}
