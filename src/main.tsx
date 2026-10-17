import '@/estilos.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { ErroPagina } from '@/componentes/estados/ErroPagina'
import { ProvedorInterface } from '@/componentes/layout/interface'
import { Moldura } from '@/componentes/layout/Moldura'
import { ProvedorSessao } from '@/dados/sessao'
import { Evolucao, Mapa, Panorama, Prazo, Relatorios, Vereadores } from '@/paginas/carregar'
import { EmConstrucao } from '@/paginas/EmConstrucao'

// Rotas com "#" (…/dashboard-seconser/#/mapa): o GitHub Pages não sabe responder rotas de
// aplicação de página única — sem o "#", recarregar a página daria 404.
// errorElement: no lugar do "Unexpected Application Error" do React Router (ver ErroPagina).
// O de dentro pega erro das páginas e mantém cabeçalho e menu; o de fora pega o resto (ex.: ficha).
const rotas = createHashRouter([
  {
    element: <Moldura />,
    errorElement: <ErroPagina telaCheia />,
    children: [
      {
        errorElement: <ErroPagina />,
        children: [
          { path: '/', element: <Panorama /> },
          { path: '/mapa', element: <Mapa /> },
          { path: '/prazo', element: <Prazo /> },
          { path: '/evolucao', element: <Evolucao /> },
          { path: '/vereadores', element: <Vereadores /> },
          { path: '/relatorios', element: <Relatorios /> },
          { path: '*', element: <EmConstrucao /> },
        ],
      },
    ],
  },
])

// seletor de dados de teste (pior caso, vazio…): só no `npm run dev`, nunca no site publicado
const AlternadorDados = import.meta.env.DEV
  ? lazy(() => import('@/dev/AlternadorDados').then((m) => ({ default: m.AlternadorDados })))
  : null

const cliente = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <ProvedorSessao>
        <ProvedorInterface>
          <RouterProvider router={rotas} />
          {AlternadorDados && (
            <Suspense>
              <AlternadorDados />
            </Suspense>
          )}
        </ProvedorInterface>
      </ProvedorSessao>
    </QueryClientProvider>
  </StrictMode>,
)
