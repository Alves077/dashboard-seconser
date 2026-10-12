// De onde vêm os dados. As páginas não sabem a diferença: pedem a Base (pública), e o
// restrito (detalhes e fotos) só para quem pode ver.
//   csv      → retrato local do banco servido pelo `npm run dev` (vite.config.ts); restrito liberado
//   supabase → projeto dip-iluminacao; restrito só logado e na lista de acessos (RLS)
import Papa from 'papaparse'
import { FONTE } from '@/config'
import { supabase } from '@/lib/supabase'
import { chaveServico, lerBairro, lerCategoria, lerDetalhe, lerVereador, montarBase } from './montar'
import type { Base, Detalhe, Foto, LinhaVw } from './tipos'

/** Logado sem acesso, ou não logado, pedindo dado restrito */
export class SemAcesso extends Error {
  constructor() {
    super('Sem acesso à parte restrita')
  }
}

export interface Fonte {
  tipo: 'csv' | 'supabase'
  carregarBase(): Promise<Base>
  carregarDetalhes(): Promise<Map<string, Detalhe>>
  carregarFotos(chave: string): Promise<Foto[]>
}

// ── CSV local (só desenvolvimento) ────────────────────────────────────────────

const URL_LOCAL = `${import.meta.env.BASE_URL}dados-locais/`

async function lerCsv(nome: string): Promise<{ linhas: Record<string, string>[]; modificado: Date | null }> {
  const r = await fetch(URL_LOCAL + nome)
  if (!r.ok) {
    throw new Error(
      `Não encontrei ${nome} na pasta de dados locais. Confira DADOS_LOCAIS no .env.local (veja .env.example).`,
    )
  }
  const texto = await r.text()
  const lm = r.headers.get('Last-Modified')
  // arquivo grande vai para o worker (não trava a tela); os pequenos, direto
  const linhas = texto.length > 200_000 ? await lerEmSegundoPlano(texto) : Papa.parse<Record<string, string>>(texto, { header: true, skipEmptyLines: true }).data
  return { linhas, modificado: lm ? new Date(lm) : null }
}

function lerEmSegundoPlano(texto: string): Promise<Record<string, string>[]> {
  return new Promise((resolver, rejeitar) => {
    const w = new Worker(new URL('./leitorCsv.worker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<Record<string, string>[]>) => {
      resolver(e.data)
      w.terminate()
    }
    w.onerror = (e) => {
      rejeitar(new Error(`Falha ao ler o CSV: ${e.message}`))
      w.terminate()
    }
    w.postMessage(texto)
  })
}

function fonteCsv(): Fonte {
  // vw_servicos.csv já traz endereço/descrição; guardo para o "restrito" local
  let detalhes: Map<string, Detalhe> | null = null

  return {
    tipo: 'csv',
    async carregarBase() {
      const [vw, ver, cat, bai] = await Promise.all([
        lerCsv('vw_servicos.csv'),
        lerCsv('vereadores.csv'),
        lerCsv('categorias_revisadas.csv'),
        lerCsv('bairros.csv'),
      ])
      detalhes = new Map()
      for (const l of vw.linhas) {
        const chave = chaveServico(Number(l.id_colab), l.type)
        if (!detalhes.has(chave)) detalhes.set(chave, lerDetalhe(l))
      }
      return montarBase(
        vw.linhas as unknown as LinhaVw[],
        {
          vereadores: ver.linhas.map(lerVereador),
          categorias: cat.linhas.map(lerCategoria),
          bairros: bai.linhas.map(lerBairro),
        },
        vw.modificado,
      )
    },
    async carregarDetalhes() {
      if (!detalhes) await this.carregarBase()
      return detalhes!
    },
    async carregarFotos(chave) {
      // o retrato local só tem uma amostra (as 200 fotos mais recentes)
      const { linhas } = await lerCsv('amostra_fotos.csv').catch(() => ({ linhas: [] as Record<string, string>[] }))
      return linhas
        .filter((f) => chaveServico(Number(f.demand_id), f.type) === chave)
        .map((f) => ({ url: f.image_url, atualizadoEm: f.updated_at || null }))
    },
  }
}

// ── Supabase ──────────────────────────────────────────────────────────────────

const PAGINA = 1000 // limite de linhas por requisição da API do projeto

/**
 * Lê a tabela/view inteira em páginas de 1.000, em paralelo.
 * Ordem SEMPRE pela chave: sem ordem, o Postgres pode repetir ou pular linhas entre páginas.
 */
async function lerTudo(tabela: string, colunas: string, ordem: string[]): Promise<Record<string, unknown>[]> {
  const consulta = (com: boolean) => {
    let q = supabase.from(tabela).select(colunas, com ? { count: 'exact' } : undefined)
    for (const c of ordem) q = q.order(c, { ascending: true })
    return q
  }
  const primeira = await consulta(true).range(0, PAGINA - 1)
  if (primeira.error) throw primeira.error
  const total = primeira.count ?? primeira.data.length
  const resto = []
  for (let i = PAGINA; i < total; i += PAGINA) resto.push(consulta(false).range(i, i + PAGINA - 1))
  const paginas = await Promise.all(resto)
  const linhas = [...(primeira.data as unknown as Record<string, unknown>[])]
  for (const p of paginas) {
    if (p.error) throw p.error
    linhas.push(...(p.data as unknown as Record<string, unknown>[]))
  }
  return linhas
}

const COLUNAS_VW =
  'id_colab,type,categoria,categoria_revisada,bairro,regiao,data_saida,data_retorno,reaberto,' +
  'resolvido_por_led,lat,lng,origem,origem_detalhe,vereador_id,vereador'

const semPermissao = (e: unknown) =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === '42501'

function fonteSupabase(): Fonte {
  return {
    tipo: 'supabase',
    async carregarBase() {
      const [vw, ver, cat, bai, sinc] = await Promise.all([
        lerTudo('vw_servicos', COLUNAS_VW, ['id_colab', 'type', 'data_saida']),
        lerTudo('vereadores', 'id,nome,foto_url', ['id']),
        lerTudo('categorias_revisadas', 'id,nome,descricao', ['id']),
        lerTudo('bairros', 'id,nome,regiao', ['id']),
        supabase
          .from('sincronizacoes')
          .select('terminada_em')
          .eq('status', 'ok')
          .order('terminada_em', { ascending: false })
          .limit(1),
      ])
      const fim = sinc.data?.[0]?.terminada_em as string | undefined
      return montarBase(
        vw as unknown as LinhaVw[],
        { vereadores: ver.map(lerVereador), categorias: cat.map(lerCategoria), bairros: bai.map(lerBairro) },
        fim ? new Date(fim) : null,
      )
    },
    async carregarDetalhes() {
      try {
        const linhas = await lerTudo(
          'servicos_detalhe',
          'id_colab,type,descricao,endereco,local,endereco_mudou_logradouro',
          ['id_colab', 'type'],
        )
        // logado mas fora da lista de acessos: o RLS devolve 0 linhas (não erro)
        if (!linhas.length) throw new SemAcesso()
        return new Map(linhas.map((l) => [chaveServico(Number(l.id_colab), String(l.type)), lerDetalhe(l)]))
      } catch (e) {
        if (semPermissao(e)) throw new SemAcesso()
        throw e
      }
    },
    async carregarFotos(chave) {
      const [id, type] = chave.split('-')
      const { data, error } = await supabase
        .from('servico_fotos')
        .select('image_url,atualizado_em')
        .eq('id_colab', Number(id))
        .eq('type', type)
        .order('atualizado_em', { ascending: true })
      if (error) {
        if (semPermissao(error)) throw new SemAcesso()
        throw error
      }
      return (data ?? []).map((f) => ({ url: f.image_url as string, atualizadoEm: (f.atualizado_em as string) ?? null }))
    },
  }
}

export const fonte: Fonte = FONTE === 'csv' ? fonteCsv() : fonteSupabase()
