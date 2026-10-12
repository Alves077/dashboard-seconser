// Ganchos de dados (TanStack Query): carregam uma vez, guardam em cache e expõem
// carregando/erro para os estados de skeleton e erro.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fonte, SemAcesso } from './fonte'
import { useSessao } from './sessao'

const MEIA_HORA = 30 * 60 * 1000

/** Tudo o que é público (serviços, saídas, referências). Uma requisição grande, depois tudo no navegador. */
export function useBase() {
  return useQuery({
    queryKey: ['base'],
    queryFn: () => fonte.carregarBase(),
    staleTime: MEIA_HORA,
    gcTime: Infinity,
  })
}

/** Botão "Atualizar": busca a base de novo (o skeleton só aparece aqui e no 1º carregamento) */
export function useRecarregar() {
  const cliente = useQueryClient()
  return () => cliente.invalidateQueries({ queryKey: ['base'] })
}

/**
 * Pode ver o restrito? Local: sempre. Supabase: logado E na lista de acessos — descobre
 * tentando ler os detalhes (o RLS devolve 0 linhas para quem não está na lista).
 * `acesso` = undefined enquanto ainda não se sabe.
 */
export function useDetalhes() {
  const { modo, usuario } = useSessao()
  const habilitado = modo === 'local' || usuario !== null
  const q = useQuery({
    queryKey: ['detalhes', modo, usuario?.id ?? null],
    queryFn: () => fonte.carregarDetalhes(),
    enabled: habilitado,
    staleTime: MEIA_HORA,
    retry: (n, e) => !(e instanceof SemAcesso) && n < 2,
  })
  const acesso: boolean | undefined = !habilitado
    ? false
    : q.isSuccess
      ? true
      : q.error instanceof SemAcesso
        ? false
        : undefined
  return { ...q, acesso }
}

export function useFotos(chave: string | null, acesso: boolean | undefined) {
  const { usuario } = useSessao()
  return useQuery({
    queryKey: ['fotos', chave, usuario?.id ?? null],
    queryFn: () => fonte.carregarFotos(chave!),
    enabled: chave !== null && acesso === true,
    staleTime: MEIA_HORA,
  })
}
