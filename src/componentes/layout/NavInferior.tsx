import { clsx } from 'clsx'
import { NavLink } from 'react-router'
import { useDestino } from '@/lib/ganchos'
import { usePaginas } from './usePaginas'

// classes inteiras (o Tailwind não enxerga nome montado): 5 páginas sem acesso, 6 com os Relatórios
const COLUNAS: Record<number, string> = { 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' }

// Celular/tablet: navegação embaixo, ao alcance do polegar (uso na rua, com uma mão).
export function NavInferior() {
  const destino = useDestino()
  const paginas = usePaginas()
  return (
    <nav
      aria-label="Páginas"
      className="nav-na-troca fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md lg:hidden print:hidden"
    >
      <ul className={clsx('mx-auto grid max-w-lg', COLUNAS[paginas.length] ?? 'grid-cols-6')}>
        {paginas.map(({ caminho, nome, icone: Icone }) => (
          <li key={caminho}>
            <NavLink
              to={destino(caminho)}
              end={caminho === '/'}
              className={({ isActive }) =>
                clsx(
                  // abaixo de 360 px, 6 nomes de 11px encostavam ("EvoluçãoVereadoresRelatórios")
                  'pressionavel flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium max-[359px]:text-[10px] max-[359px]:tracking-tight',
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
