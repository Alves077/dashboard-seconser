// Perfil de um vereador: o que pediu (no período e mês a mês), indicações legislativas, tempo até a
// execução, onde (região → bairros), de que tipo, e o que está em aberto hoje (cada um abre a Ficha).
// Sem % no prazo e sem comparação com outros vereadores (calculos/vereadores.ts).
import { clsx } from 'clsx'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { ArrowLeft, ChevronRight, Landmark, Map as IconeMapa } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { EstadoVazio } from '@/componentes/estados/Estados'
import { GraficoTempo } from '@/componentes/graficos/GraficoTempo'
import { estiloBotao } from '@/componentes/ui/Botao'
import { Card, CabecalhoCard } from '@/componentes/ui/Card'
import { FotoVereador } from '@/componentes/ui/FotoVereador'
import { SeloRisco, SeloSituacao } from '@/componentes/ui/SeloSituacao'
import { ehIndicacao, type ContaNome, type PerfilVereador } from '@/calculos/vereadores'
import { CATEGORIA_RISCO, SEM_VEREADOR, situacao } from '@/dados/regras'
import { useFiltros } from '@/filtros/useFiltros'
import { corRegiao } from '@/lib/cores'
import { chaveMes, formatarDia, rotuloMes, rotuloMesLongo } from '@/lib/datas'
import { decimal, dias, enxuto, numero, pct, plural } from '@/lib/formato'
import { direcaoDaTroca, useDestino, useFicha, useHoje } from '@/lib/ganchos'
import { gavetaCartao, gavetaLista } from '@/lib/gaveta'
import { LinhaBarra, LISTA_BARRAS } from '@/paginas/panorama/Quebras'
import { MarcadorChave } from '@/componentes/ui/MarcadorChave'

/** Escala só com inteiros (contagem de pedidos: "0,5 pedido" não existe) */
function marcasInteiras(max: number): number[] | undefined {
  if (max >= 8) return undefined // a escala automática já sai em números redondos
  const topo = Math.max(2, max + (max % 2))
  const passo = topo <= 4 ? 1 : 2
  return Array.from({ length: topo / passo + 1 }, (_, i) => i * passo)
}

function Numero({
  rotulo,
  valor,
  sufixo,
  nota,
  className,
}: {
  rotulo: string
  valor: string
  sufixo?: string
  nota: string
  className?: string
}) {
  return (
    <div className={clsx('min-w-0 bg-card px-4 pt-4 pb-3 sm:px-5', className)}>
      <h3 className="text-[10.5px] leading-tight font-medium tracking-[0.4px] text-ink-3 uppercase sm:text-[11px]">{rotulo}</h3>
      <p className="numeros mt-1.5 text-[26px] leading-none font-light tracking-[-0.5px] text-ink sm:text-[30px]">
        {valor}
        {sufixo && <span className="ml-1 text-sm font-normal tracking-normal text-ink-2">{sufixo}</span>}
      </p>
      <p className="mt-2 text-[11px] leading-snug text-ink-2 sm:text-xs">{nota}</p>
    </div>
  )
}

/** Onde: regiões primeiro; tocar numa região abre os bairros dela (como no Panorama e no Prazo) */
function Lugares({ p }: { p: PerfilVereador }) {
  const { filtros, mudar } = useFiltros()
  if (filtros.regiao === null)
    return (
      <Contagem
        titulo="Regiões"
        subtitulo="Pedidos do período. Toque numa região para ver os bairros."
        linhas={p.regioes}
        total={p.pedidos}
        ativo={null}
        aoTocar={(r) => {
          direcaoDaTroca('gaveta-entra', ['lugares'])
          mudar({ regiao: r })
        }}
        gaveta="lugares"
        ponto={corRegiao}
      />
    )
  return (
    <Contagem
      gaveta="lugares"
      titulo={`Bairros · ${filtros.regiao}`}
      subtitulo="Pedidos do período. Toque para filtrar."
      linhas={p.bairros}
      total={p.pedidos}
      ativo={filtros.bairro}
      aoTocar={(b) => mudar({ bairro: filtros.bairro === b ? null : b })}
      acao={
        <button
          type="button"
          onClick={() => {
            direcaoDaTroca('gaveta-volta', ['lugares'])
            mudar({ regiao: null })
          }}
          className="pressionavel flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-acao hover:bg-realce"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Regiões
        </button>
      }
    />
  )
}

/** Bairros ou categorias dos pedidos do período: tocar filtra (como no Panorama) */
function Contagem({
  titulo,
  subtitulo = 'Pedidos do período. Toque para filtrar.',
  linhas,
  total,
  ativo,
  aoTocar,
  acao,
  ponto,
  gaveta,
}: {
  titulo: string
  subtitulo?: string
  linhas: ContaNome[]
  total: number
  ativo: string | null
  aoTocar: (nome: string) => void
  acao?: ReactNode
  /** pontinho de cor antes do nome (ex.: cor da região) */
  ponto?: (nome: string) => string
  /** card com vai-e-volta (região → bairros): nome da transição (lib/gaveta.ts) */
  gaveta?: string
}) {
  const [todos, setTodos] = useState(false)
  const visiveis = todos ? linhas : linhas.slice(0, 8)
  const max = Math.max(1, ...visiveis.map((l) => l.n))
  return (
    <Card className="flex flex-col" style={gaveta ? gavetaCartao(gaveta) : undefined}>
      <CabecalhoCard titulo={titulo} subtitulo={subtitulo} acao={acao} />
      <div className="flex flex-1 flex-col px-3 pt-2 pb-3" {...(gaveta ? gavetaLista(gaveta) : {})}>
        {linhas.length === 0 ? (
          <EstadoVazio titulo="Nada no período" texto="Nenhum pedido com esses filtros neste período." altura="min-h-32" />
        ) : (
          <>
            <ol className={LISTA_BARRAS}>
              {visiveis.map((l) => (
                <LinhaBarra
                  key={l.nome}
                  rotulo={l.nome}
                  prefixo={ponto ? <span aria-hidden className={clsx('size-2.5 shrink-0 rounded-full', ponto(l.nome))} /> : undefined}
                  valor={l.n}
                  maximo={max}
                  complemento={pct(l.n, total)}
                  ativo={ativo === l.nome}
                  aoTocar={() => aoTocar(l.nome)}
                  compacta
                />
              ))}
            </ol>
            {linhas.length > 8 && (
              <button
                type="button"
                onClick={() => setTodos((v) => !v)}
                className="mt-auto h-10 w-full rounded-md pt-1 text-[13px] font-medium text-acao tocavel hover:bg-realce"
              >
                {todos ? 'Mostrar só os 8 primeiros' : `Mostrar todos (${numero(linhas.length)})`}
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

/** Pedido formal da Câmara: destaque discreto (cor de ação, não de alerta) */
function SeloIndicacao({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-acao-suave px-2 text-[11px] font-medium text-acao-press', className)}>
      <Landmark aria-hidden className="size-3" />
      Indicação legislativa
    </span>
  )
}

function EmAberto({ p }: { p: PerfilVereador }) {
  const { abrir } = useFicha()
  const hoje = useHoje()
  const [todos, setTodos] = useState(false)
  const [soIndicacoes, setSoIndicacoes] = useState(false)
  const base = soIndicacoes ? p.abertos.filter((it) => ehIndicacao(it.servico)) : p.abertos
  const lista = todos ? base : base.slice(0, 10)
  // só vale a opção quando há dos dois tipos
  const temOpcao = p.indicacoesAbertas > 0 && p.indicacoesAbertas < p.emAberto
  return (
    <Card aria-labelledby="titulo-abertos">
      <CabecalhoCard
        id="titulo-abertos"
        titulo={`Em aberto hoje · ${numero(p.emAberto)}`}
        subtitulo="Esperando há mais tempo primeiro. Não depende do período. Toque para ver a ficha."
        acao={
          temOpcao && (
            <ToggleGroup
              aria-label="Quais pedidos em aberto"
              value={[soIndicacoes ? 'ind' : 'todos']}
              onValueChange={(v) => v[0] && setSoIndicacoes(v[0] === 'ind')}
              className="relative flex h-9 items-center rounded-full border border-line bg-page p-0.5"
            >
              <MarcadorChave className="bg-card shadow-1" />
              {[
                { v: 'todos', t: `Todos (${numero(p.emAberto)})` },
                { v: 'ind', t: `Indicações (${numero(p.indicacoesAbertas)})` },
              ].map((o) => (
                <Toggle
                  key={o.v}
                  value={o.v}
                  className="opcao-chave h-full rounded-full px-3 text-xs text-ink-2 data-pressed:font-medium data-pressed:text-ink"
                >
                  {o.t}
                </Toggle>
              ))}
            </ToggleGroup>
          )
        }
      />
      {p.abertos.length === 0 ? (
        <EstadoVazio titulo="Nenhum pedido em aberto" texto="Todos os pedidos com esses filtros já foram executados." altura="min-h-32" />
      ) : (
        <>
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {lista.map(({ servico, saida, dias: d }) => (
              <li key={servico.chave}>
                <button
                  type="button"
                  onClick={() => abrir(servico.chave)}
                  className="group flex min-h-14 w-full items-center gap-3 px-5 py-2.5 text-left tocavel hover:bg-realce sm:gap-4"
                >
                  <span className="numeros w-14 shrink-0 text-[13px] font-medium text-ink">{servico.idColab}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink">{servico.categoria ?? 'Sem categoria'}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {servico.bairro} · saiu em {formatarDia(saida.dataSaida)}
                    </span>
                    {/* celular: selos embaixo, para o nome da categoria caber (como no Panorama) */}
                    <span className="mt-1 flex flex-wrap gap-1.5 sm:hidden">
                      <SeloSituacao situacao={situacao(saida, hoje)} texto={dias(d)} />
                      {ehIndicacao(servico) && <SeloIndicacao />}
                    </span>
                  </span>
                  {ehIndicacao(servico) && <SeloIndicacao className="max-sm:hidden" />}
                  {servico.categoria === CATEGORIA_RISCO && <SeloRisco className="max-sm:hidden" />}
                  <SeloSituacao situacao={situacao(saida, hoje)} texto={dias(d)} className="max-sm:hidden" />
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                </button>
              </li>
            ))}
          </ul>
          {base.length > 10 && (
            <button
              type="button"
              onClick={() => setTodos((v) => !v)}
              className="h-11 w-full border-t border-line text-[13px] font-medium text-acao tocavel hover:bg-realce"
            >
              {todos ? 'Mostrar só os 10 primeiros' : `Mostrar todos (${numero(base.length)})`}
            </button>
          )}
        </>
      )}
    </Card>
  )
}

export function Perfil({ p, quem, aoVoltar }: { p: PerfilVereador; quem: string; aoVoltar: () => void }) {
  const { filtros, mudar } = useFiltros()
  const destino = useDestino()
  const semNome = quem === SEM_VEREADOR
  return (
    <div className="flex flex-col gap-4">
      <div>
        <button
          type="button"
          onClick={aoVoltar}
          className="pressionavel -ml-3 flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-acao hover:bg-realce"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Vereadores
        </button>
      </div>

      <Card className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
        <FotoVereador vereador={semNome ? null : p.vereador} className="size-16" />
        <div className="min-w-[min(100%,14rem)] flex-1">
          <h2 className="text-xl font-normal tracking-[-0.3px] text-ink">{quem}</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {semNome
              ? 'Indicações da Câmara cujo autor não foi encontrado'
              : p.total === 0
                ? 'Nenhum pedido com esses filtros'
                : `${plural(p.total, 'pedido', 'pedidos')} desde ${p.primeiroPedido !== null ? rotuloMes(chaveMes(p.primeiroPedido)) : 'o início'}`}
          </p>
        </div>
        <Link to={destino('/mapa')} className={clsx(estiloBotao({ variante: 'secundario', tamanho: 'compacto' }), 'max-sm:w-full')}>
          <IconeMapa aria-hidden className="size-4" />
          Ver no mapa
        </Link>
      </Card>

      {/* linhas de 1px entre os números: o fundo da grade aparece pelos vãos */}
      <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-5">
        <Numero rotulo="Pedidos no período" valor={numero(p.pedidos)} nota={p.intervalo.rotulo} />
        <Numero
          rotulo="Indicações legislativas"
          valor={numero(p.indicacoes)}
          nota={p.pedidos ? `${pct(p.indicacoes, p.pedidos)} dos pedidos do período` : 'dos pedidos do período'}
        />
        <Numero
          rotulo="Já executados"
          valor={numero(p.executados)}
          nota={p.pedidos ? `${pct(p.executados, p.pedidos)} dos pedidos do período` : 'dos pedidos do período'}
        />
        <Numero
          rotulo="Tempo até a execução"
          valor={p.tempoMedio === null ? '—' : decimal(p.tempoMedio)}
          sufixo={p.tempoMedio === null ? undefined : 'dias'}
          nota={
            p.tempoMediano === null
              ? 'nada executado no período'
              : `média · mediana ${enxuto(p.tempoMediano)} ${p.tempoMediano === 1 ? 'dia' : 'dias'}${p.tempoProvisorio ? ' · provisório (muitos ainda em aberto)' : ''}`
          }
        />
        <Numero
          rotulo="Em aberto agora"
          valor={numero(p.emAberto)}
          nota={
            p.indicacoesAbertas > 0
              ? `${plural(p.indicacoesAbertas, 'indicação legislativa', 'indicações legislativas')} · não depende do período`
              : 'não depende do período'
          }
          className="col-span-2 sm:col-span-1"
        />
      </Card>

      <Card aria-labelledby="titulo-por-mes">
        <CabecalhoCard
          id="titulo-por-mes"
          titulo="Pedidos por mês"
          subtitulo="Mês em que o pedido foi para a rua pela primeira vez, desde o começo da base. Não depende do período."
        />
        <div className="px-3 pt-3 pb-4 sm:px-5">
          <GraficoTempo
            altura={200}
            intervalos={p.meses.map((m) => ({ rotulo: rotuloMes(m.mes), nome: rotuloMesLongo(m.mes), parcial: m.parcial }))}
            series={[{ id: 'pedidos', nome: 'Pedidos', cor: 'var(--c-s1)', valores: p.meses.map((m) => m.n) }]}
            marcasFixas={marcasInteiras(Math.max(0, ...p.meses.map((m) => m.n)))}
            descricao={`Pedidos por mês de ${quem}, desde ${p.meses.length ? rotuloMesLongo(p.meses[0].mes) : 'o início'}`}
          />
        </div>
      </Card>

      {/* cada card na sua altura (o de categorias costuma ser bem mais curto que o de bairros) */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Lugares p={p} />
        <Contagem
          titulo="O que pediu"
          linhas={p.categorias}
          total={p.pedidos}
          ativo={filtros.categoria}
          aoTocar={(c) => mudar({ categoria: filtros.categoria === c ? null : c })}
        />
      </div>

      <EmAberto p={p} />
    </div>
  )
}

