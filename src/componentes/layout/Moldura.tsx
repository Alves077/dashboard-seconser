import { clsx } from 'clsx'
import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Toaster } from 'sonner'
import { PaletaBusca } from '@/busca/PaletaBusca'
import { EsqueletoPagina } from '@/componentes/estados/Estados'
import { Ficha } from '@/ficha/Ficha'
import { BarraFiltros } from '@/filtros/BarraFiltros'
import { useTema } from '@/lib/ganchos'
import { preCarregarPaginas } from '@/paginas/carregar'
import { BarraSuperior } from './BarraSuperior'
import { DialogoEntrar } from './DialogoEntrar'
import { NavInferior } from './NavInferior'

export function Moldura() {
  const { tema } = useTema()
  const { pathname } = useLocation()
  useEffect(preCarregarPaginas, [])
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-card px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <BarraSuperior />
      <BarraFiltros />
      {/* espaço embaixo para a navegação do celular */}
      <main
        id="conteudo"
        className={clsx(
          'mx-auto max-w-[1280px] px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-6',
          pathname === '/mapa' ? 'lg:pb-0' : 'lg:pb-12',
        )}
      >
        {/* páginas carregadas sob demanda (paginas/carregar.ts): o esqueleto só aparece na 1ª abertura;
            ao trocar de página, a anterior fica na tela até a nova chegar */}
        <Suspense fallback={<EsqueletoPagina />}>
          <Outlet />
        </Suspense>
      </main>
      <NavInferior />
      <Ficha />
      <PaletaBusca />
      <DialogoEntrar />
      <Toaster position="bottom-center" theme={tema === 'escuro' ? 'dark' : 'light'} offset={{ bottom: 80 }} />
    </>
  )
}
