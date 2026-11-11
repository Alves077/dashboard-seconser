import { FileText, Gauge, Landmark, List, Map, Timer, TrendingUp, type LucideIcon } from 'lucide-react'

// Páginas pela pergunta de quem usa (docs/PLANO_V2.md §3)
// restrita = só a equipe: no computador aparece com cadeado para quem não tem acesso (usePaginasMenu, depois das
// públicas); na navegação de baixo do celular, só para quem tem acesso (usePaginas)
export const PAGINAS: { caminho: string; nome: string; pergunta: string; icone: LucideIcon; restrita?: boolean }[] = [
  { caminho: '/', nome: 'Panorama', pergunta: 'Como estamos agora?', icone: Gauge },
  // só a equipe desde 11/11/2026: o pino exato aponta a casa de quem pediu (restrito, como o endereço)
  { caminho: '/mapa', nome: 'Mapa', pergunta: 'Onde está o problema?', icone: Map, restrita: true },
  { caminho: '/prazo', nome: 'Prazo', pergunta: 'Estamos atendendo bem?', icone: Timer },
  { caminho: '/evolucao', nome: 'Evolução', pergunta: 'Está melhorando ou piorando?', icone: TrendingUp },
  { caminho: '/vereadores', nome: 'Vereadores', pergunta: 'O que os vereadores pediram?', icone: Landmark },
  // só a equipe (usuário, 24/10/2026): a lista com endereço e a fila em atraso uma a uma
  { caminho: '/servicos', nome: 'Serviços', pergunta: 'Onde está tal serviço?', icone: List, restrita: true },
  { caminho: '/relatorios', nome: 'Relatórios', pergunta: 'O que levo para a reunião ou para a rua?', icone: FileText, restrita: true },
]
