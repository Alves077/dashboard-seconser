// Cenários de teste (SÓ no `npm run dev`, nunca no site publicado): dados inventados no formato exato da
// vw_servicos, para ver as páginas com o pior caso realista em vez do dado "bonzinho" de sempre.
// Escolha pelo seletor no rodapé da tela (AlternadorDados.tsx) ou pelo endereço: …/?dados=pior#/
//   pior   → nomes longos (reais e plausíveis), faltando bairro/região/categoria/pino, pinos empilhados,
//            em aberto há 900 dias, contagens em 1, um bairro com 1/3 de tudo, descrição de 2.000 letras…
//   vazio  → nenhum serviço
//   um     → 3 serviços: 1 executado, 1 em atendimento, 1 em atraso (toda contagem em 1)
//   enorme → 8 anos, ~95 mil saídas (desempenho)
//   lento  → o pior caso, mas a base demora 4 s (esqueleto × página pronta: a tela pula?)
//   erro   → a base falha como sem rede ("Failed to fetch")
//   erro-restrito → a base abre, mas descrição/endereço e fotos falham (Ficha, Relatórios, busca)
// Valores tirados do dado real quando existem (bairros, categorias, vereadores com foto), o resto
// plausível: nada aqui é dado real de pedido.
import { diaDe, isoDe, partes, type Dia } from '@/lib/datas'
import type { Bairro, CategoriaRevisada, Detalhe, Foto, LinhaVw, Vereador } from '@/dados/tipos'

export type Cenario = 'pior' | 'vazio' | 'um' | 'enorme' | 'lento' | 'erro' | 'erro-restrito'
export const CENARIOS: { id: Cenario | null; rotulo: string }[] = [
  { id: null, rotulo: 'Dados reais' },
  { id: 'pior', rotulo: 'Pior caso' },
  { id: 'vazio', rotulo: 'Vazio' },
  { id: 'um', rotulo: 'Um' },
  { id: 'enorme', rotulo: 'Enorme' },
  { id: 'lento', rotulo: 'Lento' },
  { id: 'erro', rotulo: 'Erro' },
  { id: 'erro-restrito', rotulo: 'Erro restrito' },
]

export interface DadosCenario {
  linhas: LinhaVw[]
  vereadores: Vereador[]
  categorias: CategoriaRevisada[]
  bairros: Bairro[]
  detalhes: Map<string, Detalhe>
  fotos: Map<string, Foto[]>
  atualizadoEm: Date
}

// ── Referências ───────────────────────────────────────────────────────────────

const REGIOES_BAIRROS: [string, string][] = [
  ['Badu', 'Pendotiba'], ['Bairro de Fátima', 'Praias da Baía'], ['Baldeador', 'Norte'], ['Barreto', 'Norte'],
  ['Boa Viagem', 'Praias da Baía'], ['Cafubá', 'Oceânica'], ['Camboinhas', 'Oceânica'], ['Cantagalo', 'Pendotiba'],
  ['Centro', 'Praias da Baía'], ['Charitas', 'Praias da Baía'], ['Engenho do Mato', 'Oceânica'], ['Engenhoca', 'Norte'],
  ['Fonseca', 'Norte'], ['Icaraí', 'Praias da Baía'], ['Ilha da Conceição', 'Norte'], ['Ingá', 'Praias da Baía'],
  ['Itaipu', 'Oceânica'], ['Jardim Imbuí', 'Oceânica'], ['Largo da Batalha', 'Pendotiba'], ['Maria Paula', 'Pendotiba'],
  ['Muriqui', 'Leste'], ['Piratininga', 'Oceânica'], ["Ponta D'Areia", 'Praias da Baía'], ['Rio do Ouro', 'Leste'],
  ['Santa Rosa', 'Praias da Baía'], ['São Francisco', 'Praias da Baía'], ['Serra Grande', 'Oceânica'],
  ['Várzea das Moças', 'Leste'], ['Viçosos Jardim', 'Norte'], ['Vila Progresso', 'Pendotiba'],
]
/** nome que veio do Colab e não está na tabela de bairros (acontece: o sincroniza aceita) */
const BAIRRO_FORA_DA_TABELA = 'Vila Progresso / Muriqui (Estrada Caetano Monteiro)'

const CATEGORIAS: [string, string][] = [
  ['Lâmpada apagada', 'Ponto não acende'],
  ['Acendimento fora de hora', 'Acesa de dia, acesa de madrugada, demora a acender (fotocélula/relé/temporizador)'],
  ['Intermitente ou fraca', 'Pisca, oscila, fraca, estala'],
  ['Braço ou luminária', 'Braço caído/solto/virado, luminária pendurada, globo quebrado, recolocar braço retirado'],
  ['Poste', 'Poste danificado, risco de queda, troca, remoção (inclui madeira)'],
  ['Direcionamento / ofuscamento', 'Luz virada para janela/casa/lugar errado, ajuste de foco, luz intrusa'],
  ['Fiação e risco elétrico', 'Fio exposto/solto, curto, choque, estrutura energizada, furto de fios'],
  ['Caixa de passagem / quadro', 'Tampa quebrada ou faltando, quadro de luz aberto'],
  ['Implantação de iluminação', 'Ponto novo onde não há luz (poste/braço/refletor novo), ou poste sem braço que nunca teve'],
  ['Modernização ou reforço', 'Pedido de troca para LED ou aumento de potência, sem defeito'],
  ['Serviço especial', 'Evento, iluminação provisória, ponto de energia'],
]

/** id < 100 = vereador real (tem foto em public/img/vereadores, menos o 7); 9xx = inventado, sem foto */
const VEREADORES: Vereador[] = [
  { id: 14, nome: 'Luiz Carlos Gallo de Freitas', fotoUrl: 'x' },
  { id: 21, nome: 'Roberto Jales/Beto da Pipa', fotoUrl: 'x' },
  { id: 18, nome: 'Morett', fotoUrl: 'x' },
  { id: 1, nome: 'Adriano Boinha', fotoUrl: 'x' },
  { id: 7, nome: 'Eduardo Paiva', fotoUrl: null },
  { id: 901, nome: 'Professora Ana Cláudia Bittencourt de Albuquerque Mello', fotoUrl: 'x' },
  { id: 902, nome: 'Zé', fotoUrl: null },
  { id: 903, nome: 'Dr. Jorge Luiz Fernandes/Jorginho da Saúde Comunitária', fotoUrl: null },
  { id: 904, nome: 'Ítalo Ônix', fotoUrl: null },
]

const ORIGENS: { origem: string; detalhes: (string | null)[]; peso: number }[] = [
  { origem: 'Cidadão', detalhes: [null], peso: 55 },
  { origem: 'Regional', detalhes: ['Regional Norte', 'Regional Oceânica', 'Regional de Pendotiba', 'Regional Leste', null], peso: 25 },
  { origem: 'Vereador', detalhes: ['Indicação legislativa', 'Ofício', 'Indicação (Câmara)'], peso: 8 },
  {
    origem: 'Associação',
    detalhes: [
      'Associação de Moradores e Amigos do Morro do Castro, Vila Ipiranga, Coronel Leôncio e Adjacências',
      'Associação de Moradores do Rato Molhado (Sapê e Morro Bela Vista)',
      'AMA',
    ],
    peso: 4,
  },
  { origem: 'Direção SECONSER', detalhes: ['Diretora-geral', null], peso: 3 },
  { origem: 'Ouvidoria', detalhes: ['Ouvidoria (Controladoria-Geral do Município)'], peso: 2 },
  { origem: 'Prefeitura Móvel', detalhes: [null], peso: 1 },
  { origem: 'Secretaria', detalhes: ['Secretaria Municipal de Conservação e Serviços Públicos'], peso: 1 },
  { origem: 'Deputado', detalhes: [null], peso: 0.2 },
  {
    origem: 'Ministério Público do Estado do Rio de Janeiro',
    detalhes: ['Promotoria de Justiça de Tutela Coletiva do Núcleo Niterói – Meio Ambiente e Urbanismo'],
    peso: 0.3,
  },
]

const RUAS = [
  'Rua Doutor Mário Vianna', 'Estrada Francisco da Cruz Nunes', 'Avenida Almirante Ary Parreiras', 'Rua 16',
  'Travessa E', 'Rua Professora Maria Luiza Cardoso de Albuquerque', 'Estrada Caetano Monteiro', 'Rua A',
  'Avenida Central Ewerton Xavier', 'Rua Coronel Moreira César', 'Alameda São Boaventura',
]

/** espaços públicos (alguns sem nome, como no dado real: 89 praças e 72 escadarias sem nome) */
const ESPACOS: { tipoLocal: string; local: string | null }[] = [
  { tipoLocal: 'praça', local: 'Praça César Tinoco' },
  { tipoLocal: 'praça', local: null },
  { tipoLocal: 'praia/orla', local: 'Orla da Praia de Piratininga' },
  { tipoLocal: 'escadaria', local: null },
  { tipoLocal: 'campo/quadra', local: 'Quadra da Comporta' },
  { tipoLocal: 'parque', local: 'Parque Natural Municipal da Cidade de Niterói — Mirante do Morro do Morcego' },
]

// ── Gerador ───────────────────────────────────────────────────────────────────

/** sorteio com semente: o mesmo cenário dá sempre os mesmos números (dá para comparar antes/depois) */
function sorteador(semente: number) {
  let a = semente >>> 0
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => min + Math.floor(r() * (max - min + 1))
  const um = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]
  const pesado = <T extends { peso: number }>(xs: readonly T[]) => {
    const total = xs.reduce((s, x) => s + x.peso, 0)
    let v = r() * total
    for (const x of xs) if ((v -= x.peso) < 0) return x
    return xs[xs.length - 1]
  }
  return { r, int, um, pesado }
}

interface Pedido {
  id: number
  type: 'post' | 'event'
  categoria: string | null
  bairro: string | null
  regiao: string | null
  lat: number | null
  lng: number | null
  origem: string
  origemDetalhe: string | null
  vereador: Vereador | null
  rua: string | null
  tipoLocal: string | null
  local: string | null
  /** [saída, retorno|null] em ordem */
  saidas: [Dia, Dia | null][]
}

const fotoSvg = (larg: number, alt: number, texto: string, cor: string) =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${larg}" height="${alt}" viewBox="0 0 ${larg} ${alt}">` +
      `<rect width="100%" height="100%" fill="${cor}"/><text x="50%" y="50%" font-family="sans-serif" ` +
      `font-size="${Math.min(larg, alt) / 6}" fill="#fff" text-anchor="middle" dominant-baseline="middle">${texto}</text></svg>`,
  )

const DESCRICAO_LONGA =
  'Ouvidoria (Controladoria). Morador informa que TODOS os postes da rua estão apagados há mais de 3 meses ' +
  'e que já abriu outros pedidos (protocolos 2026/004512, 2026/005871 e 2026/007003) sem retorno.\n\n' +
  'Ponto de referência: em frente ao nº 1284, ao lado da <b>padaria</b> & mercado "Bom Preço", subindo a ' +
  'escadaria até o fim — o 3º poste (de madeira) está inclinado e com fio solto encostando no muro.\n' +
  'Foto anexada pelo morador: https://www.colab.re/niteroi/posts/9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f?ref=compartilhar&origem=whatsapp\n\n' +
  'Reiteração da Indicação nº 1.284/2026 do vereador. '.repeat(6) +
  'Pede urgência porque a rua é caminho de escola e já houve dois assaltos à noite. ' +
  'Segundo o morador, a luminária do poste 4 foi trocada por LED em agosto mas apagou na semana seguinte; ' +
  'o poste 5 acende de dia e apaga de noite (fotocélula?); o poste 6 pisca. **Atenção equipe: cão bravo no portão.**'

export function gerarCenario(cenario: Cenario, hoje: Dia): DadosCenario {
  if (cenario === 'lento' || cenario === 'erro' || cenario === 'erro-restrito') cenario = 'pior'
  const s = sorteador(cenario === 'enorme' ? 77 : 1284)
  const bairros: Bairro[] = REGIOES_BAIRROS.map(([nome, regiao], i) => ({ id: i + 1, nome, regiao }))
  const categorias: CategoriaRevisada[] = CATEGORIAS.map(([nome, descricao], i) => ({ id: i + 1, nome, descricao }))
  const pedidos: Pedido[] = []
  const detalhes = new Map<string, Detalhe>()
  const fotos = new Map<string, Foto[]>()
  let proximoId = 1_000_001

  const pino = (): [number, number] => [-22.98 + s.r() * 0.11, -43.12 + s.r() * 0.15]
  const novo = (p: Partial<Pedido> & Pick<Pedido, 'saidas'>): Pedido => {
    const [b, reg] = s.r() < 0.33 && cenario !== 'um' ? ['Itaipu', 'Oceânica'] : s.um(REGIOES_BAIRROS)
    const o = s.pesado(ORIGENS)
    const [lat, lng] = pino()
    const ped: Pedido = {
      id: proximoId++,
      type: s.r() < 0.6 ? 'post' : 'event',
      categoria: s.um(CATEGORIAS)[0],
      bairro: b,
      regiao: reg,
      lat,
      lng,
      origem: o.origem,
      origemDetalhe: s.um(o.detalhes),
      vereador: o.origem === 'Vereador' ? (s.r() < 0.15 ? null : s.um(VEREADORES.slice(0, 7))) : null,
      // poucas ruas por bairro, para a mesma rua repetir (lista de campo por rua, "nesta rua" na ficha)
      rua: s.r() < 0.01 ? null : s.um(RUAS.slice(0, 6)),
      ...(s.r() < 0.03 ? s.um(ESPACOS) : { tipoLocal: null, local: null }),
      ...p,
    }
    pedidos.push(ped)
    return ped
  }

  if (cenario === 'um') {
    novo({ saidas: [[hoje - 20, hoje - 19]], categoria: 'Poste', bairro: 'Icaraí', regiao: 'Praias da Baía', origem: 'Cidadão', origemDetalhe: null })
    novo({ saidas: [[hoje - 2, null]], categoria: 'Lâmpada apagada', bairro: 'Fonseca', regiao: 'Norte', origem: 'Regional', origemDetalhe: 'Regional Norte' })
    novo({
      saidas: [[hoje - 12, null]], categoria: 'Fiação e risco elétrico', bairro: 'Muriqui', regiao: 'Leste',
      origem: 'Vereador', origemDetalhe: 'Indicação legislativa', vereador: VEREADORES[2],
    })
  } else if (cenario !== 'vazio') {
    const enorme = cenario === 'enorme'
    const meses = enorme ? 96 : 30
    const total = enorme ? 80_000 : 2_400
    const inicio = diaDe(partes(hoje).ano, partes(hoje).mes0 - meses, 1)
    for (let i = 0; i < total; i++) {
      const saida = inicio + Math.floor(Math.pow(s.r(), 0.8) * (hoje - inicio + 1))
      // tempo até o retorno: maioria rápida, cauda longa; os mais recentes ficam mais em aberto
      const recente = hoje - saida < 45
      const aberto = s.r() < (recente ? 0.35 : 0.03)
      const dur = Math.round(Math.pow(s.r(), 2.2) * 70)
      const ret = aberto || saida + dur > hoje ? null : saida + dur
      const saidas: [Dia, Dia | null][] = [[saida, ret]]
      // reabertura: volta para a rua alguns dias depois do retorno
      if (ret !== null && s.r() < 0.1) {
        const s2 = ret + s.int(2, 40)
        if (s2 <= hoje) {
          const d2 = Math.round(Math.pow(s.r(), 2) * 40)
          saidas.push([s2, s2 + d2 <= hoje && s.r() > 0.2 ? s2 + d2 : null])
        }
      }
      novo({ saidas })
    }

    // casos de borda, um de cada (os números ficam em 1 de propósito)
    novo({ saidas: [[hoje - 912, null]], bairro: null, regiao: null, lat: null, lng: null, categoria: null })
    novo({ saidas: [[hoje, null]], categoria: 'Caixa de passagem / quadro' })
    novo({ saidas: [[hoje - 3, hoje - 3]], categoria: 'Caixa de passagem / quadro' })
    novo({ saidas: [[hoje - 40, null]], bairro: 'Ilha da Conceição', regiao: 'Norte', categoria: 'Serviço especial' })
    novo({ saidas: [[hoje - 30, hoje - 1]], bairro: BAIRRO_FORA_DA_TABELA, regiao: 'Pendotiba' })
    for (let i = 0; i < 9; i++) novo({ saidas: [[hoje - s.int(6, 25), null]], bairro: BAIRRO_FORA_DA_TABELA, regiao: 'Pendotiba' })
    // origens longas dentro dos últimos 30 dias (aparecem no período padrão)
    const mp = ORIGENS[ORIGENS.length - 1]
    const assoc = ORIGENS[3]
    for (let i = 0; i < 2; i++) novo({ saidas: [[hoje - s.int(3, 20), null]], origem: mp.origem, origemDetalhe: mp.detalhes[0] })
    for (let i = 0; i < 3; i++) novo({ saidas: [[hoje - s.int(3, 20), null]], origem: assoc.origem, origemDetalhe: assoc.detalhes[0] })
    novo({ saidas: [[hoje - 15, null]], lat: -43.0812, lng: -22.9135 }) // lat/lng trocados na importação
    for (let i = 0; i < 15; i++) novo({ saidas: [[hoje - s.int(1, 300), s.r() < 0.5 ? null : hoje]], categoria: null })
    for (let i = 0; i < 6; i++) novo({ saidas: [[hoje - s.int(6, 60), null]], bairro: null, regiao: null })
    // 60 pedidos no mesmo ponto (mesmo pino de condomínio)
    for (let i = 0; i < 60; i++)
      novo({ saidas: [[hoje - s.int(1, 200), s.r() < 0.6 ? null : hoje - 1]], bairro: 'Itaipu', regiao: 'Oceânica', lat: -22.9601, lng: -43.0455 })
    // datas impossíveis que a sincronização deixa passar (ela só recusa retorno antes da saída): erro de
    // digitação na planilha — ano trocado (2062, 2016), dia errado (saída daqui a 3 dias), retorno no futuro
    novo({ saidas: [[diaDe(2062, 9, 12), null]], bairro: 'Icaraí', regiao: 'Praias da Baía', categoria: 'Poste' })
    novo({ saidas: [[hoje + 3, null]], bairro: 'Fonseca', regiao: 'Norte' })
    novo({ saidas: [[hoje - 20, hoje + 5]], bairro: 'Centro', regiao: 'Praias da Baía' })
    novo({ saidas: [[diaDe(2016, 9, 2), null]], bairro: 'Barreto', regiao: 'Norte', categoria: 'Lâmpada apagada' })
    // vereador com 1 pedido só (e executado), vereador com muitos em aberto, nomes longos
    novo({ saidas: [[hoje - 25, hoje - 20]], origem: 'Vereador', origemDetalhe: 'Ofício', vereador: VEREADORES[6] })
    for (let i = 0; i < 40; i++)
      novo({
        saidas: [[hoje - s.int(6, 400), null]], origem: 'Vereador',
        origemDetalhe: i % 3 ? 'Indicação legislativa' : 'Ofício', vereador: VEREADORES[5],
      })
    for (let i = 0; i < 12; i++)
      novo({ saidas: [[hoje - s.int(1, 200), s.r() < 0.5 ? null : hoje]], origem: 'Vereador', origemDetalhe: 'Indicação (Câmara)', vereador: VEREADORES[7] })
    for (let i = 0; i < 3; i++)
      novo({ saidas: [[hoje - s.int(10, 90), hoje - 2]], origem: 'Vereador', origemDetalhe: 'Indicação legislativa', vereador: VEREADORES[8] })
  }

  // ── restrito: endereço, descrição, local; fotos ─────────────────────────────
  pedidos.forEach((p, i) => {
    const chave = `${p.id}-${p.type}`
    const rua = p.rua ?? s.um(RUAS)
    const n = s.int(1, 4000)
    const longo = i % 97 === 0
    detalhes.set(chave, {
      endereco:
        longo
          ? `Condomínio do Edifício Green Star Residence Club - ${rua}, ${n}, bloco 3, apto 1104 - ${p.bairro ?? 'Niterói'}, Niterói - RJ, 24230-200, Brasil (esquina com Travessa Professora Alice Picanço)`
          : i % 23 === 1
            ? null
            : `${rua}, ${n} - ${p.bairro ?? 'Niterói'}, Niterói - RJ`,
      descricao: longo ? DESCRICAO_LONGA : i % 31 === 1 ? null : i % 5 === 0 ? 'Apagada' : `Lâmpada apagada em frente ao nº ${n}.`,
      local: i % 41 === 0 ? 'Escadaria entre a Rua Professora Maria Luiza Cardoso de Albuquerque e a Travessa Doutor Bittencourt' : null,
      mudouLogradouro: i % 53 === 0,
    })
    const lista: Foto[] = []
    if (i === 0) {
      // muitas fotos, de todo formato, uma que não existe mais
      for (let k = 0; k < 37; k++) lista.push({ url: fotoSvg(1200, 900, `Foto ${k + 1}`, '#4b5563'), atualizadoEm: null })
      lista.splice(2, 0, { url: fotoSvg(4000, 200, 'panorâmica 4000×200', '#1d4ed8'), atualizadoEm: null })
      lista.splice(3, 0, { url: fotoSvg(200, 4000, 'em pé', '#047857'), atualizadoEm: null })
      lista.splice(4, 0, { url: `${import.meta.env.BASE_URL}img/foto-que-sumiu.jpg`, atualizadoEm: null })
    } else if (i % 3 === 0) {
      lista.push({ url: fotoSvg(900, 1600, 'retrato', '#6b7280'), atualizadoEm: null })
    }
    if (lista.length) fotos.set(chave, lista)
  })

  const linhas: LinhaVw[] = []
  for (const p of pedidos)
    p.saidas.forEach(([sa, re], k) =>
      linhas.push({
        id_colab: p.id,
        type: p.type,
        categoria: 'Iluminação pública',
        categoria_revisada: p.categoria,
        bairro: p.bairro,
        regiao: p.regiao,
        data_saida: isoDe(sa),
        data_retorno: re === null ? null : isoDe(re),
        reaberto: k > 0,
        resolvido_por_led: false,
        lat: p.lat,
        lng: p.lng,
        origem: p.origem,
        origem_detalhe: p.origemDetalhe,
        vereador_id: p.vereador?.id ?? null,
        vereador: p.vereador?.nome ?? null,
        tipo_local: p.tipoLocal,
        local: p.local,
        logradouro_norm: p.rua,
      }),
    )

  return {
    linhas,
    vereadores: VEREADORES.map((v) => ({ ...v })),
    categorias,
    bairros,
    detalhes,
    fotos,
    // pior: última carga há 3 dias (aparece o aviso de desatualizado)
    atualizadoEm: new Date(Date.now() - (cenario === 'pior' ? 3.2 : 0) * 86_400_000),
  }
}
