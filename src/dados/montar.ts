import { compararTexto } from '@/lib/formato'
import { diaDeIso } from '@/lib/datas'
import type { Base, Bairro, CategoriaRevisada, LinhaVw, Saida, Servico, Tipo, Vereador } from './tipos'

const txt = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s || null
}
const num = (v: unknown): number | null => {
  const s = txt(v)
  if (s === null) return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const bool = (v: unknown): boolean => v === true || v === 1 || v === '1' || v === 'true' || v === 't'

export const chaveServico = (idColab: number, type: string) => `${idColab}-${type}`

/**
 * Linhas da vw_servicos (1 por saída) → serviços com suas saídas.
 * Os dados do serviço (categoria, bairro, pino…) são iguais em todas as saídas dele — o
 * nuvem/sincroniza.py recusa a carga se não forem — então vale a primeira linha.
 */
export function montarBase(
  linhas: LinhaVw[],
  ref: { vereadores: Vereador[]; categorias: CategoriaRevisada[]; bairros: Bairro[] },
  atualizadoEm: Date | null,
): Base {
  const porChave = new Map<string, Servico>()
  const saidas: Saida[] = []

  for (const l of linhas) {
    const idColab = Number(l.id_colab)
    const type = (txt(l.type) ?? 'post') as Tipo
    const dataSaida = diaDeIso(l.data_saida)
    if (!Number.isFinite(idColab) || dataSaida === null) continue
    const chave = chaveServico(idColab, type)

    let servico = porChave.get(chave)
    if (!servico) {
      servico = {
        chave,
        idColab,
        type,
        categoriaColab: txt(l.categoria),
        categoria: txt(l.categoria_revisada),
        bairro: txt(l.bairro) ?? 'Sem bairro',
        regiao: txt(l.regiao) ?? 'Sem região',
        lat: num(l.lat),
        lng: num(l.lng),
        origem: txt(l.origem) ?? 'Cidadão',
        origemDetalhe: txt(l.origem_detalhe),
        vereadorId: num(l.vereador_id),
        vereador: txt(l.vereador),
        led: bool(l.resolvido_por_led),
        saidas: [],
      }
      porChave.set(chave, servico)
    }
    const saida: Saida = {
      servico,
      dataSaida,
      dataRetorno: diaDeIso(l.data_retorno),
      reaberto: bool(l.reaberto),
      ordem: 0,
    }
    servico.saidas.push(saida)
    saidas.push(saida)
  }

  for (const s of porChave.values()) {
    s.saidas.sort((a, b) => a.dataSaida - b.dataSaida)
    s.saidas.forEach((x, i) => (x.ordem = i + 1))
  }

  return {
    servicos: [...porChave.values()],
    saidas,
    porChave,
    vereadores: [...ref.vereadores].sort((a, b) => compararTexto(a.nome, b.nome)),
    categorias: [...ref.categorias].sort((a, b) => a.id - b.id),
    bairros: [...ref.bairros].sort((a, b) => compararTexto(a.nome, b.nome)),
    atualizadoEm,
  }
}

export const lerVereador = (r: Record<string, unknown>): Vereador => ({
  id: Number(r.id),
  nome: txt(r.nome) ?? '',
  fotoUrl: txt(r.foto_url),
})
export const lerCategoria = (r: Record<string, unknown>): CategoriaRevisada => ({
  id: Number(r.id),
  nome: txt(r.nome) ?? '',
  descricao: txt(r.descricao) ?? '',
})
export const lerBairro = (r: Record<string, unknown>): Bairro => ({
  id: Number(r.id),
  nome: txt(r.nome) ?? '',
  regiao: txt(r.regiao) ?? '',
})
export const lerDetalhe = (r: Record<string, unknown>) => ({
  descricao: txt(r.descricao),
  endereco: txt(r.endereco),
  local: txt(r.local),
  mudouLogradouro: bool(r.endereco_mudou_logradouro),
})
