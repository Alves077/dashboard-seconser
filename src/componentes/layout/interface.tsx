import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

// Janelas globais abertas de qualquer lugar (botão "Entrar" da ficha, atalho "/" da busca…)
interface Interface {
  loginAberto: boolean
  setLoginAberto(v: boolean): void
  buscaAberta: boolean
  setBuscaAberta(v: boolean): void
}

const Contexto = createContext<Interface | null>(null)

export function ProvedorInterface({ children }: { children: ReactNode }) {
  const [loginAberto, setLoginAberto] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const valor = useMemo(() => ({ loginAberto, setLoginAberto, buscaAberta, setBuscaAberta }), [loginAberto, buscaAberta])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useInterface(): Interface {
  const c = useContext(Contexto)
  if (!c) throw new Error('useInterface fora de <ProvedorInterface>')
  return c
}
