// Seletor de cenário de teste no rodapé (SÓ no `npm run dev`; main.tsx só o monta em desenvolvimento).
// Troca `?dados=` no endereço e recarrega: o cenário entra pela mesma porta do dado real (dados/fonte.ts).
// Fica fora do visual do site de propósito: cinza, fonte do sistema, sem animação.
import { CENARIO } from '@/config'
import { CENARIOS } from './cenarios'

export function AlternadorDados() {
  const trocar = (id: string | null) => {
    const u = new URL(window.location.href)
    if (id) u.searchParams.set('dados', id)
    else u.searchParams.delete('dados')
    window.location.assign(u.toString()) // muda o ?dados= → o navegador carrega a página de novo
  }
  return (
    <div
      role="radiogroup"
      aria-label="Dados de teste"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(4.25rem + env(safe-area-inset-bottom, 0px))',
        zIndex: 60,
        display: 'flex',
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: '#e5e7eb',
        boxShadow: '0 1px 4px rgb(0 0 0 / 0.25)',
        font: '12px system-ui, sans-serif',
        whiteSpace: 'nowrap',
      }}
      className="lg:bottom-3! print:hidden"
    >
      {CENARIOS.map((c) => {
        const ativo = (c.id ?? null) === (CENARIO ?? null)
        return (
          <button
            key={c.rotulo}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => !ativo && trocar(c.id)}
            style={{
              padding: '4px 9px',
              borderRadius: 999,
              border: 0,
              background: ativo ? '#fff' : 'transparent',
              color: '#111827',
              fontWeight: ativo ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {c.rotulo}
          </button>
        )
      })}
    </div>
  )
}
