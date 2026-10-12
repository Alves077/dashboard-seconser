import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

// Ação = índigo e pílula; o resto é discreto. Área de toque mínima de 44px (uso na rua).
export const estiloBotao = cva(
  'pressionavel inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ' +
    'disabled:opacity-50 disabled:cursor-not-allowed transition-[background-color,border-color,color] ' +
    'duration-150 ease-out',
  {
    variants: {
      variante: {
        primario: 'rounded-full bg-acao text-sobre-acao hover:bg-acao-press px-4',
        secundario: 'rounded-full border border-line bg-card text-acao hover:border-acao/40 px-4',
        fantasma: 'rounded-lg text-ink-2 hover:bg-ink/5 hover:text-ink px-3',
        icone: 'rounded-full text-ink-2 hover:bg-ink/5 hover:text-ink',
      },
      tamanho: {
        normal: 'h-11 text-sm',
        compacto: 'h-9 text-[13px]',
      },
    },
    compoundVariants: [
      { variante: 'icone', tamanho: 'normal', class: 'w-11' },
      { variante: 'icone', tamanho: 'compacto', class: 'w-9' },
    ],
    defaultVariants: { variante: 'secundario', tamanho: 'normal' },
  },
)

export type PropsBotao = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof estiloBotao>

export function Botao({ variante, tamanho, className, type = 'button', ...props }: PropsBotao) {
  return <button type={type} className={clsx(estiloBotao({ variante, tamanho }), className)} {...props} />
}
