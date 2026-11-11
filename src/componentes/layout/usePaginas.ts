import { useDetalhes } from '@/dados/consultas'
import { PAGINAS } from './paginas'

/**
 * Navegação de baixo (celular): as restritas (Mapa, Serviços, Relatórios) só com acesso à parte restrita.
 * Enquanto o acesso ainda está sendo verificado, a restrita fica de fora (não pisca no menu).
 * Quem abre o link direto cai na tela de "entrar" da própria página.
 */
export function usePaginas() {
  const { acesso, erroRestrito } = useDetalhes()
  // falhou ao conferir (rede): a página fica no menu e mostra o erro com "tentar de novo"
  return PAGINAS.filter((p) => !p.restrita || acesso === true || erroRestrito)
}

/**
 * Menu do computador (11/11/2026, usuário): sempre as 7 páginas — primeiro as públicas, depois as da equipe. Sem acesso,
 * as da equipe aparecem com cadeado e levam à tela de "entrar" delas. Antes elas sumiam: sem login sobravam 4 itens e um
 * vazio na barra, e o menu mudava de tamanho depois de entrar. Ainda verificando o acesso (logado): sem cadeado, para
 * não piscar.
 */
export function usePaginasMenu() {
  const { acesso } = useDetalhes()
  const bloqueada = acesso === false
  return [...PAGINAS.filter((p) => !p.restrita), ...PAGINAS.filter((p) => p.restrita)].map((p) => ({
    ...p,
    bloqueada: !!p.restrita && bloqueada,
  }))
}
