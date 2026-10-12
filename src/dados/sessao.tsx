import type { User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { FONTE } from '@/config'
import { supabase } from '@/lib/supabase'

interface Sessao {
  /** 'local' = desenvolvimento com CSV (restrito liberado, sem login) */
  modo: 'local' | 'supabase'
  usuario: User | null
  carregando: boolean
  entrar(email: string, senha: string): Promise<void>
  sair(): Promise<void>
  esqueciSenha(email: string): Promise<void>
}

const Contexto = createContext<Sessao | null>(null)

const MENSAGENS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Este e-mail ainda não foi confirmado.',
  'Too many requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
}

const traduzir = (msg: string) => MENSAGENS[msg] ?? 'Não foi possível entrar agora. Tente de novo.'

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [carregando, setCarregando] = useState(FONTE === 'supabase')

  useEffect(() => {
    if (FONTE !== 'supabase') return
    supabase.auth.getSession().then(({ data }) => {
      setUsuario(data.session?.user ?? null)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => setUsuario(sessao?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

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
      async esqueciSenha(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + import.meta.env.BASE_URL,
        })
        if (error) throw new Error(traduzir(error.message))
      },
    }),
    [usuario, carregando],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSessao(): Sessao {
  const s = useContext(Contexto)
  if (!s) throw new Error('useSessao fora de <ProvedorSessao>')
  return s
}
