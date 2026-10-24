import { compararTexto } from '@/lib/formato'
import { diaDeIso, hoje } from '@/lib/datas'
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

/** serviço sem bairro/região no banco (o nome que aparece no site) */
const SEM_BAIRRO = 'Sem bairro'
export const SEM_REGIAO = 'Sem região'

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
  // Data no futuro é erro de digitação na planilha (ano trocado: 2062) que a sincronização não barra — ela só
  // recusa retorno antes da saída. Saída no futuro fica de fora; retorno no futuro vira "ainda não voltou".
  // Sem isso: "−13.144 dias" na lista de campo e o histórico esticado até 2062. Avisado no status dos dados.
  const limite = hoje()
  const datasImpossiveis: string[] = []

  for (const l of linhas) {
    const idColab = Number(l.id_colab)
    const type = (txt(l.type) ?? 'post') as Tipo
    const dataSaida = diaDeIso(l.data_saida)
    if (!Number.isFinite(idColab) || dataSaida === null) continue
    if (dataSaida > limite) {
      datasImpossiveis.push(`${idColab} (saída ${String(l.data_saida).slice(0, 10)})`)
      continue
    }
    let dataRetorno = diaDeIso(l.data_retorno)
    if (dataRetorno !== null && dataRetorno > limite) {
      datasImpossiveis.push(`${idColab} (retorno ${String(l.data_retorno).slice(0, 10)})`)
      dataRetorno = null
    }
    const chave = chaveServico(idColab, type)

    let servico = porChave.get(chave)
    if (!servico) {
      servico = {
        chave,
        idColab,
        type,
        categoriaColab: txt(l.categoria),
        categoria: txt(l.categoria_revisada),
        bairro: txt(l.bairro) ?? SEM_BAIRRO,
        regiao: txt(l.regiao) ?? SEM_REGIAO,
        lat: num(l.lat),
        lng: num(l.lng),
        origem: txt(l.origem) ?? 'Cidadão',
        origemDetalhe: txt(l.origem_detalhe),
        vereadorId: num(l.vereador_id),
        vereador: txt(l.vereador),
        led: bool(l.resolvido_por_led),
        rua: txt(l.logradouro_norm),
        tipoLocal: txt(l.tipo_local),
        // no retrato CSV, "local" é o campo restrito antigo: só vale como espaço público junto com o tipo
        local: txt(l.tipo_local) ? txt(l.local) : null,
        saidas: [],
      }
      porChave.set(chave, servico)
    }
    const saida: Saida = {
      servico,
      dataSaida,
      dataRetorno,
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

  // bairro que veio do Colab e não está na tabela (o banco aceita) e o "Sem bairro": entram na lista com a
  // região do próprio serviço — senão aparecem nos números mas não dá para escolher no filtro nem buscar
  const conhecidos = new Set(ref.bairros.map((b) => b.nome))
  const extras = new Map<string, Bairro>()
  for (const s of porChave.values())
    if (!conhecidos.has(s.bairro) && !extras.has(s.bairro)) extras.set(s.bairro, { id: -(extras.size + 1), nome: s.bairro, regiao: s.regiao })

  return {
    servicos: [...porChave.values()],
    saidas,
    porChave,
    vereadores: [...ref.vereadores].sort((a, b) => compararTexto(a.nome, b.nome)),
    categorias: [...ref.categorias].sort((a, b) => a.id - b.id),
    bairros: [...ref.bairros, ...extras.values()].sort((a, b) => compararTexto(a.nome, b.nome)),
    atualizadoEm,
    datasImpossiveis,
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
