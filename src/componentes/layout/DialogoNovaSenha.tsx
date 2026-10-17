import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Botao } from '@/componentes/ui/Botao'
import { useSessao } from '@/dados/sessao'

// Abre sozinha quando a pessoa chega pelo link "nova senha" do e-mail (sessao.tsx: recuperando).
// Ela já entrou pelo link; aqui só grava a senha nova. Fechar sem gravar deixa a senha antiga como estava.
export function DialogoNovaSenha() {
  const campoSenha = useRef<HTMLInputElement>(null)
  const { recuperando, definirSenha, encerrarRecuperacao } = useSessao()
  const [senha, setSenha] = useState('')
  const [repetir, setRepetir] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    if (senha !== repetir) {
      setErro('As duas senhas não são iguais.')
      return
    }
    setEnviando(true)
    try {
      await definirSenha(senha)
      setSenha('')
      setRepetir('')
      toast.success('Senha trocada. Use a nova da próxima vez que entrar.')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível gravar a senha.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog.Root open={recuperando} onOpenChange={(aberto) => !aberto && encerrarRecuperacao()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup initialFocus={campoSenha} className="fixed top-1/2 left-1/2 z-50 w-[min(400px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-card p-6 shadow-2 transition-[opacity,scale] duration-200 ease-saida data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
          <Dialog.Close
            aria-label="Fechar"
            className="pressionavel absolute top-3 right-3 grid size-10 place-items-center rounded-full text-ink-2 hover:bg-realce-forte"
          >
            <X aria-hidden className="size-5" />
          </Dialog.Close>
          <Dialog.Title className="text-lg font-medium text-ink">Criar nova senha</Dialog.Title>
          <Dialog.Description className="mt-1 text-[13px] text-ink-2">
            Você entrou pelo link do e-mail. Escolha a senha que vai usar daqui para frente.
          </Dialog.Description>
          <form onSubmit={enviar} className="mt-5 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-medium text-ink-2">
              Nova senha
              <input
                ref={campoSenha}
                type="password"
                autoComplete="new-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="h-11 rounded-md border border-line-input bg-card px-3 font-normal text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-ink-2">
              Repetir a nova senha
              <input
                type="password"
                autoComplete="new-password"
                required
                value={repetir}
                onChange={(e) => setRepetir(e.target.value)}
                className="h-11 rounded-md border border-line-input bg-card px-3 font-normal text-ink"
              />
            </label>
            {erro && (
              <p role="alert" className="text-[13px] text-atraso-texto">
                {erro}
              </p>
            )}
            <Botao type="submit" variante="primario" disabled={enviando} className="mt-2">
              {enviando ? 'Gravando…' : 'Gravar senha'}
            </Botao>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
