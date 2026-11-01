// Tela e PDF dividem as cores e os textos das faixas: uma faixa nova sem cor (ou uma cor a mais) aparece aqui
import { describe, expect, it } from 'vitest'
import { FAIXAS_ESPERA } from '@/calculos/panorama'
import { FAIXAS_EXEC } from '@/calculos/prazo'
import { alertaDias, NIVEL } from '@/calculos/relatorios'
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
