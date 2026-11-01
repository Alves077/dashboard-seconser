// Textos de número e de dias que a chefia lê — "0 dias" não pode voltar (usuário, 24/10/2026)
import { describe, expect, it } from 'vitest'
import { textoDiasSelo } from '@/dados/regras'
import {
  dias,
  diasEspera,
  diasEsperaCurto,
  diasLevou,
  diasLevouCurto,
  metadeEm,
  numero,
  pct,
  pctCurto,
  variacao,
} from '@/lib/formato'

describe('dias', () => {
  it('espera: "hoje" no lugar de "0 dias"', () => {
    expect(diasEspera(0)).toBe('hoje')
    expect(diasEspera(1)).toBe('1 dia')
    expect(diasEspera(12)).toBe('12 dias')
    expect(diasEspera(1200)).toBe('1.200 dias')
  })

  it('quanto levou: "mesmo dia" no lugar de "0 dias", e a mediana de lista par com vírgula', () => {
    expect(diasLevou(0)).toBe('mesmo dia')
    expect(diasLevou(1)).toBe('1 dia')
    expect(diasLevou(2.5)).toBe('2,5 dias')
    expect(diasLevou(7)).toBe('7 dias')
  })

  it('colunas de tabela', () => {
    expect(diasEsperaCurto(0)).toBe('hoje')
    expect(diasEsperaCurto(12, 'd')).toBe('12d')
    expect(diasLevouCurto(0, 'd')).toBe('mesmo dia')
    expect(diasLevouCurto(2.5, 'd')).toBe('2,5d')
  })

  it('selo da situação: executado diz quanto levou, em aberto diz há quanto espera', () => {
    expect(textoDiasSelo('ok', 0)).toBe('mesmo dia')
    expect(textoDiasSelo('andamento', 0)).toBe('hoje')
    expect(textoDiasSelo('atraso', 9)).toBe('9 dias')
  })

  it('mediana na frase dos Executados', () => {
    expect(metadeEm(0)).toBe('metade no mesmo dia')
    expect(metadeEm(3)).toBe('metade em até 3 dias')
    expect(metadeEm(1)).toBe('metade em até 1 dia')
  })

  it('"dias" sozinho continua dizendo o número (é para medidas, não para espera)', () => {
    expect(dias(0)).toBe('0 dias')
  })
})

describe('números e porcentagens', () => {
  it('milhar com ponto, sem NaN na tela', () => {
    expect(numero(17724)).toBe('17.724')
    expect(numero(NaN)).toBe('—')
  })

  it('pct sem base vira "—"', () => {
    expect(pct(1, 3)).toBe('33,3%')
    expect(pct(68, 127)).toBe('53,5%')
    expect(pct(1, 0)).toBe('—')
  })

  it('pctCurto tira o ",0" do inteiro', () => {
    expect(pctCurto(1, 2)).toBe('50%')
    expect(pctCurto(1, 3)).toBe('33,3%')
    expect(pctCurto(0, 0)).toBe('—')
  })

  it('variação: sem base (anterior vazio ou zero) é null, nunca Infinity', () => {
    expect(variacao(110, 100)).toBeCloseTo(10)
    expect(variacao(90, 100)).toBeCloseTo(-10)
    expect(variacao(5, 0)).toBeNull()
    expect(variacao(null, 10)).toBeNull()
    expect(variacao(10, undefined)).toBeNull()
  })
})
