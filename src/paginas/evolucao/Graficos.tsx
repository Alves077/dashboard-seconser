// Gráficos da Evolução. Cada um com o seu eixo (escalas diferentes não dividem quadro):
//   Fluxo     — a fila no fim de cada bloco (área) num gráfico baixo em cima, e entraram × executados
//               (linhas) embaixo, cada um com a sua escala: com a fila muito maior que o fluxo da semana
//               (920 × ~150 em out/26), no mesmo eixo as duas linhas achatavam no chão
//   Tempo     — tempo médio até a execução, com a linha do prazo
//   No prazo  — % dos executados em até 5 dias (escala fixa 0–100%)
import { GraficoTempo, LegendaTempo } from '@/componentes/graficos/GraficoTempo'
import { Card, CabecalhoCard } from '@/componentes/ui/Card'
import { MINIMO_BLOCO, type Evolucao } from '@/calculos/evolucao'
import { PRAZO_DIAS } from '@/config'
import { decimal, numero } from '@/lib/formato'
import { desdeProvisorio } from '@/componentes/graficos/MiniLinha'
import { useFiltros } from '@/filtros/useFiltros'

const POR = { dia: 'Por dia', semana: 'Em blocos de 7 dias', mes: 'Por mês' } as const

const COR_ENTRARAM = 'var(--c-s1)'
const COR_EXECUTADOS = 'var(--c-s2)'
const COR_FILA = 'var(--c-ink-3)'
const COR_QUALIDADE = 'var(--c-s1)'

function Saldo({ v }: { v: number }) {
  if (v === 0) return <p className="text-ink-2">Fila igual no bloco</p>
  return (
    <p className={v > 0 ? 'text-atraso-texto' : 'text-ok-texto'}>
      {v > 0 ? '▲' : '▼'} fila {v > 0 ? 'cresceu' : 'diminuiu'} <span className="numeros font-medium">{numero(Math.abs(v))}</span> no bloco
    </p>
  )
}

export function Fluxo({ e }: { e: Evolucao }) {
  const { blocos, pontos, total, passo } = e
  return (
    <Card aria-labelledby="titulo-fluxo">
      <CabecalhoCard
        id="titulo-fluxo"
        titulo="Entraram, foram executados e ficaram na fila"
        subtitulo={`${POR[passo]}. Laranja acima do azul: a fila diminui.`}
      />
      <div className="px-5 pt-3 pb-4">
        <LegendaTempo
          className="mb-2"
          itens={[{ nome: 'Na fila no fim', cor: COR_FILA, valor: numero(total.filaFim), area: true }]}
        />
        <GraficoTempo
          altura={130}
          intervalos={blocos}
          series={[{ id: 'fila', nome: 'Na fila no fim', cor: COR_FILA, valores: pontos.map((p) => p.fila), estilo: 'area' }]}
          descricao={`Fila no fim de cada bloco, ${POR[passo].toLowerCase()}`}
        />
        <LegendaTempo
          className="mt-5 mb-2 border-t border-line pt-4"
          itens={[
            { nome: 'Entraram', cor: COR_ENTRARAM, valor: numero(total.entraram) },
            { nome: 'Executados', cor: COR_EXECUTADOS, valor: numero(total.executados) },
          ]}
        />
        <GraficoTempo
          altura={220}
          intervalos={blocos}
          series={[
            { id: 'entraram', nome: 'Entraram', cor: COR_ENTRARAM, valores: pontos.map((p) => p.entraram) },
            { id: 'executados', nome: 'Executados', cor: COR_EXECUTADOS, valores: pontos.map((p) => p.executados) },
          ]}
          extra={(i) => <Saldo v={pontos[i].entraram - pontos[i].executados} />}
          descricao={`Entraram e executados, ${POR[passo].toLowerCase()}`}
        />
      </div>
    </Card>
  )
}

/** Contando pela saída: o que muda no texto e na dica (os meses recentes ainda têm muita coisa em aberto) */
function useCoorte(e: Evolucao) {
  const porSaida = useFiltros().filtros.contarPor === 'saida'
  const provisorioDesde = porSaida ? desdeProvisorio(e.pontos.map((p) => p.provisorio)) : undefined
  const abertos = (i: number) =>
    porSaida && e.pontos[i].abertos > 0 ? (
      <p className="numeros text-ink-3">
        {numero(e.pontos[i].abertos)} dos que saíram ainda em aberto
        {e.pontos[i].provisorio && ' — vai mudar'}
      </p>
    ) : null
  return { porSaida, provisorioDesde, abertos }
}

export function Tempo({ e }: { e: Evolucao }) {
  const { blocos, pontos, passo } = e
  const { porSaida, provisorioDesde, abertos } = useCoorte(e)
  return (
    <Card aria-labelledby="titulo-tempo">
      <CabecalhoCard
        id="titulo-tempo"
        titulo="Tempo médio até a execução"
        subtitulo={
          porSaida
            ? `${POR[passo]} em que saíram para a rua, em dias. Tracejado: muitos ainda em aberto — a média vai subir.`
            : `${POR[passo]}, em dias, pela data de execução.`
        }
      />
      <div className="px-5 pt-3 pb-4">
        <GraficoTempo
          intervalos={blocos}
          series={[{ id: 'tempo', nome: 'Tempo médio', cor: COR_QUALIDADE, valores: pontos.map((p) => p.tempoMedio) }]}
          formatar={(v) => decimal(v).replace(',0', '')}
          referencia={{ valor: PRAZO_DIAS, rotulo: `prazo · ${PRAZO_DIAS} dias` }}
          provisorioDesde={provisorioDesde}
          extra={(i) => (
            <>
              <p className="numeros text-ink-2">{numero(pontos[i].executados)} executados</p>
              {abertos(i)}
            </>
          )}
          descricao={`Tempo médio até a execução, ${POR[passo].toLowerCase()}`}
        />
        <p className="mt-2 text-[11px] text-ink-3">Bloco com menos de {MINIMO_BLOCO} executados fica sem ponto.</p>
      </div>
    </Card>
  )
}

export function NoPrazo({ e }: { e: Evolucao }) {
  const { blocos, pontos, passo } = e
  const { porSaida, abertos } = useCoorte(e)
  return (
    <Card aria-labelledby="titulo-noprazo">
      <CabecalhoCard
        id="titulo-noprazo"
        titulo="Executados no prazo"
        subtitulo={
          porSaida
            ? `${POR[passo]} em que saíram: executados em até ${PRAZO_DIAS} dias, contando como fora os em aberto que já passaram do prazo.`
            : `${POR[passo]}: parte dos executados em até ${PRAZO_DIAS} dias.`
        }
      />
      <div className="px-5 pt-3 pb-4">
        <GraficoTempo
          intervalos={blocos}
          series={[{ id: 'prazo', nome: 'No prazo', cor: COR_QUALIDADE, valores: pontos.map((p) => p.pctNoPrazo) }]}
          formatar={(v) => `${Math.round(v)}%`}
          marcasFixas={[0, 25, 50, 75, 100]}
          extra={(i) => (
            <>
              <p className="numeros text-ink-2">{numero(pontos[i].executados)} executados</p>
              {abertos(i)}
            </>
          )}
          descricao={`Parte dos executados no prazo, ${POR[passo].toLowerCase()}`}
        />
        <p className="mt-2 text-[11px] text-ink-3">Bloco com menos de {MINIMO_BLOCO} executados fica sem ponto.</p>
      </div>
    </Card>
  )
}
