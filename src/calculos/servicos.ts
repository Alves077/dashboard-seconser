// Página Serviços — "Onde está tal serviço?": todos os serviços, em aberto e executados, de qualquer data (o período do
// filtro não vale; região, bairro, categoria e origem valem). Pedido do usuário, 24/10/2026. Cada serviço aparece uma
// vez, pela saída mais recente (a que manda na situação dele, como no mapa e na ficha).
import { quemDe, situacao, ultimaSaida } from '@/dados/regras'
import type { Base, Saida, Servico, Situacao } from '@/dados/tipos'
import type { Filtros } from '@/filtros/filtros'
import type { Dia } from '@/lib/datas'

export interface LinhaServico {
  servico: Servico
  /** a saída mais recente */
  saida: Saida
  situacao: Situacao
  /** em aberto: dias desde a saída; executado: dias da saída à execução */
  dias: number
}

/** Situação para a chave da página: todos, em aberto (atendimento + atraso), só em atraso, executados */
export type Estado = 'todos' | 'aberto' | 'atraso' | 'executado'

export const passaEstado = (l: LinhaServico, e: Estado) =>
  e === 'todos' || (e === 'executado' ? l.situacao === 'ok' : e === 'atraso' ? l.situacao === 'atraso' : l.situacao !== 'ok')

/** Os serviços do lugar/categoria/origem escolhidos, a saída mais recente primeiro */
export function listarServicos(base: Base, f: Filtros, hoje: Dia): LinhaServico[] {
  const linhas: LinhaServico[] = []
  for (const s of base.servicos) {
    if (!s.saidas.length) continue
    if (f.regiao && s.regiao !== f.regiao) continue
    if (f.bairro && s.bairro !== f.bairro) continue
    if (f.categoria && s.categoria !== f.categoria) continue
    if (f.origem && s.origem !== f.origem) continue
    if (f.quem && quemDe(s) !== f.quem) continue
    const saida = ultimaSaida(s.saidas)
    const sit = situacao(saida, hoje)
    linhas.push({ servico: s, saida, situacao: sit, dias: (saida.dataRetorno ?? hoje) - saida.dataSaida })
  }
  return linhas.sort((a, b) => b.saida.dataSaida - a.saida.dataSaida || b.servico.idColab - a.servico.idColab)
}
