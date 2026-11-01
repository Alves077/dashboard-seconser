// Página Serviços: cada serviço uma vez, pela saída mais recente, e o período e os filtros do site
import { describe, expect, it } from 'vitest'
import { listarServicos, passaEstado, type Estado } from '@/calculos/servicos'
import { aplicarFiltros, intervaloDo } from '@/filtros/filtros'
import { formatarDia } from '@/lib/datas'
import { dia, filtros, HOJE, montarBase } from './base'

describe('listarServicos', () => {
  const base = montarBase([
    { id: 10, idas: [['2026-10-01', '2026-10-03'], ['2026-10-20', null]] }, // reaberto: vale a 2ª ida, em atraso (11 dias)
    { id: 11, idas: [['2026-10-28', null]] }, // em atendimento (3 dias)
    { id: 12, idas: [['2026-10-28', '2026-10-30']], bairro: 'Fonseca', regiao: 'Norte' }, // executado em 2 dias
    { id: 13, idas: [] }, // sem saída: não aparece
  ])
  const linhas = listarServicos(base, filtros(), HOJE)

  it('um por serviço, a saída mais recente primeiro (no mesmo dia, o id maior)', () => {
    expect(linhas.map((l) => l.servico.idColab)).toEqual([12, 11, 10])
    expect(linhas.find((l) => l.servico.idColab === 10)!.saida.ordem).toBe(2)
  })

  it('situação e dias: em aberto conta até hoje; executado, até a execução', () => {
    expect(linhas.map((l) => [l.servico.idColab, l.situacao, l.dias])).toEqual([
      [12, 'ok', 2],
      [11, 'andamento', 3],
      [10, 'atraso', 11],
    ])
  })

  it('a chave de situação', () => {
    const ids = (e: Estado) => linhas.filter((l) => passaEstado(l, e)).map((l) => l.servico.idColab)
    expect(ids('todos')).toEqual([12, 11, 10])
    expect(ids('aberto')).toEqual([11, 10])
    expect(ids('atraso')).toEqual([10])
    expect(ids('executado')).toEqual([12])
  })

  it('lugar vale; o período do site, não', () => {
    expect(listarServicos(base, filtros({ regiao: 'Norte' }), HOJE).map((l) => l.servico.idColab)).toEqual([12])
    const mesPassado = filtros({ periodo: { tipo: 'mes', mes: 202608 } })
    expect(listarServicos(base, mesPassado, HOJE)).toHaveLength(3)
  })
})

describe('período do site', () => {
  it('últimos 7 dias terminam hoje e contam hoje', () => {
    const i = intervaloDo({ tipo: 'atalho', atalho: '7d' }, HOJE)
    expect([i.de, i.ate]).toEqual([dia('2026-10-25'), HOJE])
  })

  it('mês anterior e meses fechados não contam o mês em curso', () => {
    const ant = intervaloDo({ tipo: 'atalho', atalho: 'mes-anterior' }, HOJE)
    expect([formatarDia(ant.de), formatarDia(ant.ate), ant.rotulo]).toEqual(['01/09/2026', '30/09/2026', 'setembro de 2026'])
    const tres = intervaloDo({ tipo: 'atalho', atalho: '3m' }, HOJE)
    expect([formatarDia(tres.de), formatarDia(tres.ate)]).toEqual(['01/07/2026', '30/09/2026'])
  })

  it('contando pela execução, quem não voltou fica de fora', () => {
    const base = montarBase([
      { id: 1, idas: [['2026-10-20', '2026-10-21']] },
      { id: 2, idas: [['2026-10-20', null]] },
    ])
    const outubro = filtros({ periodo: { tipo: 'mes', mes: 202609 } })
    expect(aplicarFiltros(base.saidas, outubro, HOJE).saidas).toHaveLength(2)
    expect(aplicarFiltros(base.saidas, { ...outubro, contarPor: 'retorno' }, HOJE).saidas).toHaveLength(1)
  })
})
