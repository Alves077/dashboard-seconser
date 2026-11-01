// Tela e PDF dividem as cores das faixas e os textos dos relatórios: uma faixa nova sem cor (ou uma cor a mais) e um
// texto com a concordância errada aparecem aqui
import { describe, expect, it } from 'vitest'
import { FAIXAS_ESPERA } from '@/calculos/panorama'
import { FAIXAS_EXEC } from '@/calculos/prazo'
import { alertaDias, fraseDeQuando, NIVEL } from '@/calculos/relatorios'
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
  const texto = (n: number, antes: number) => fraseDeQuando(n, antes).map((p) => p.t).join('')
  it('plural, singular e "Todos os"', () => {
    expect(texto(58, 51)).toBe('Dos 58 executados, 7 saíram nesse mesmo período e 51 já estavam na rua antes dele.')
    expect(texto(5, 1)).toBe('Dos 5 executados, 4 saíram nesse mesmo período e 1 já estava na rua antes dele.')
    expect(texto(2, 1)).toBe('Dos 2 executados, 1 saiu nesse mesmo período e 1 já estava na rua antes dele.')
    expect(texto(12, 0)).toBe('Todos os 12 executados saíram nesse mesmo período.')
    expect(texto(3, 3)).toBe('Todos os 3 executados já estavam na rua antes dele.')
    expect(texto(1, 0)).toBe('O executado saiu nesse mesmo período.')
    expect(texto(1, 1)).toBe('O executado já estava na rua antes dele.')
  })

  it('os números em negrito são as duas partes', () => {
    expect(fraseDeQuando(1234, 1000).filter((p) => p.forte).map((p) => p.t)).toEqual(['234', '1.000'])
  })
})
