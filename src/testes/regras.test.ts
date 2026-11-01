// Regras de negócio das saídas (as mesmas da vw_servicos) e o endereço curto das listas
import { describe, expect, it } from 'vitest'
import { enderecoCurto, faixa, mediana, noPrazo, situacao } from '@/dados/regras'
import { chaveMes, diaDe, rotuloMes } from '@/lib/datas'
import { HOJE, montarBase } from './base'

describe('situação e prazo de 5 dias corridos', () => {
  const base = montarBase([
    { id: 1, idas: [['2026-10-26', null]] }, // saída + 5 = hoje
    { id: 2, idas: [['2026-10-25', null]] }, // saída + 5 = ontem
    { id: 3, idas: [['2026-10-20', '2026-10-25']] }, // levou 5 dias
    { id: 4, idas: [['2026-10-20', '2026-10-26']] }, // levou 6 dias
  ])
  const [a, b, c, d] = base.servicos.map((s) => s.saidas[0])

  it('em aberto: em atendimento até o 5º dia, em atraso a partir do 6º', () => {
    expect(situacao(a, HOJE)).toBe('andamento')
    expect(situacao(b, HOJE)).toBe('atraso')
  })

  it('executado é sempre OK; no prazo até 5 dias', () => {
    expect(situacao(d, HOJE)).toBe('ok')
    expect(noPrazo(c)).toBe(true)
    expect(noPrazo(d)).toBe(false)
    expect(noPrazo(a)).toBeNull()
  })

  it('faixas do relatório mensal', () => {
    expect(faixa(c)).toBe('4a7')
    expect(faixa(a)).toBeNull()
  })
})

describe('mediana', () => {
  it('lista par é a média dos dois do meio, e não mexe na lista', () => {
    const v = [11, 0, 3, 3]
    expect(mediana(v)).toBe(3)
    expect(mediana([1, 4])).toBe(2.5)
    expect(mediana([5, 1, 3])).toBe(3)
    expect(mediana([])).toBeNull()
    expect(v).toEqual([11, 0, 3, 3])
  })
})

describe('endereço curto (listas dos relatórios)', () => {
  it('corta o fim que vem do Colab: bairro, cidade, CEP, país', () => {
    expect(enderecoCurto('Rua Moreira César, 229 - Icaraí, Niterói - RJ, 24230-054, Brasil')).toBe('Rua Moreira César, 229')
    expect(enderecoCurto('Rua Doutor Paulo César, 10 - Santa Rosa, Niterói - RJ')).toBe('Rua Doutor Paulo César, 10')
    expect(enderecoCurto('Rua Noronha Torrezão, 50, Niterói - RJ')).toBe('Rua Noronha Torrezão, 50')
    expect(enderecoCurto('Avenida Sete de Setembro, 100, 24230-251')).toBe('Avenida Sete de Setembro, 100')
    expect(enderecoCurto('Rua Tiradentes, 5, 24220-000, Brasil')).toBe('Rua Tiradentes, 5')
  })

  it('bairro com hífen no nome também sai', () => {
    expect(enderecoCurto('Rua A, 1 - São Francisco, Niterói - RJ, 24360-000')).toBe('Rua A, 1')
  })

  it('"Brasil" e "Niterói" no nome da rua ficam', () => {
    expect(enderecoCurto('Rua Pau Brasil, 10')).toBe('Rua Pau Brasil, 10')
    expect(enderecoCurto('Avenida Brasil, 300')).toBe('Avenida Brasil, 300')
    expect(enderecoCurto('Rua Niterói, 12')).toBe('Rua Niterói, 12')
  })

  it('o número sem bairro fica como está', () => {
    expect(enderecoCurto('  Travessa Beltrão, 7  ')).toBe('Travessa Beltrão, 7')
  })
})

describe('chave de mês (mês de 0 a 11)', () => {
  it('setembro de 2026 = 202608, e o rótulo volta certo', () => {
    expect(chaveMes(diaDe(2026, 8, 15))).toBe(202608)
    expect(rotuloMes(202608)).toBe('set/26')
    expect(rotuloMes(202609)).toBe('out/26')
  })
})
