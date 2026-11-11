// Ganchos de dados (TanStack Query): carregam uma vez, guardam em cache e expõem
// carregando/erro para os estados de skeleton e erro.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { fonte, SemAcesso } from './fonte'
import { comPinos } from './montar'
import { useSessao } from './sessao'

const MEIA_HORA = 30 * 60 * 1000
const DOIS_MINUTOS = 2 * 60 * 1000

/**
 * Tudo o que é público (serviços, saídas, referências). Uma requisição grande, depois tudo no navegador.
 * Para quem tem acesso ao restrito, os serviços já vêm com o pino (lat/lng é restrito desde 11/11/2026: comPinos).
 */
export function useBase() {
  const q = useBaseSemPinos()
  const { data: detalhes } = useDetalhes()
  const data = useMemo(() => (q.data ? comPinos(q.data, detalhes) : q.data), [q.data, detalhes])
  return { ...q, data }
}

function useBaseSemPinos() {
  return useQuery({
    queryKey: ['base'],
    queryFn: () => fonte.carregarBase(),
    staleTime: MEIA_HORA,
    gcTime: Infinity,
    // 1 tentativa a mais (antes 3: ~8 s de esqueleto parado antes do erro); o cabeçalho diz "Tentando de novo…".
    // 5 s (eram 1,5): tentar logo em seguida pegava o banco ainda ocupado e só somava pedidos (05/11/2026)
    retry: 1,
    retryDelay: 5000,
    // mostrando a cópia anterior porque a carga nova falhou: tenta de novo a cada minuto até conseguir
    refetchInterval: (q) => (q.state.data?.copiaAnterior ? 60_000 : false),
    // sem comparar a base nova com a antiga campo a campo (padrão do TanStack): serviço e saída se apontam
    // (servico.saidas / saida.servico) e a comparação seguia esse vai-e-volta até 500 níveis, dobrando a cada
    // serviço com 2 saídas — "Buscar dados de novo" travava o site (26/10/2026). A carga troca tudo mesmo.
    structuralSharing: false,
  })
}

/** Botão "Atualizar": busca a base de novo (o skeleton só aparece aqui e no 1º carregamento) */
export function useRecarregar() {
  const cliente = useQueryClient()
  return () => cliente.invalidateQueries({ queryKey: ['base'] })
}

/**
 * O site se atualiza sozinho, sem F5 (usuário, 04/11/2026; o trabalho sobe uma carga a cada 30 min). A cada 2 min, só com
 * a aba visível, um pedido pequeno (~80 bytes) pergunta qual foi a última carga; se é mais nova que a da base na tela,
 * busca a base de novo por trás — a tela segue com os dados antigos até os novos chegarem, sem esqueleto; filtros, página,
 * ficha aberta e rolagem ficam onde estavam — e avisa. Aba escondida não pergunta nada; ao voltar, pergunta na hora.
 * A parte restrita só fica marcada como velha: é buscada quando alguém abre a ficha, Serviços ou Relatórios, ou volta à
 * aba (baixá-la a cada carga dobraria o tráfego de quem está logado; o plano gratuito do Supabase tem 5 GB/mês).
 * No CSV local e nos cenários de teste não há carga nova (menos no cenário "vivo", feito para ver isto). Montado uma vez,
 * na Moldura.
 */
export function useAtualizacaoAutomatica() {
  const cliente = useQueryClient()
  const { data: base } = useBase()
  const naTela = base?.atualizadoEm?.getTime() ?? null
  const { data: ultima } = useQuery({
    queryKey: ['ultima-carga'],
    queryFn: () => fonte.ultimaCarga(),
    // CSV local e cenários respondem null na hora (sem rede); o cenário "vivo" responde uma carga nova a cada vez
    enabled: naTela !== null,
    refetchInterval: DOIS_MINUTOS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
    retry: false,
  })
  useEffect(() => {
    if (naTela === null || !ultima || new Date(ultima).getTime() <= naTela) return
    void cliente.invalidateQueries({ queryKey: ['base'] })
    void cliente.invalidateQueries({ queryKey: ['detalhes'], refetchType: 'none' })
  }, [ultima, naTela, cliente])

  // aviso quando a base da tela troca por uma carga nova (não na 1ª carga)
  const anterior = useRef<number | null>(null)
  useEffect(() => {
    if (naTela === null) return
    if (anterior.current !== null && naTela > anterior.current) {
      const hora = new Date(naTela).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      toast('Dados atualizados', { description: `Carga das ${hora}`, duration: 4000 })
    }
    anterior.current = naTela
  }, [naTela])
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
    retry: (n, e) => !(e instanceof SemAcesso) && n < 1,
  })
  const acesso: boolean | undefined = !habilitado
    ? false
    : q.isSuccess
      ? true
      : q.error instanceof SemAcesso
        ? false
        : undefined
  // falhou por outro motivo (rede, tempo esgotado): não se sabe se tem acesso — quem usa mostra o erro com
  // "tentar de novo", em vez de ficar carregando para sempre
  const erroRestrito = habilitado && q.isError && !(q.error instanceof SemAcesso)
  return { ...q, acesso, erroRestrito }
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
