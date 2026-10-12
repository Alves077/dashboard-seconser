import type { Dia } from '@/lib/datas'

export type Tipo = 'post' | 'event'

/** Situação de UMA saída para a rua */
export type Situacao = 'ok' | 'andamento' | 'atraso'

/**
 * Uma saída para a rua (uma linha da planilha). Um serviço pode ter várias (reaberturas).
 * Situação, prazo e dias não são guardados: dependem de "hoje" e saem de `regras.ts`.
 */
export interface Saida {
  servico: Servico
  dataSaida: Dia
  dataRetorno: Dia | null
  reaberto: boolean
  /** 1 = primeira saída do serviço, 2 = primeira reabertura… */
  ordem: number
}

/** Um serviço (demanda do Colab que está na planilha). Chave: `${idColab}-${type}`. */
export interface Servico {
  chave: string
  idColab: number
  type: Tipo
  /** categoria escolhida na abertura do Colab */
  categoriaColab: string | null
  /** categoria revisada no tratamento (11 categorias) */
  categoria: string | null
  bairro: string
  regiao: string
  /** pino corrigido quando existe */
  lat: number | null
  lng: number | null
  origem: string
  origemDetalhe: string | null
  vereadorId: number | null
  vereador: string | null
  led: boolean
  /** em ordem de data de saída */
  saidas: Saida[]
}

export interface Vereador {
  id: number
  nome: string
  fotoUrl: string | null
}

export interface CategoriaRevisada {
  id: number
  nome: string
  descricao: string
}

export interface Bairro {
  id: number
  nome: string
  regiao: string
}

/** Tudo o que é público e carrega uma vez só; os filtros rodam em cima disto, no navegador. */
export interface Base {
  servicos: Servico[]
  saidas: Saida[]
  porChave: Map<string, Servico>
  vereadores: Vereador[]
  categorias: CategoriaRevisada[]
  bairros: Bairro[]
  /** fim da última carga (Supabase) ou data do arquivo (CSV local) */
  atualizadoEm: Date | null
}

/** Parte restrita (logado com acesso) */
export interface Detalhe {
  descricao: string | null
  endereco: string | null
  local: string | null
  mudouLogradouro: boolean
}

export interface Foto {
  url: string
  atualizadoEm: string | null
}

/** Linha da vw_servicos (pública) como chega do CSV ou do Supabase */
export interface LinhaVw {
  id_colab: number | string
  type: string
  categoria: string | null
  categoria_revisada: string | null
  bairro: string | null
  regiao: string | null
  data_saida: string
  data_retorno: string | null
  reaberto: boolean | number | string | null
  resolvido_por_led: boolean | number | string | null
  lat: number | string | null
  lng: number | string | null
  origem: string | null
  origem_detalhe: string | null
  vereador_id: number | string | null
  vereador: string | null
}
