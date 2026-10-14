import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Botao } from '@/componentes/ui/Botao'
import { useSessao } from '@/dados/sessao'
import { useInterface } from './interface'

// Só login: contas são criadas pelo administrador (cadastro desligado no Supabase).
export function DialogoEntrar() {
  const { loginAberto, setLoginAberto } = useInterface()
  const { entrar, esqueciSenha } = useSessao()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await entrar(email, senha)
      setSenha('')
      setLoginAberto(false)
      toast.success('Você entrou.')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setEnviando(false)
    }
  }

  const recuperar = async () => {
    if (!email.trim()) {
      setErro('Digite o e-mail para receber o link de nova senha.')
      return
    }
    try {
      await esqueciSenha(email)
      toast.success('Se o e-mail tiver conta, chega um link para criar nova senha.')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar o link.')
    }
  }

  return (
    <Dialog.Root open={loginAberto} onOpenChange={setLoginAberto}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(400px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-card p-6 shadow-2 transition-[opacity,scale] duration-200 ease-saida data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
          <Dialog.Close
            aria-label="Fechar"
            className="pressionavel absolute top-3 right-3 grid size-10 place-items-center rounded-full text-ink-2 hover:bg-realce-forte"
          >
            <X aria-hidden className="size-5" />
          </Dialog.Close>
          <Dialog.Title className="text-lg font-medium text-ink">Entrar</Dialog.Title>
          <Dialog.Description className="mt-1 text-[13px] text-ink-2">
            Para ver descrição, endereço e fotos dos serviços. As contas são criadas pela equipe da DIP.
          </Dialog.Description>
          <form onSubmit={enviar} className="mt-5 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-medium text-ink-2">
              E-mail
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-md border border-line-input bg-card px-3 font-normal text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-ink-2">
              Senha
              <input
                type="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="h-11 rounded-md border border-line-input bg-card px-3 font-normal text-ink"
              />
            </label>
            {erro && (
              <p role="alert" className="text-[13px] text-atraso-texto">
                {erro}
              </p>
            )}
            <Botao type="submit" variante="primario" disabled={enviando} className="mt-2">
              {enviando ? 'Entrando…' : 'Entrar'}
            </Botao>
            <button type="button" onClick={recuperar} className="h-10 text-[13px] text-acao hover:underline">
              Esqueci a senha
            </button>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
