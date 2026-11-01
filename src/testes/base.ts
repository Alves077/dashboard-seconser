// Base pequena, montada à mão, para os testes dos cálculos (npm test): poucos serviços com datas conhecidas, para que
// cada número esperado possa ser conferido de cabeça. Só os testes importam isto (não entra no site).
import type { Base, Servico } from '@/dados/tipos'
import { FILTROS_PADRAO, type Filtros, type Intervalo } from '@/filtros/filtros'
import { diaDeIso, type Dia } from '@/lib/datas'

/** '2026-10-31' → Dia */
export const dia = (iso: string): Dia => diaDeIso(iso)!

/** "hoje" de todos os testes: sábado, 31/10/2026 */
export const HOJE = dia('2026-10-31')

export interface Molde extends Partial<Omit<Servico, 'chave' | 'idColab' | 'saidas'>> {
  id: number
  /** as idas à rua, em ordem: [saída, retorno ou null] como 'AAAA-MM-DD' */
  idas: [string, string | null][]
}

export function montarBase(moldes: Molde[]): Base {
  const servicos = moldes.map(({ id, idas, ...resto }) => {
    const s: Servico = {
      chave: `${id}-post`,
      idColab: id,
      type: 'post',
      categoriaColab: null,
      categoria: 'Lâmpada apagada',
      bairro: 'Icaraí',
      regiao: 'Praias da Baía',
      lat: null,
      lng: null,
      origem: 'Cidadão',
      origemDetalhe: null,
      vereadorId: null,
      vereador: null,
      led: false,
      rua: null,
      tipoLocal: null,
      local: null,
      saidas: [],
      ...resto,
    }
    s.saidas = idas.map(([ida, volta], i) => ({
      servico: s,
      dataSaida: dia(ida),
      dataRetorno: volta === null ? null : dia(volta),
      reaberto: i > 0,
      ordem: i + 1,
    }))
    return s
  })
  return {
    servicos,
    saidas: servicos.flatMap((s) => s.saidas).sort((a, b) => a.dataSaida - b.dataSaida),
    porChave: new Map(servicos.map((s) => [s.chave, s])),
    vereadores: [],
    categorias: [],
    bairros: [],
    atualizadoEm: null,
    datasImpossiveis: [],
  }
}

/** Filtros do site sem nada escolhido, com o que o teste trocar */
export const filtros = (f: Partial<Filtros> = {}): Filtros => ({ ...FILTROS_PADRAO, ...f })

/** Intervalo de datas 'AAAA-MM-DD' (inclusive) */
export const entre = (de: string, ate: string): Intervalo => ({ de: dia(de), ate: dia(ate), parcial: false, rotulo: `${de} a ${ate}` })
