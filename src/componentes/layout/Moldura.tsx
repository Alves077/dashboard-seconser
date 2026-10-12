import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { AvisoDesatualizado } from '@/componentes/estados/Estados'
import { PaletaBusca } from '@/busca/PaletaBusca'
import { useBase } from '@/dados/consultas'
import { Ficha } from '@/ficha/Ficha'
import { BarraFiltros } from '@/filtros/BarraFiltros'
import { useTema } from '@/lib/ganchos'
import { BarraSuperior } from './BarraSuperior'
import { DialogoEntrar } from './DialogoEntrar'
import { NavInferior } from './NavInferior'

export function Moldura() {
  const { data } = useBase()
  const { tema } = useTema()
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-card px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <BarraSuperior />
      <AvisoDesatualizado atualizadoEm={data?.atualizadoEm ?? null} />
      <BarraFiltros />
      {/* espaço embaixo para a navegação do celular */}
      <main id="conteudo" className="mx-auto max-w-[1280px] px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 lg:pb-12">
        <Outlet />
      </main>
      <NavInferior />
      <Ficha />
      <PaletaBusca />
      <DialogoEntrar />
      <Toaster position="bottom-center" theme={tema === 'escuro' ? 'dark' : 'light'} offset={{ bottom: 80 }} />
    </>
  )
}
