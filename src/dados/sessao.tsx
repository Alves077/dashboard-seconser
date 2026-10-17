import type { User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { FONTE } from '@/config'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface Sessao {
  /** 'local' = desenvolvimento com CSV (restrito liberado, sem login) */
  modo: 'local' | 'supabase'
  usuario: User | null
  carregando: boolean
  entrar(email: string, senha: string): Promise<void>
  sair(): Promise<void>
  esqueciSenha(email: string): Promise<void>
  /** chegou pelo link de "nova senha" do e-mail: abre a janela de criar a senha (DialogoNovaSenha) */
  recuperando: boolean
  definirSenha(senha: string): Promise<void>
  encerrarRecuperacao(): void
}

const Contexto = createContext<Sessao | null>(null)

const MENSAGENS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Este e-mail ainda não foi confirmado.',
  'Too many requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
}

const traduzir = (msg: string) => MENSAGENS[msg] ?? 'Não foi possível entrar agora. Tente de novo.'

/** Erros ao gravar a senha nova, em palavras de quem usa */
function traduzirSenha(msg: string): string {
  if (/different from the old/i.test(msg)) return 'A senha nova tem que ser diferente da atual.'
  const minimo = /at least (\d+) characters/i.exec(msg)
  if (minimo) return `A senha precisa ter pelo menos ${minimo[1]} caracteres.`
  if (/weak|pwned|leaked/i.test(msg)) return 'Senha fraca ou já vazada na internet. Escolha outra.'
  if (/session|jwt|expired/i.test(msg)) return 'O link expirou. Peça outro em Entrar → Esqueci a senha.'
  return 'Não foi possível gravar a senha agora. Tente de novo.'
}

/**
 * Volta do link de e-mail (index.html guardou o que veio depois do "#"): entra com o token e, se for "nova senha",
 * pede a senha. Link vencido/já usado: avisa. Antes o site mostrava "Em construção" e não pedia senha nenhuma.
 */
// aparece junto com a página carregando: fica mais que o padrão (4 s) para dar tempo de ler
const avisarLinkVencido = () =>
  toast.error('O link do e-mail expirou ou já foi usado. Peça outro em Entrar → Esqueci a senha.', { duration: 10000 })

async function lerRetornoDoEmail(): Promise<'recuperacao' | 'entrou' | null> {
  let bruto: string | null = null
  try {
    bruto = sessionStorage.getItem('retorno-auth')
    sessionStorage.removeItem('retorno-auth')
  } catch {
    return null
  }
  if (!bruto) return null
  const p = new URLSearchParams(bruto)
  const access_token = p.get('access_token')
  const refresh_token = p.get('refresh_token')
  if (p.get('error') || p.get('error_code') || !access_token || !refresh_token) {
    avisarLinkVencido()
    return null
  }
  // setSession devolve o erro ou, com token malformado, lança — os dois viram o mesmo aviso
  const { error } = await supabase.auth
    .setSession({ access_token, refresh_token })
    .catch((e: unknown) => ({ error: e instanceof Error ? e : new Error(String(e)) }))
  if (error) {
    avisarLinkVencido()
    return null
  }
  return p.get('type') === 'recovery' ? 'recuperacao' : 'entrou'
}

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [carregando, setCarregando] = useState(FONTE === 'supabase')
  const [recuperando, setRecuperando] = useState(false)
  const cliente = useQueryClient()

  useEffect(() => {
    if (FONTE !== 'supabase') return
    void lerRetornoDoEmail().then((r) => {
      if (r === 'recuperacao') setRecuperando(true)
    })
    supabase.auth.getSession().then(({ data }) => {
      setUsuario(data.session?.user ?? null)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      setUsuario(sessao?.user ?? null)
      // saiu (aqui, em outra aba ou a sessão expirou): o restrito sai da memória na hora — em computador
      // compartilhado, nada de descrição/endereço/foto de quem estava logado fica guardado
      if (evento === 'SIGNED_OUT') {
        cliente.removeQueries({ queryKey: ['detalhes'] })
        cliente.removeQueries({ queryKey: ['fotos'] })
      }
    })
    return () => data.subscription.unsubscribe()
  }, [cliente])

  const valor = useMemo<Sessao>(
    () => ({
      modo: FONTE === 'csv' ? 'local' : 'supabase',
      usuario,
      carregando,
      async entrar(email, senha) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
        if (error) throw new Error(traduzir(error.message))
      },
      async sair() {
        await supabase.auth.signOut()
      },
      recuperando,
      async definirSenha(senha) {
        const { error } = await supabase.auth.updateUser({ password: senha })
        if (error) throw new Error(traduzirSenha(error.message))
        setRecuperando(false)
      },
      encerrarRecuperacao() {
        setRecuperando(false)
      },
      async esqueciSenha(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + import.meta.env.BASE_URL,
        })
        if (error) throw new Error(traduzir(error.message))
      },
    }),
    [usuario, carregando, recuperando],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSessao(): Sessao {
  const s = useContext(Contexto)
  if (!s) throw new Error('useSessao fora de <ProvedorSessao>')
  return s
}
