// Os números dos relatórios Em aberto, Executados e Lista de campo, numa base pequena conferida de cabeça
import { describe, expect, it } from 'vitest'
import { CATEGORIA_RISCO } from '@/dados/regras'
import { faixasDaEpoca, listaCampo, relatorioAbertos, relatorioExecutados, variaNaEpoca } from '@/calculos/relatorios'
import { entre, filtros, HOJE, montarBase } from './base'

describe('Em aberto', () => {
  // hoje = 31/10/2026
  const base = montarBase([
    { id: 1, idas: [['2026-10-31', null]], rua: 'Rua Moreira César' }, // saiu hoje: 0 dias
    { id: 2, idas: [['2026-10-20', '2026-10-22'], ['2026-10-29', null]], origem: 'Vereador', vereador: 'Fulano' }, // 2ª ida, 2 dias
    { id: 3, idas: [['2026-09-15', null]], bairro: 'Fonseca', regiao: 'Norte', categoria: CATEGORIA_RISCO }, // 46 dias
    { id: 4, idas: [['2026-10-01', '2026-10-03']], bairro: 'Fonseca', regiao: 'Norte' }, // executado: fora
    { id: 5, idas: [['2026-06-01', null]], bairro: 'Itaipu', regiao: 'Oceânica' }, // 152 dias
  ])

  it('a fila da cidade', () => {
    const r = relatorioAbertos(base, filtros(), HOJE)
    expect(r.n).toBe(4)
    expect(r.totalCidade).toBe(4)
    expect(r.atraso).toBe(2) // 46 e 152 dias
    expect(r.mais30).toBe(2)
    expect(r.media).toBe((0 + 2 + 46 + 152) / 4)
    expect(r.maisAntigo).toBe(152)
    expect(r.institucionais).toBe(1)
    expect(r.voltando).toBe(1)
    expect(r.atendidos).toBe(3) // Icaraí, Fonseca, Itaipu
    // faixas: até 5 · 6–15 · 16–30 · 31–90 · > 90
    expect(r.espera).toEqual([2, 0, 0, 1, 1])
    expect(r.lugares.map((l) => [l.nome, l.abertos])).toEqual([
      ['Praias da Baía', 2],
      ['Norte', 1],
      ['Oceânica', 1],
    ])
    expect(r.antigos.map((it) => it.servico.idColab)).toEqual([5, 3, 2, 1])
    expect(r.epoca).toBeNull()
  })

  it('a tabela desce um nível: região → bairros, bairro → ruas', () => {
    const regiao = relatorioAbertos(base, filtros({ regiao: 'Praias da Baía' }), HOJE)
    expect(regiao.nivel).toBe('bairro')
    expect(regiao.lugares.map((l) => [l.nome, l.abertos])).toEqual([['Icaraí', 2]])
    const bairro = relatorioAbertos(base, filtros({ regiao: 'Praias da Baía', bairro: 'Icaraí' }), HOJE)
    expect(bairro.nivel).toBe('rua')
    expect(bairro.lugares.map((l) => l.nome)).toEqual(['Rua Moreira César', 'Rua não identificada'])
    expect(bairro.totalCidade).toBe(4)
    expect(bairro.nome).toBe('Icaraí')
  })

  it('época "Hoje": só o que saiu hoje', () => {
    const r = relatorioAbertos(base, filtros(), HOJE, entre('2026-10-31', '2026-10-31'))
    expect(r.n).toBe(1)
    expect(r.epoca).toEqual({ saiu: 1, esperaMin: 0, esperaMax: 0 })
  })

  it('época de 7 dias: conta quem saiu nela (inclusive quem já voltou)', () => {
    const extra = montarBase([
      { id: 1, idas: [['2026-10-31', null]] },
      { id: 2, idas: [['2026-10-29', null]] },
      { id: 6, idas: [['2026-10-26', '2026-10-28']] }, // saiu na época e já voltou
      { id: 7, idas: [['2026-10-24', null]] }, // um dia antes da época
    ])
    const r = relatorioAbertos(extra, filtros(), HOJE, entre('2026-10-25', '2026-10-31'))
    expect(r.n).toBe(2)
    expect(r.epoca).toEqual({ saiu: 3, esperaMin: 0, esperaMax: 6 })
    expect(r.totalCidade).toBe(3)
  })
})

describe('faixas e indicadores que a época deixa acontecer', () => {
  it('sem época: as cinco faixas com o rótulo inteiro', () => {
    expect(faixasDaEpoca(0, Infinity).map((f) => f.rotulo)).toEqual([
      'Até 5 dias',
      '6 a 15 dias',
      '16 a 30 dias',
      '31 a 90 dias',
      'Mais de 90 dias',
    ])
  })

  it('últimos 7 dias: espera de 0 a 6', () => {
    expect(faixasDaEpoca(0, 6)).toEqual([
      { i: 0, rotulo: 'Até 5 dias' },
      { i: 1, rotulo: '6 dias' },
    ])
  })

  it('setembro visto em 21/10: espera de 21 a 50', () => {
    expect(faixasDaEpoca(21, 50)).toEqual([
      { i: 2, rotulo: '21 a 30 dias' },
      { i: 3, rotulo: '31 a 50 dias' },
    ])
  })

  it('época antiga sem fim: a última faixa abre em "Mais de"', () => {
    expect(faixasDaEpoca(40, Infinity)).toEqual([
      { i: 3, rotulo: '40 a 90 dias' },
      { i: 4, rotulo: 'Mais de 90 dias' },
    ])
    expect(faixasDaEpoca(100, Infinity)).toEqual([{ i: 4, rotulo: 'Mais de 99 dias' }])
  })

  it('"em atraso" e "acima de 30 dias" só quando a época deixa variar', () => {
    expect(variaNaEpoca(null)).toEqual({ atraso: true, mais30: true })
    expect(variaNaEpoca({ esperaMin: 0, esperaMax: 6 })).toEqual({ atraso: true, mais30: false })
    expect(variaNaEpoca({ esperaMin: 21, esperaMax: 50 })).toEqual({ atraso: false, mais30: true })
    expect(variaNaEpoca({ esperaMin: 0, esperaMax: 0 })).toEqual({ atraso: false, mais30: false })
  })
})

describe('Executados', () => {
  // época: 20 a 26/10/2026, pela data de execução
  const base = montarBase([
    { id: 1, idas: [['2026-10-20', '2026-10-20']], rua: 'Rua B' }, // mesmo dia
    { id: 2, idas: [['2026-10-10', '2026-10-21']], rua: 'Rua A' }, // 11 dias, saiu antes da época
    { id: 3, idas: [['2026-10-22', '2026-10-25']], bairro: 'Fonseca', regiao: 'Norte' }, // 3 dias
    { id: 4, idas: [['2026-10-01', '2026-10-05'], ['2026-10-23', '2026-10-26']], bairro: 'Itaipu', regiao: 'Oceânica', origem: 'Vereador', vereador: 'Fulano' }, // 2ª ida: 3 dias
    { id: 5, idas: [['2026-10-24', null]] }, // saiu na época e segue na rua
    { id: 6, idas: [['2026-10-18', '2026-10-27']] }, // executado depois da época
  ])
  const r = relatorioExecutados(base, filtros(), entre('2026-10-20', '2026-10-26'))

  it('quantos, no prazo, média e mediana', () => {
    expect(r.n).toBe(4)
    expect(r.noPrazo).toBe(3)
    expect(r.foraPrazo).toBe(1)
    expect(r.media).toBe((0 + 11 + 3 + 3) / 4)
    expect(r.mediana).toBe(3)
    // faixas: até 3 · 4–5 · 6–15 · 16–30 · > 30
    expect(r.faixas).toEqual([3, 0, 1, 0, 0])
  })

  it('saíram para a rua na época e, dos executados, quantos já estavam na rua antes', () => {
    expect(r.sairam).toBe(4) // 20, 22, 23 e 24/10 (a 2ª ida do 4 conta; o 6 saiu dia 18)
    expect(r.saiuAntes).toBe(1) // o 2, que saiu dia 10
  })

  it('por região, e a lista região → bairro → execução mais recente primeiro', () => {
    expect(r.lugares.map((l) => [l.nome, l.executados, l.noPrazo])).toEqual([
      ['Praias da Baía', 2, 1],
      ['Norte', 1, 1],
      ['Oceânica', 1, 1],
    ])
    expect(r.regioes[0].nome).toBe('Praias da Baía')
    expect(r.regioes[0].bairros[0].itens.map((it) => it.servico.idColab)).toEqual([2, 1]) // 21/10 antes de 20/10
    expect(r.vereadores).toEqual([['Fulano', 1]])
    expect(r.origens.map((o) => [o.nome, o.executados])).toEqual([
      ['Cidadão', 3],
      ['Vereador', 1],
    ])
  })

  it('a 2ª ida que voltou conta de novo; a 1ª, executada antes da época, não', () => {
    const quatro = r.regioes.find((g) => g.nome === 'Oceânica')!.bairros[0].itens
    expect(quatro).toHaveLength(1)
    expect(quatro[0].saida.ordem).toBe(2)
  })

  it('bairros e ruas: os 6 maiores e o resto em "Demais"', () => {
    const bairros = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const muitos = montarBase(
      bairros.map((b, i) => ({
        id: 100 + i,
        bairro: `Bairro ${b}`,
        regiao: 'Norte',
        idas: Array.from({ length: 8 - i }, (_, k): [string, string | null] => [`2026-10-0${k + 1}`, '2026-10-20']),
      })),
    )
    const rr = relatorioExecutados(muitos, filtros({ regiao: 'Norte' }), entre('2026-10-20', '2026-10-26'))
    expect(rr.nivel).toBe('bairro')
    expect(rr.lugares).toHaveLength(7)
    expect(rr.lugares[6]).toMatchObject({ nome: 'Demais (2 bairros)', executados: 2 + 1 })
    expect(rr.tres.map((l) => l.nome)).toEqual(['Bairro A', 'Bairro B', 'Bairro C'])
  })

  it('categorias: 7 cabem inteiras; 8 viram 6 e "Demais (2)"', () => {
    const cats = (n: number) =>
      montarBase(Array.from({ length: n }, (_, i) => ({ id: 200 + i, categoria: `Categoria ${i + 1}`, idas: [['2026-10-20', '2026-10-21']] })))
    const periodo = entre('2026-10-20', '2026-10-26')
    expect(relatorioExecutados(cats(7), filtros(), periodo).categorias).toHaveLength(7)
    const oito = relatorioExecutados(cats(8), filtros(), periodo).categorias
    expect(oito).toHaveLength(7)
    expect(oito[6]).toMatchObject({ nome: 'Demais (2)', executados: 2 })
  })

  it('sem nada executado na época, nada de NaN', () => {
    const vazio = relatorioExecutados(base, filtros(), entre('2026-09-01', '2026-09-30'))
    expect(vazio).toMatchObject({ n: 0, media: 0, mediana: 0, noPrazo: 0, faixas: [0, 0, 0, 0, 0] })
  })
})

describe('Lista de campo', () => {
  // pinos em Icaraí: três a ~110 m um do outro (um grupo), um a ~2 km (sozinho)
  const base = montarBase([
    { id: 1, idas: [['2026-10-01', null]], lat: -22.9, lng: -43.1, rua: 'Rua A' },
    { id: 2, idas: [['2026-10-10', null]], lat: -22.901, lng: -43.1, rua: 'Rua A' },
    { id: 3, idas: [['2026-10-29', null]], lat: -22.902, lng: -43.1, rua: 'Rua B', categoria: CATEGORIA_RISCO },
    { id: 4, idas: [['2026-10-05', null]], lat: -22.92, lng: -43.1, rua: 'Rua C' },
    { id: 5, idas: [['2026-10-05', '2026-10-06']], lat: -22.9, lng: -43.1, rua: 'Rua A' }, // executado: fora
  ])

  it('agrupa os pedidos próximos, o mais antigo primeiro', () => {
    const r = listaCampo(base, filtros(), HOJE, false)
    expect(r.total).toBe(4)
    expect(r.risco).toBe(1)
    const grupos = r.regioes[0].bairros[0].grupos
    expect(grupos.map((g) => [g.nome, g.itens.map((it) => it.servico.idColab)])).toEqual([
      ['Rua A e arredores', [1, 2, 3]],
      ['Rua C', [4]],
    ])
  })

  it('só os em atraso: sai quem ainda está no prazo', () => {
    const r = listaCampo(base, filtros(), HOJE, true)
    expect(r.total).toBe(3)
    expect(r.risco).toBe(0)
  })
})
