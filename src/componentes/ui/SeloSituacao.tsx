import { clsx } from 'clsx'
import { AlarmClock, CircleCheck, Clock, Zap } from 'lucide-react'
import { ROTULO_SITUACAO } from '@/dados/regras'
import type { Situacao } from '@/dados/tipos'

// Situação nunca só pela cor: sempre ícone + texto (DESIGN.md §2).
const ESTILO: Record<Situacao, { icone: typeof Clock; classe: string }> = {
  ok: { icone: CircleCheck, classe: 'text-ok-texto bg-ok/10 ring-ok/25' },
  andamento: { icone: Clock, classe: 'text-andamento-texto bg-andamento/12 ring-andamento/35' },
  atraso: { icone: AlarmClock, classe: 'text-atraso-texto bg-atraso/10 ring-atraso/25' },
}

export function SeloSituacao({ situacao, texto, className }: { situacao: Situacao; texto?: string; className?: string }) {
  const { icone: Icone, classe } = ESTILO[situacao]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        classe,
        className,
      )}
    >
      <Icone aria-hidden className="size-3.5" />
      {texto ?? ROTULO_SITUACAO[situacao]}
    </span>
  )
}

export function SeloRisco({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full bg-risco/12 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-risco-texto ring-1 ring-risco/30 ring-inset',
        className,
      )}
    >
      <Zap aria-hidden className="size-3.5" />
      Risco elétrico
    </span>
  )
}
