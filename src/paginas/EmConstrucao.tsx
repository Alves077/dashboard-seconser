import { Hammer } from 'lucide-react'
import { useLocation } from 'react-router'
import { Card } from '@/componentes/ui/Card'
import { PAGINAS } from '@/componentes/layout/paginas'

/** Página ainda não construída (fases seguintes do docs/PLANO_V2.md) */
export function EmConstrucao() {
  const { pathname } = useLocation()
  const pagina = PAGINAS.find((p) => p.caminho === pathname)
  return (
    <>
      <h1 className="text-2xl font-normal tracking-[-0.4px] text-ink">{pagina?.nome ?? 'Página'}</h1>
      <p className="mt-1 text-ink-2">{pagina?.pergunta}</p>
      <Card className="mt-6 flex min-h-64 flex-col items-center justify-center gap-2 p-8 text-center">
        <Hammer aria-hidden className="size-6 text-ink-3" />
        <p className="text-sm font-medium text-ink">Em construção</p>
        <p className="max-w-sm text-[13px] text-ink-3">Esta página entra nas próximas etapas da versão nova do painel.</p>
      </Card>
    </>
  )
}
