import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useId, type SelectHTMLAttributes } from 'react'

// <select> nativo de propósito: no celular abre o seletor do próprio sistema (rolagem com o dedo,
// leitor de tela, teclado) — melhor do que qualquer lista feita à mão.
export function Selecao({
  rotulo,
  rotuloVisivel = true,
  opcoes,
  vazio,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  rotulo: string
  /** false: rótulo só para leitor de tela (barra compacta — o texto da opção já diz o que é) */
  rotuloVisivel?: boolean
  opcoes: { valor: string; texto: string; disabled?: boolean }[]
  /** texto da opção "sem filtro" (valor '') */
  vazio?: string
}) {
  const id = useId()
  return (
    <div className={clsx('flex min-w-0 flex-col gap-1', className)}>
      <label
        htmlFor={id}
        className={rotuloVisivel ? 'text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase' : 'sr-only'}
      >
        {rotulo}
      </label>
      <div className="relative">
        <select
          id={id}
          title={rotuloVisivel ? undefined : rotulo}
          className="h-11 w-full min-w-0 appearance-none truncate rounded-md border border-line-input bg-card pr-9 pl-3 text-ink hover:border-acao/50"
          {...props}
        >
          {vazio !== undefined && <option value="">{vazio}</option>}
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor} disabled={o.disabled}>
              {o.texto}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-3" />
      </div>
    </div>
  )
}
