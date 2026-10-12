import { FileText, Gauge, Map, Timer, TrendingUp, type LucideIcon } from 'lucide-react'

// Páginas pela pergunta de quem usa (docs/PLANO_V2.md §3)
export const PAGINAS: { caminho: string; nome: string; pergunta: string; icone: LucideIcon }[] = [
  { caminho: '/', nome: 'Panorama', pergunta: 'Como estamos agora?', icone: Gauge },
  { caminho: '/mapa', nome: 'Mapa', pergunta: 'Onde está o problema?', icone: Map },
  { caminho: '/prazo', nome: 'Prazo', pergunta: 'Estamos atendendo bem?', icone: Timer },
  { caminho: '/evolucao', nome: 'Evolução', pergunta: 'Está melhorando ou piorando?', icone: TrendingUp },
  { caminho: '/relatorios', nome: 'Relatórios', pergunta: 'O que levo para a reunião ou para a rua?', icone: FileText },
]
