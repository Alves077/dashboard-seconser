import { useDetalhes } from '@/dados/consultas'
import { PAGINAS } from './paginas'

/**
 * Páginas do menu para quem está vendo: as restritas (Relatórios) só com acesso à parte restrita.
 * Enquanto o acesso ainda está sendo verificado, a restrita fica de fora (não pisca no menu).
 * Quem abre o link direto cai na tela de "entrar" da própria página.
 */
export function usePaginas() {
  const { acesso, erroRestrito } = useDetalhes()
  // falhou ao conferir (rede): a página fica no menu e mostra o erro com "tentar de novo"
  return PAGINAS.filter((p) => !p.restrita || acesso === true || erroRestrito)
}
