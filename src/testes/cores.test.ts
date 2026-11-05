// Tela e PDF dividem as cores das faixas e os textos dos relatórios: uma faixa nova sem cor (ou uma cor a mais) e um
// texto com a concordância errada aparecem aqui
import { describe, expect, it } from 'vitest'
import { FAIXAS_ESPERA } from '@/calculos/panorama'
import { FAIXAS_EXEC } from '@/calculos/prazo'
import { alertaDias, fraseAbertosHoje, fraseDeQuando, fraseSairam, NIVEL } from '@/calculos/relatorios'
import { FAIXAS } from '@/dados/regras'
import { COR_ESPERA, COR_ESPERA_PDF, COR_EXEC, COR_EXEC_PDF, COR_FAIXA_MENSAL, COR_FAIXA_MENSAL_PDF } from '@/lib/cores'

describe('cores das faixas', () => {
  it('uma cor por faixa, na tela e no PDF', () => {
    expect(COR_ESPERA).toHaveLength(FAIXAS_ESPERA.length)
    expect(COR_ESPERA_PDF).toHaveLength(FAIXAS_ESPERA.length)
    expect(COR_EXEC).toHaveLength(FAIXAS_EXEC.length)
    expect(COR_EXEC_PDF).toHaveLength(FAIXAS_EXEC.length)
    expect(COR_FAIXA_MENSAL).toHaveLength(FAIXAS.length)
    expect(COR_FAIXA_MENSAL_PDF).toHaveLength(FAIXAS.length)
  })

  it('o laranja do risco elétrico fica fora das faixas do PDF (cor reservada)', () => {
    for (const cor of [...COR_ESPERA_PDF, ...COR_EXEC_PDF, ...COR_FAIXA_MENSAL_PDF]) expect(cor).not.toBe('#ec835a')
  })
})

describe('textos e limites dos relatórios', () => {
  it('espera em âmbar acima de 15 dias e em vermelho acima de 30', () => {
    expect([15, 16, 30, 31].map(alertaDias)).toEqual([null, 'andamento', 'andamento', 'atraso'])
  })

  it('os três níveis da distribuição', () => {
    expect(Object.values(NIVEL).map((n) => n.grupos)).toEqual(['Regiões', 'Bairros', 'Ruas'])
    expect(NIVEL.bairro.tres).toBe('Os três bairros')
  })
})

describe('frase dos Executados: de quando eram os executados', () => {
  const texto = (n: number, antes: number, quando = 'ontem') => fraseDeQuando(n, antes, quando).map((p) => p.t).join('')
  it('plural, singular e "Todos os"', () => {
    expect(texto(58, 51)).toBe('Dos 58 executados, 7 saíram ontem e 51 já estavam na rua antes.')
    expect(texto(5, 1)).toBe('Dos 5 executados, 4 saíram ontem e 1 já estava na rua antes.')
    expect(texto(2, 1)).toBe('Dos 2 executados, 1 saiu ontem e 1 já estava na rua antes.')
    expect(texto(12, 0)).toBe('Todos os 12 executados saíram ontem.')
    expect(texto(3, 3)).toBe('Todos os 3 executados já estavam na rua antes de ontem.')
    expect(texto(1, 0)).toBe('O executado saiu ontem.')
    expect(texto(1, 1)).toBe('O executado já estava na rua antes de ontem.')
  })

  it('a época da frase: sem as datas entre parênteses, e "antes" de acordo com ela', () => {
    expect(texto(110, 98, 'nos últimos 7 dias (28/10 até 03/11)')).toBe('Dos 110 executados, 12 saíram nos últimos 7 dias e 98 já estavam na rua antes.')
    expect(texto(3, 3, 'nos últimos 30 dias (05/10 até 03/11)')).toBe('Todos os 3 executados já estavam na rua antes desses 30 dias.')
    expect(texto(1560, 929, 'em outubro de 2026')).toBe('Dos 1.560 executados, 631 saíram em outubro de 2026 e 929 já estavam na rua antes.')
    expect(texto(4, 4, 'em 30/10')).toBe('Todos os 4 executados já estavam na rua antes de 30/10.')
  })

  it('os números em negrito são as duas partes', () => {
    expect(fraseDeQuando(1234, 1000, 'ontem').filter((p) => p.forte).map((p) => p.t)).toEqual(['234', '1.000'])
  })
})

describe('frase dos Executados: o que saiu na mesma época', () => {
  const texto = (n: number, quando: string) => fraseSairam(n, quando).map((p) => p.t).join('')
  it('dia, período ou mês', () => {
    expect(texto(74, 'ontem')).toBe('No mesmo dia, 74 serviços foram para a rua.')
    expect(texto(1, 'hoje')).toBe('No mesmo dia, 1 serviço foi para a rua.')
    expect(texto(5, 'em 30/10')).toBe('No mesmo dia, 5 serviços foram para a rua.')
    expect(texto(1317, 'nos últimos 30 dias (05/10 até 03/11)')).toBe('No mesmo período, 1.317 serviços foram para a rua.')
    expect(texto(145, 'em outubro de 2026')).toBe('No mesmo mês, 145 serviços foram para a rua.')
    expect(texto(12, 'em março de 2026')).toBe('No mesmo mês, 12 serviços foram para a rua.')
  })
})

describe('frase do Mensal: em aberto hoje por ano e mês', () => {
  const ano = (a: number, meses: Record<number, number>) => {
    const m: (number | null)[] = Array(12).fill(null)
    for (const [i, n] of Object.entries(meses)) m[+i] = n
    return { ano: a, meses: m, total: Object.values(meses).reduce((x, y) => x + y, 0) }
  }
  const texto = (total: number, anos: ReturnType<typeof ano>[], doAno: boolean) => fraseAbertosHoje(total, anos, doAno).map((p) => p.t).join('')
  it('no relatório de um ano, só os meses', () => {
    expect(texto(24, [ano(2026, { 0: 16, 1: 8 })], true)).toBe('Em aberto hoje: 24 (jan 16, fev 8).')
  })
  it('no histórico, o ano sempre aparece', () => {
    expect(texto(905, [ano(2025, { 6: 0 }), ano(2026, { 3: 1, 10: 904 })], false)).toBe('Em aberto hoje: 905, todos de 2026 (abr 1, nov 904).')
    expect(texto(1, [ano(2026, { 9: 1 })], false)).toBe('Em aberto hoje: 1, de 2026 (out 1).')
    expect(texto(10, [ano(2016, { 9: 1 }), ano(2025, { 1: 2 }), ano(2026, { 0: 7 })], false)).toBe(
      'Em aberto hoje: 10 — 7 de 2026 (jan 7); 2 de 2025 (fev 2) e 1 de 2016 (out 1).',
    )
  })
})
