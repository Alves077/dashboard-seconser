import { clsx } from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={clsx('rounded-xl border border-line bg-card shadow-1', className)} {...props} />
}

/** Cabeçalho de card: título + uma frase do que o card responde + ação opcional à direita */
export function CabecalhoCard({
  titulo,
  subtitulo,
  acao,
  id,
}: {
  titulo: ReactNode
  subtitulo?: ReactNode
  acao?: ReactNode
  id?: string
}) {
  return (
    // sem espaço para os dois, a ação desce para baixo do título (antes espremia o subtítulo no celular)
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4">
      <div className="min-w-[min(100%,14rem)] flex-1">
        <h2 id={id} className="text-[15px] font-medium tracking-[-0.1px] text-ink">
          {titulo}
        </h2>
        {subtitulo && <p className="mt-0.5 text-xs text-ink-3">{subtitulo}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </header>
  )
}
