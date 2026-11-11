// De onde vêm os dados. As páginas não sabem a diferença: pedem a Base (pública), e o
// restrito (detalhes e fotos) só para quem pode ver.
//   csv      → retrato local do banco servido pelo `npm run dev` (vite.config.ts); restrito liberado
//   supabase → projeto dip-iluminacao; restrito só logado e na lista de acessos (RLS)
import { CENARIO, FONTE } from '@/config'
import { hoje } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import type { Cenario } from '@/dev/cenarios'
import { gravarCache, lerCache } from './cacheLocal'
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
  /** Fim da última carga (ISO) — a pergunta pequena da atualização automática. Sem Supabase (CSV, cenários): null */
  ultimaCarga(): Promise<string | null>
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
  // (o papaparse só é baixado aqui: com a fonte Supabase, em produção, ele nem chega ao navegador)
  const linhas =
    texto.length > 200_000
      ? await lerEmSegundoPlano(texto)
      : (await import('papaparse')).default.parse<Record<string, string>>(texto, { header: true, skipEmptyLines: true }).data
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
    // retrato local: não muda sozinho
    async ultimaCarga() {
      return null
    },
  }
}

// ── Supabase ──────────────────────────────────────────────────────────────────

const PAGINA = 1000 // limite de linhas por requisição da API do projeto
// páginas pedidas ao mesmo tempo. Eram todas (19 da vw_servicos): numa leitura no meio da carga (05/11/2026, 12h12)
// cada uma passou dos 8 s do Supabase, as novas tentativas esgotaram as conexões e o site ficou ~3 min sem dados
const PAGINAS_JUNTAS = 4

/**
 * Lê a tabela/view inteira em páginas de 1.000, no máximo PAGINAS_JUNTAS por vez.
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
  const inicios: number[] = []
  for (let i = PAGINA; i < total; i += PAGINA) inicios.push(i)
  const paginas: Record<string, unknown>[][] = new Array(inicios.length)
  // cada "trabalhador" pega o próximo início livre; a ordem final vem do índice, não de quem terminou primeiro
  let proxima = 0
  const trabalhador = async () => {
    while (proxima < inicios.length) {
      const k = proxima++
      const p = await consulta(false).range(inicios[k], inicios[k] + PAGINA - 1)
      if (p.error) throw p.error
      paginas[k] = p.data as unknown as Record<string, unknown>[]
    }
  }
  await Promise.all(Array.from({ length: Math.min(PAGINAS_JUNTAS, inicios.length) }, trabalhador))
  return [...(primeira.data as unknown as Record<string, unknown>[]), ...paginas.flat()]
}

const COLUNAS_VW =
  'id_colab,type,categoria,categoria_revisada,bairro,regiao,data_saida,data_retorno,reaberto,' +
  'resolvido_por_led,origem,origem_detalhe,vereador_id,vereador,tipo_local,local,logradouro_norm'
// sem lat/lng desde 11/11/2026: o pino é restrito (servicos_detalhe; ver comPinos em montar.ts)

/** Cópia da parte pública guardada no navegador, marcada com a carga de que veio */
interface CopiaPublica {
  sincId: number | null
  fim: string | null
  vw: Record<string, unknown>[]
  ver: Record<string, unknown>[]
  cat: Record<string, unknown>[]
  bai: Record<string, unknown>[]
}
// muda a chave quando mudam as colunas lidas: a cópia antiga (de outro formato) deixa de valer sozinha
const CHAVE_CACHE = `publico:${COLUNAS_VW}`

const semPermissao = (e: unknown) =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === '42501'

function fonteSupabase(): Fonte {
  return {
    tipo: 'supabase',
    async carregarBase() {
      // 1 pedido pequeno: qual a última carga? Se a cópia guardada no navegador é dela, abre na hora (cacheLocal.ts)
      const sinc = await supabase
        .from('sincronizacoes')
        .select('id,terminada_em')
        .eq('status', 'ok')
        .order('terminada_em', { ascending: false })
        .limit(1)
      const ultima = sinc.data?.[0] as { id: number; terminada_em: string } | undefined
      const montar = (c: CopiaPublica) =>
        montarBase(
          c.vw as unknown as LinhaVw[],
          { vereadores: c.ver.map(lerVereador), categorias: c.cat.map(lerCategoria), bairros: c.bai.map(lerBairro) },
          c.fim ? new Date(c.fim) : null,
        )

      const guardada = await lerCache<CopiaPublica>(CHAVE_CACHE)
      if (guardada && ultima && guardada.sincId === ultima.id) return montar(guardada)

      let vw, ver, cat, bai
      try {
        ;[vw, ver, cat, bai] = await Promise.all([
          lerTudo('vw_servicos', COLUNAS_VW, ['id_colab', 'type', 'data_saida']),
          lerTudo('vereadores', 'id,nome,foto_url', ['id']),
          lerTudo('categorias_revisadas', 'id,nome,descricao', ['id']),
          lerTudo('bairros', 'id,nome,regiao', ['id']),
        ])
      } catch (e) {
        // a carga nova não veio (tempo esgotado, rede): melhor a carga anterior, avisada no cabeçalho, que "Sem dados"
        if (guardada) return { ...montar(guardada), copiaAnterior: true }
        throw e
      }
      const copia: CopiaPublica = { sincId: ultima?.id ?? null, fim: ultima?.terminada_em ?? null, vw, ver, cat, bai }
      // sem saber a carga (falhou o pedido pequeno), não guarda: não teria como saber se a cópia está velha
      if (ultima) void gravarCache(CHAVE_CACHE, copia)
      return montar(copia)
    },
    async ultimaCarga() {
      const { data, error } = await supabase
        .from('sincronizacoes')
        .select('terminada_em')
        .eq('status', 'ok')
        .order('terminada_em', { ascending: false })
        .limit(1)
      if (error) throw error
      return (data?.[0]?.terminada_em as string | undefined) ?? null
    },
    async carregarDetalhes() {
      try {
        const linhas = await lerTudo(
          'servicos_detalhe',
          'id_colab,type,descricao,endereco,local,endereco_mudou_logradouro,lat,lng',
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

// ── Cenários de teste (só desenvolvimento: src/dev/cenarios.ts) ─────────────────

function fonteCenario(cenario: string): Fonte {
  const dados = import('@/dev/cenarios').then((m) => m.gerarCenario(cenario as Cenario, hoje()))
  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))
  // as mensagens que o navegador e o Supabase dão de verdade, para ver como o site as mostra
  const semRede = () => new TypeError('Failed to fetch')
  // "vivo": cada pergunta pela última carga acha uma nova (1 min depois da anterior), e a base sai com ela
  let carga = Date.now()
  return {
    tipo: 'csv',
    async carregarBase() {
      if (cenario === 'erro') {
        await esperar(600)
        throw semRede()
      }
      if (cenario === 'lento') await esperar(4000)
      const d = await dados
      if (cenario === 'vivo') await esperar(1200)
      return montarBase(d.linhas, { vereadores: d.vereadores, categorias: d.categorias, bairros: d.bairros }, cenario === 'vivo' ? new Date(carga) : d.atualizadoEm)
    },
    async carregarDetalhes() {
      if (cenario === 'erro-restrito') {
        await esperar(600)
        throw Object.assign(new Error('canceling statement due to statement timeout'), { code: '57014' })
      }
      return (await dados).detalhes
    },
    async carregarFotos(chave) {
      if (cenario === 'erro-restrito') {
        await esperar(600)
        throw semRede()
      }
      return (await dados).fotos.get(chave) ?? []
    },
    async ultimaCarga() {
      if (cenario !== 'vivo') return null
      carga += 60_000
      return new Date(carga).toISOString()
    },
  }
}

export const fonte: Fonte =
  import.meta.env.DEV && CENARIO ? fonteCenario(CENARIO) : FONTE === 'csv' ? fonteCsv() : fonteSupabase()
