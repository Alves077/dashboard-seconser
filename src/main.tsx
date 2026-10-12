import '@/estilos.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { ProvedorInterface } from '@/componentes/layout/interface'
import { Moldura } from '@/componentes/layout/Moldura'
import { ProvedorSessao } from '@/dados/sessao'
import { EmConstrucao } from '@/paginas/EmConstrucao'
import { Panorama } from '@/paginas/Panorama'

// Rotas com "#" (…/dashboard-seconser/#/mapa): o GitHub Pages não sabe responder rotas de
// aplicação de página única — sem o "#", recarregar a página daria 404.
const rotas = createHashRouter([
  {
    element: <Moldura />,
    children: [
      { path: '/', element: <Panorama /> },
      { path: '/mapa', element: <EmConstrucao /> },
      { path: '/prazo', element: <EmConstrucao /> },
      { path: '/evolucao', element: <EmConstrucao /> },
      { path: '/relatorios', element: <EmConstrucao /> },
      { path: '*', element: <EmConstrucao /> },
    ],
  },
])

const cliente = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <ProvedorSessao>
        <ProvedorInterface>
          <RouterProvider router={rotas} />
        </ProvedorInterface>
      </ProvedorSessao>
    </QueryClientProvider>
  </StrictMode>,
)
