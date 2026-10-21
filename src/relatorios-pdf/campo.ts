// Lista de campo em PDF — a mesma tabela de relatorios/Campo.tsx no papel: cada região começa numa página
// nova, bairro em destaque, grupos de pedidos próximos (até 300 m) e a coluna de retorno para escrever à mão.
import type { RegiaoCampo } from '@/calculos/relatorios'
import { CATEGORIA_RISCO, rotuloLugar, situacao } from '@/dados/regras'
import type { Detalhe } from '@/dados/tipos'
import { formatarDiaNoAno, type Dia } from '@/lib/datas'
import { numero } from '@/lib/formato'
import { COR, MARGEM, type Folha } from './motor'
import { tabela, type Coluna, type LinhaTabela } from './pecas'

/** .tabela-campo: mais linhas por folha, texto centrado na altura da linha */
const ESTILO = { tam: 11.5, padX: 5, padY: 4, meio: true, fixa: true }

export function desenharCampo(f: Folha, regioes: RegiaoCampo[], detalhes: Map<string, Detalhe> | null, hoje: Dia) {
  const x = f.x0
  const w = f.largura
  if (regioes.length === 0) {
    f.paragrafo('Nenhum serviço em aberto com esses filtros.', x, w, { tam: 13, cor: COR.ink2, alinhar: 'centro' })
    return
  }
  f.paragrafo('Dias = desde a última saída para a rua (em vermelho, passou dos 5 dias). "(2ª ida)" = serviço que voltou à rua. Anotar à mão a data de retorno.', x, w, {
    tam: 10.5,
    lh: 1.625,
    cor: COR.ink3,
  })
  f.y += 16

  const colunas: Coluna[] = [
    { titulo: 'Serviço', fracao: 0.14, quebra: true },
    { titulo: 'Categoria', esq: true, quebra: true, ...(detalhes ? { fracao: 0.2 } : { fracao: 0.42 }) },
    ...(detalhes ? [{ titulo: 'Endereço', esq: true, quebra: true }] : []),
    { titulo: 'Saída', fracao: 0.09, alinhar: 'centro' as const },
    { titulo: 'Dias', fracao: 0.07, alinhar: 'centro' as const },
    { titulo: 'Retorno', fracao: 0.16 },
  ]

  regioes.forEach((reg, i) => {
    if (i > 0 && f.y > MARGEM + 1) f.novaPagina()
    // região: nome à esquerda, total à direita, fio embaixo
    f.texto(reg.nome, x, f.y, { tam: 15, peso: 600 })
    f.texto(`${numero(reg.total)} ${reg.total === 1 ? 'serviço' : 'serviços'}`, x + w, f.y + 2, { tam: 11, cor: COR.ink2, alinhar: 'dir' })
    f.y += 22.5 + 4
    f.linha(x, f.y + 0.5, x + w, f.y + 0.5, { cor: COR.ink })
    f.y += 1

    for (const b of reg.bairros) {
      f.y += 20
      // o nome do bairro nunca fica sozinho no pé da página (vai junto com o cabeçalho e a 1ª linha)
      f.garantir(21 + 6 + 90)
      f.caixa(x, f.y, 3, 17.5, { fundo: COR.ink })
      f.texto(b.nome, x + 11, f.y, { tam: 14, peso: 600, lh: 1.25 })
      f.texto(`· ${numero(b.itens.length)}`, x + 11 + f.medirTexto(b.nome, 14, 600) + 4, 0, { tam: 12, cor: COR.ink2, base: f.base(f.y, 14, 1.25) })
      f.y += 17.5 + 6

      const linhas: LinhaTabela[] = []
      for (const g of b.grupos) {
        linhas.push({ tipo: 'grupo', trechos: [{ t: `${g.nome} ` }, { t: `· ${numero(g.itens.length)}`, peso: 400, cor: COR.ink3 }] })
        for (const { servico, saida, dias } of g.itens) {
          const d = detalhes?.get(servico.chave)
          const lugar = rotuloLugar(servico) ?? d?.local ?? undefined
          const atraso = situacao(saida, hoje) === 'atraso'
          linhas.push({
            celulas: [
              { trechos: [{ t: String(servico.idColab), peso: 600 }, ...(saida.ordem > 1 ? [{ t: ` (${saida.ordem}ª\u00a0ida)`, tam: 10, cor: COR.ink3 }] : [])] },
              {
                trechos: [...(servico.categoria === CATEGORIA_RISCO ? [{ t: '', icone: 'raio' as const }] : []), { t: servico.categoria ?? 'Sem categoria' }],
                abaixo: detalhes ? undefined : lugar,
              },
              ...(detalhes ? [{ trechos: [{ t: d?.endereco ?? '—' }], abaixo: lugar }] : []),
              formatarDiaNoAno(saida.dataSaida, hoje),
              { trechos: [{ t: numero(dias), ...(atraso ? { peso: 500 as const, cor: COR.atrasoTexto } : {}) }] },
              { trechos: [], retorno: true },
            ],
          })
        }
      }
      tabela(f, x, w, colunas, linhas, ESTILO)
    }
  })
}
