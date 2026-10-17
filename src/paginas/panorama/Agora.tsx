// AGORA — a fila de hoje. Não depende do período (dito na tela, não só no código).
import { clsx } from 'clsx'
import { AlarmClock, ArrowLeft, ChevronRight, X, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '@/componentes/ui/Card'
import { SeloRisco, SeloSituacao } from '@/componentes/ui/SeloSituacao'
import { FAIXAS_ESPERA, type calcularAgora, type ItemFila } from '@/calculos/panorama'
import { CATEGORIA_RISCO, situacao } from '@/dados/regras'
import { ehPeriodoPadrao } from '@/filtros/filtros'
import { useFiltros } from '@/filtros/useFiltros'
import { formatarDia, type Dia } from '@/lib/datas'
import { corRegiao } from '@/lib/cores'
import { compararTexto, dias, numero, pct, plural } from '@/lib/formato'
import { direcaoDaTroca, useFicha } from '@/lib/ganchos'
import { gavetaCartao, gavetaLista, trocarComTransicao } from '@/lib/gaveta'
import { LinhaBarra, LISTA_BARRAS } from './Quebras'

const COR_ESPERA = ['bg-o1', 'bg-o2', 'bg-o3', 'bg-o4', 'bg-o5']

const faixaDe = (d: number) => FAIXAS_ESPERA.findIndex((f) => d <= f.max)

/**
 * Barra única dividida pelo tempo de espera; os números ficam na legenda (sempre legíveis).
 * Cada faixa (pedaço da barra ou item da legenda) é tocável: mostra só ela na lista "Esperando…" logo
 * abaixo — recorte deste bloco, não filtro do site. A escolhida fica forte e as outras esmaecem.
 */
function BarraEspera({
  espera,
  total,
  escolhida,
  aoEscolher,
}: {
  espera: number[]
  total: number
  escolhida: number | null
  aoEscolher: (i: number | null) => void
}) {
  const alternar = (i: number) => aoEscolher(escolhida === i ? null : i)
  const apagada = (i: number) => escolhida !== null && escolhida !== i
  return (
    <div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded">
        {espera.map((n, i) =>
          n > 0 ? (
            <button
              key={FAIXAS_ESPERA[i].id}
              type="button"
              onClick={() => alternar(i)}
              aria-pressed={escolhida === i}
              aria-label={`${FAIXAS_ESPERA[i].rotulo}: ${numero(n)} (${pct(n, total)})`}
              title={`${FAIXAS_ESPERA[i].rotulo}: ${numero(n)} (${pct(n, total)}) — toque para ver só estes`}
              className={clsx(
                'h-full cursor-pointer transition-[opacity,filter] duration-150 ease-out hover:brightness-110',
                COR_ESPERA[i],
                apagada(i) && 'opacity-30',
              )}
              style={{ flexGrow: n }}
            />
          ) : null,
        )}
        {total === 0 && <span className="h-full flex-1 bg-line" />}
      </div>
      {/* celular: 3 à esquerda e 2 à direita, lendo de cima para baixo (sem um item sozinho na última linha) */}
      <ul className="mt-3 grid grid-flow-col grid-cols-2 grid-rows-3 gap-x-4 gap-y-1 sm:grid-flow-row sm:grid-cols-5 sm:grid-rows-1">
        {FAIXAS_ESPERA.map((f, i) => (
          <li key={f.id} className="min-w-0">
            <button
              type="button"
              onClick={() => alternar(i)}
              disabled={espera[i] === 0}
              aria-pressed={escolhida === i}
              className={clsx(
                // destaque do tamanho da coluna, conteúdo centralizado nele (sem sobra só de um lado)
                // número sempre embaixo: com o rótulo em 2 linhas (tela estreita/zoom) os números continuam alinhados
                'pressionavel flex h-full w-full flex-col justify-between rounded-md px-2 py-1 text-center transition-opacity duration-150 disabled:cursor-default',
                escolhida === i ? 'bg-acao-suave' : 'enabled:hover:bg-realce',
                apagada(i) && 'opacity-50',
              )}
            >
              {/* o rótulo quebra linha em vez de cortar ("Mais de ..." em tela estreita ou com zoom) */}
              <span className="flex items-center justify-center gap-1.5 text-xs leading-tight text-ink-2">
                <span aria-hidden className={clsx('size-2.5 shrink-0 rounded-sm', COR_ESPERA[i])} />
                <span>{f.rotulo}</span>
              </span>
              <span className="numeros mt-0.5 block text-[15px] font-medium text-ink">
                {numero(espera[i])}
                <span className="ml-1.5 text-xs font-normal text-ink-3">{pct(espera[i], total)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * "Onde estão" os da faixa escolhida: regiões primeiro; tocar numa região mostra os bairros dela (só aqui).
 * Os bairros são só leitura (decisão do usuário, 14/10: filtrar dali embaralhava os filtros e não precisa).
 * Com uma região já filtrada no site, vai direto aos bairros.
 */
function OndeEstao({ itens, rotuloFaixa }: { itens: ItemFila[]; rotuloFaixa: string }) {
  const { filtros } = useFiltros()
  const [regiaoLocal, setRegiaoLocal] = useState<string | null>(null)
  const [todos, setTodos] = useState(false)
  const regiao = filtros.regiao ?? regiaoLocal
  const contagem = useMemo(() => {
    const m = new Map<string, number>()
    for (const { servico } of itens) {
      if (regiao && servico.regiao !== regiao) continue
      const k = regiao ? servico.bairro : servico.regiao
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return [...m].map(([nome, n]) => ({ nome, n })).sort((a, b) => b.n - a.n || compararTexto(a.nome, b.nome))
  }, [itens, regiao])
  const total = contagem.reduce((t, l) => t + l.n, 0)
  const visiveis = regiao && !todos ? contagem.slice(0, 8) : contagem
  const max = Math.max(1, ...visiveis.map((l) => l.n))
  return (
    <div className="px-5 pt-3 pb-4" style={gavetaCartao('onde')}>
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <h3 className="text-[13px] font-medium text-ink">
          Onde estão{regiao ? ` · ${regiao}` : ''}{' '}
          <span className="font-normal text-ink-3">({rotuloFaixa.toLowerCase()})</span>
        </h3>
        {regiaoLocal && !filtros.regiao && (
          <button
            type="button"
            onClick={() =>
              trocarComTransicao('gaveta-volta', ['onde'], () => {
                setRegiaoLocal(null)
                setTodos(false)
              })
            }
            className="pressionavel -mr-2 flex h-8 items-center gap-1 rounded-full px-2 text-xs font-medium text-acao hover:bg-realce"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            Regiões
          </button>
        )}
      </div>
      <p className="mt-0.5 mb-2 text-xs text-ink-3">
        {regiao ? 'Bairros da região com mais pedidos nesta faixa.' : 'Toque numa região para ver os bairros.'}
      </p>
      <ol className={LISTA_BARRAS} {...gavetaLista('onde')}>
        {visiveis.map((l) => (
          <LinhaBarra
            key={l.nome}
            rotulo={l.nome}
            prefixo={regiao ? undefined : <span aria-hidden className={clsx('size-2.5 shrink-0 rounded-full', corRegiao(l.nome))} />}
            valor={l.n}
            maximo={max}
            complemento={pct(l.n, total)}
            ativo={false}
            aoTocar={regiao ? undefined : () => trocarComTransicao('gaveta-entra', ['onde'], () => setRegiaoLocal(l.nome))}
            compacta
          />
        ))}
      </ol>
      {regiao && contagem.length > 8 && (
        <button
          type="button"
          onClick={() => setTodos((v) => !v)}
          className="mt-1 h-10 w-full rounded-md text-[13px] font-medium text-acao hover:bg-realce"
        >
          {todos ? 'Mostrar só os 8 primeiros' : `Mostrar todos (${numero(contagem.length)})`}
        </button>
      )}
    </div>
  )
}

export function Agora({ agora, hoje }: { agora: ReturnType<typeof calcularAgora>; hoje: Dia }) {
  const { filtros, mudar } = useFiltros()
  const { abrir } = useFicha()
  const [mais, setMais] = useState(false)
  const [faixa, setFaixa] = useState<number | null>(null)
  const daFaixa = faixa === null ? agora.itens : agora.itens.filter((it) => faixaDe(it.dias) === faixa)
  const lista = daFaixa.slice(0, mais ? 15 : 5)
  const soRisco = filtros.categoria === CATEGORIA_RISCO
  // filtros ligados que este bloco não usa — dito na tela para ninguém achar que o filtro falhou
  const ignorados = ehPeriodoPadrao(filtros.periodo) ? [] : ['O período']

  return (
    <Card aria-labelledby="titulo-agora">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-4">
        <h2 id="titulo-agora" className="text-[11px] font-medium tracking-[0.4px] text-ink-3 uppercase">
          Agora · fila de hoje ({formatarDia(hoje)})
        </h2>
        {ignorados.length ? (
          <p className="rounded-full bg-realce-forte px-2.5 py-1 text-xs text-ink-2">
            {ignorados.join(' e ')} não se aplica aqui: é a fila de hoje, de qualquer mês.
          </p>
        ) : (
          <p className="text-xs text-ink-3">Tudo o que está aberto, de qualquer mês — não muda com o período.</p>
        )}
      </div>

      <div className="grid gap-6 px-5 pt-3 pb-5 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:gap-10">
        <div>
          <p className="numeros text-[44px] leading-none font-light tracking-[-1px] text-ink">{numero(agora.total)}</p>
          <p className="mt-1.5 text-[13px] text-ink-2">{agora.total === 1 ? 'serviço aguardando' : 'serviços aguardando execução'}</p>
          <ul className="mt-4 flex flex-col gap-2 text-[13px]">
            <li className="flex items-center gap-2 text-atraso-texto">
              <AlarmClock aria-hidden className="size-4 shrink-0" />
              <span className="numeros font-medium">{numero(agora.atraso)}</span>
              <span className="text-ink-2">em atraso · {pct(agora.atraso, agora.total)}</span>
            </li>
            <li>
              {soRisco ? (
                <button
                  type="button"
                  onClick={() => {
                    direcaoDaTroca('volta')
                    mudar({ categoria: null })
                  }}
                  className="pressionavel -mx-2 flex min-h-9 items-center gap-2 rounded-md bg-risco/12 px-2 text-left text-risco-texto hover:bg-risco/20"
                >
                  <ArrowLeft aria-hidden className="size-4 shrink-0" />
                  <span>
                    Só risco elétrico · <span className="underline underline-offset-4">voltar para todas as categorias</span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    direcaoDaTroca('entra')
                    mudar({ categoria: CATEGORIA_RISCO })
                  }}
                  disabled={agora.risco === 0}
                  className="pressionavel -mx-2 flex min-h-9 items-center gap-2 rounded-md px-2 text-risco-texto hover:bg-risco/10 disabled:opacity-60"
                >
                  <Zap aria-hidden className="size-4 shrink-0" />
                  <span className="numeros font-medium">{numero(agora.risco)}</span>
                  <span className="text-ink-2 underline decoration-line underline-offset-4">com risco elétrico</span>
                </button>
              )}
            </li>
          </ul>
        </div>
        <div className="min-w-0">
          <h3 className="mb-3 text-[13px] font-medium text-ink">Há quanto tempo esperam</h3>
          <BarraEspera
            espera={agora.espera}
            total={agora.total}
            escolhida={faixa}
            aoEscolher={(i) => {
              setFaixa(i)
              setMais(false)
            }}
          />
          <p className="mt-3 text-center text-xs text-ink-3">Contado da última saída para a rua até hoje. Prazo: 5 dias corridos.</p>
        </div>
      </div>

      {lista.length > 0 && (
        <div className="border-t border-line lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {faixa !== null && (
            <div className="border-b border-line lg:border-r lg:border-b-0">
              <OndeEstao key={faixa} itens={daFaixa} rotuloFaixa={FAIXAS_ESPERA[faixa].rotulo} />
            </div>
          )}
          <div className={faixa === null ? 'lg:col-span-2' : 'min-w-0'}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 px-5 pt-3 pb-2">
              <h3 className="text-[13px] font-medium text-ink">
                {faixa === null ? (
                  'Esperando há mais tempo'
                ) : (
                  <>
                    Esperando {FAIXAS_ESPERA[faixa].rotulo.toLowerCase()} ·{' '}
                    <span className="numeros font-normal text-ink-2">{numero(daFaixa.length)}</span>
                  </>
                )}
              </h3>
              {faixa !== null && (
                <button
                  type="button"
                  onClick={() => setFaixa(null)}
                  className="pressionavel -mr-2 flex h-8 items-center gap-1 rounded-full px-2 text-xs font-medium text-acao hover:bg-realce"
                >
                  <X aria-hidden className="size-3.5" />
                  Todas as faixas
                </button>
              )}
            </div>
            {/* divisória entre linhas (antes só o hover separava) */}
            <ul className="divide-y divide-line border-t border-line">
              {lista.map(({ servico, saida, dias: d }) => (
                <li key={servico.chave}>
                  <button
                    type="button"
                    onClick={() => abrir(servico.chave)}
                    className="group flex min-h-14 w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-realce sm:gap-4"
                  >
                    <span className="numeros w-14 shrink-0 text-[13px] font-medium text-ink">{servico.idColab}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">{servico.categoria ?? 'Sem categoria'}</span>
                      {/* sem espaço, a data desce para a linha de baixo — nunca é cortada */}
                      <span className="flex flex-wrap gap-x-1 text-xs text-ink-3">
                        <span className="max-w-full truncate">{servico.bairro} ·</span>
                        <span className="shrink-0">saiu em {formatarDia(saida.dataSaida)}</span>
                      </span>
                      {/* celular: selo embaixo, para o nome da categoria caber */}
                      <SeloSituacao situacao={situacao(saida, hoje)} texto={dias(d)} className="mt-1 sm:hidden" />
                    </span>
                    {servico.categoria === CATEGORIA_RISCO && <SeloRisco className="max-sm:hidden" />}
                    <SeloSituacao situacao={situacao(saida, hoje)} texto={dias(d)} className="max-sm:hidden" />
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </button>
                </li>
              ))}
            </ul>
            {daFaixa.length > 5 && (
              <button
                type="button"
                onClick={() => setMais((v) => !v)}
                className="h-11 w-full border-t border-line text-[13px] font-medium text-acao hover:bg-realce"
              >
                {mais ? 'Mostrar menos' : `Mostrar mais (${plural(Math.min(daFaixa.length, 15) - 5, 'outro', 'outros')})`}
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
