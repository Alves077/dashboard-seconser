import { clsx } from 'clsx'
import { NavLink } from 'react-router'
import { useDestino } from '@/lib/ganchos'
import { PAGINAS } from './paginas'

// Celular/tablet: navegação embaixo, ao alcance do polegar (uso na rua, com uma mão).
export function NavInferior() {
  const destino = useDestino()
  return (
    <nav
      aria-label="Páginas"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md lg:hidden print:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {PAGINAS.map(({ caminho, nome, icone: Icone }) => (
          <li key={caminho}>
            <NavLink
              to={destino(caminho)}
              end={caminho === '/'}
              className={({ isActive }) =>
                clsx(
                  'pressionavel flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                  isActive ? 'text-acao' : 'text-ink-3',
                )
              }
            >
              <Icone aria-hidden className="size-5" />
              {nome}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
