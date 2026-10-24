// Onde, o quê e quem: região, categoria, bairro e origem. Toda linha é um filtro: tocar aplica
// (e o mapa vai reenquadrar quando existir); tocar de novo tira. Barras em uma cor só (série única).
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { clsx } from 'clsx'
import { ArrowLeft, Zap } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { EstadoVazio } from '@/componentes/estados/Estados'
import { FotoVereador } from '@/componentes/ui/FotoVereador'
import { Card, CabecalhoCard } from '@/componentes/ui/Card'
import type { LinhaQuebra } from '@/calculos/panorama'
import { useBase } from '@/dados/consultas'
import { CATEGORIA_RISCO, SEM_VEREADOR } from '@/dados/regras'
import { useFiltros } from '@/filtros/useFiltros'
import { corRegiao } from '@/lib/cores'
import { compararTexto, decimal, numero, pct, pctCurto } from '@/lib/formato'
import { direcaoDaTroca } from '@/lib/ganchos'
import { gavetaCartao, gavetaLista } from '@/lib/gaveta'
import { MarcadorChave } from '@/componentes/ui/MarcadorChave'

/**
 * Colunas da lista de LinhaBarra (rótulo · barra · valor). Vão na <ul>/<ol>: as linhas usam `subgrid`, então a
 * coluna do valor tem a largura do MAIOR valor da lista e todas as barras terminam no mesmo ponto
 * (antes, "109 93,6% atr." encurtava só a barra da sua linha).
 */
export const LISTA_BARRAS =
  'grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_auto] gap-x-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto]'

/** Linha clicável com barra: rótulo · barra · valor · complemento. Sempre dentro de uma lista com LISTA_BARRAS. */
export function LinhaBarra({
  rotulo,
  apoio,
  valor,
  maximo,
  complemento,
  ativo,
  aoTocar,
  icone,
  corBarra = 'bg-s1',
  pontoApoio,
  compacta = false,
  textoValor,
  prefixo,
  parteAberta = 0,
}: {
  rotulo: string
  apoio?: string
  valor: number
  maximo: number
  complemento?: ReactNode
  ativo: boolean
  /** sem ação = linha só de leitura (não é botão) */
  aoTocar?: () => void
  icone?: ReactNode
  corBarra?: string
  /** pontinho de cor antes do texto de apoio (ex.: região do bairro) */
  pontoApoio?: string
  /** linha mais baixa com mouse; no toque continua com 44px */
  compacta?: boolean
  /** valor escrito, quando não é contagem (ex.: "4,2%") */
  textoValor?: string
  /** antes do nome, à esquerda (ex.: foto do vereador) */
  prefixo?: ReactNode
  /** quanto do valor ainda está em aberto: a ponta da barra fica âmbar */
  parteAberta?: number
}) {
  const Elemento = aoTocar ? 'button' : 'div'
  const largura = maximo > 0 ? Math.max((valor / maximo) * 100, valor > 0 ? 1.5 : 0) : 0
  return (
    <li className="col-span-3 grid grid-cols-subgrid">
      <Elemento
        {...(aoTocar ? { type: 'button' as const, onClick: aoTocar, 'aria-pressed': ativo } : {})}
        title={apoio ? `${rotulo} · ${apoio}` : rotulo}
        className={clsx(
          'col-span-3 grid grid-cols-subgrid items-center rounded-md px-2 text-left',
          compacta ? 'min-h-9 py-1 pointer-coarse:min-h-11' : 'min-h-11 py-1.5',
          ativo ? 'bg-acao-suave' : aoTocar && 'tocavel hover:bg-realce',
        )}
      >
        <span className={clsx('min-w-0', prefixo && 'flex items-center gap-2.5')}>
          {prefixo}
          <span className="min-w-0">
          {/* nome quebra em até 3 linhas em vez de cortar: associações e vereadores com o mesmo começo
              ("Associação de Moradores do…") só se distinguem no fim */}
          <span className={clsx('flex items-start gap-1 text-[13px] leading-snug', ativo ? 'font-medium text-ink' : 'text-ink')}>
            {icone && <span className="mt-0.5">{icone}</span>}
            <span className="line-clamp-3">{rotulo}</span>
          </span>
          {apoio && (
            // quebra em vez de cortar ("Praias da Baía · 43 no período" não cabe na coluna do celular)
            <span className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-3">
              {pontoApoio && <span aria-hidden className={clsx('mt-[5px] size-1.5 shrink-0 rounded-full', pontoApoio)} />}
              <span className="min-w-0">{apoio}</span>
            </span>
          )}
          </span>
        </span>
        <span aria-hidden className="h-2 w-full rounded-full bg-line/60">
          {parteAberta > 0 ? (
            // barra dividida: o que já voltou na cor da linha, o que segue em aberto em âmbar (2 px de folga entre as partes)
            <span className="flex h-full gap-[2px] overflow-hidden rounded-full" style={{ width: `${largura}%` }}>
              {valor > parteAberta && <span className={clsx('h-full', corBarra)} style={{ flexGrow: valor - parteAberta }} />}
              <span className="h-full bg-andamento" style={{ flexGrow: parteAberta }} />
            </span>
          ) : (
            <span className={clsx('block h-full rounded-full', corBarra)} style={{ width: `${largura}%` }} />
          )}
        </span>
        <span className="numeros min-w-16 text-right text-[13px] text-ink">
          {textoValor ?? numero(valor)}
          {/* celular: embaixo do número (do lado, a coluna ficava larga e a barra curta demais) */}
          {/* a pausa invisível separa os números para o leitor de tela (sem ela: "59" + "5 em aberto" = "595 em aberto") */}
          {complemento && <span className="sr-only">, </span>}
          {complemento && <span className="ml-1.5 text-xs text-ink-3 max-sm:ml-0 max-sm:block max-sm:text-[11px]">{complemento}</span>}
        </span>
      </Elemento>
    </li>
  )
}

const Vazio = () => <EstadoVazio titulo="Nada no período" texto="Nenhuma saída com esses filtros neste período." altura="min-h-40" />

// ── Regiões: tabela (poucas linhas, várias medidas) ─────────────────────────
// Mesmo comportamento das listas: a linha inteira é tocável, com o mesmo destaque.
export function Regioes({ linhas }: { linhas: LinhaQuebra[] }) {
  const { filtros, mudar } = useFiltros()
  const ordem = [...linhas].sort((a, b) => b.fila - a.fila || compararTexto(a.nome, b.nome))
  const maxFila = Math.max(1, ...ordem.map((l) => l.fila))
  const alternar = (nome: string) => mudar({ regiao: filtros.regiao === nome ? null : nome })
  return (
    <Card aria-labelledby="titulo-regioes" className="overflow-hidden">
      <CabecalhoCard id="titulo-regioes" titulo="Regiões" subtitulo="Fila de agora e desempenho no período. Toque numa região para filtrar." />
      {ordem.length === 0 ? (
        <div className="px-3 pb-3">
          <EstadoVazio titulo="Nada para mostrar" texto="Nenhum serviço em aberto nem saída no período com esses filtros." altura="min-h-40" />
        </div>
      ) : (
        <div className="mt-2 overflow-x-auto px-3 pb-3">
          <table className="w-full border-separate border-spacing-0 text-[13px]">
            <caption className="sr-only">Regiões: fila de agora, em atraso, saídas no período, no prazo e tempo médio</caption>
            <thead>
              <tr className="text-left text-[11px] tracking-[0.4px] text-ink-3 uppercase">
                <th scope="col" className="py-2 pr-2 pl-2 font-medium">Região</th>
                <th scope="col" className="px-2 py-2 font-medium">Fila agora</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Atraso</th>
                <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">Saídas</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">No prazo</th>
                <th scope="col" className="hidden py-2 pr-2 pl-2 text-right font-medium sm:table-cell">Tempo médio</th>
              </tr>
            </thead>
            <tbody className="numeros">
              {ordem.map((l) => {
                const ativo = filtros.regiao === l.nome
                const celula = clsx('py-2.5 first:rounded-l-md last:rounded-r-md', ativo ? 'bg-acao-suave' : 'group-hover:bg-realce')
                return (
                  <tr key={l.nome} onClick={() => alternar(l.nome)} className="group cursor-pointer">
                    <th scope="row" className={clsx(celula, 'pr-2 pl-2 text-left font-normal')}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          alternar(l.nome)
                        }}
                        aria-pressed={ativo}
                        className={clsx('flex min-h-6 items-center gap-2 text-left', ativo ? 'font-medium text-ink' : 'text-ink')}
                      >
                        <span aria-hidden className={clsx('size-2.5 shrink-0 rounded-full', corRegiao(l.nome))} />
                        {l.nome}
                      </button>
                    </th>
                    <td className={clsx(celula, 'px-2')}>
                      <span className="flex items-center gap-2">
                        <span aria-hidden className="h-2 w-16 rounded-full bg-line/60 sm:w-24">
                          <span className="block h-full rounded-full bg-s1" style={{ width: `${(l.fila / maxFila) * 100}%` }} />
                        </span>
                        {numero(l.fila)}
                      </span>
                    </td>
                    <td className={clsx(celula, 'px-2 text-right', l.atraso > 0 ? 'text-atraso-texto' : 'text-ink-3')}>{numero(l.atraso)}</td>
                    <td className={clsx(celula, 'hidden px-2 text-right text-ink sm:table-cell')}>{numero(l.saidas)}</td>
                    <td className={clsx(celula, 'px-2 text-right text-ink')}>{l.pctNoPrazo === null ? '—' : `${decimal(l.pctNoPrazo)}%`}</td>
                    <td className={clsx(celula, 'hidden pr-2 pl-2 text-right text-ink sm:table-cell')}>
                      {l.tempoMedio === null ? '—' : `${decimal(l.tempoMedio)} d`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Medida das listas (decisão do usuário, 17/10/2026) ──────────────────────
// Bairros, O que mais se pede e Quem pede mostram a MESMA coisa, escolhida numa chave só (SeletorMedida, na
// página). Antes cada bloco mostrava uma coisa. Três medidas (decisão do usuário, 17/10/2026):
//   periodo        → saídas no período (executados, contando pelo retorno); a barra separa em âmbar a parte que
//                    ainda está em aberto, e esse número vem em destaque ao lado
//   abertosPeriodo → só as saídas do período que seguem em aberto (some contando pelo retorno: lá tudo voltou)
//   fila           → a fila de hoje, de qualquer mês
// O "% atr." acompanha as duas medidas de em aberto; a linha pequena embaixo do nome dá o contexto.
export type Medida = 'periodo' | 'abertosPeriodo' | 'fila'

const valorDe = (l: LinhaQuebra, m: Medida) => (m === 'fila' ? l.fila : m === 'abertosPeriodo' ? l.abertosPeriodo : l.saidas)

/** à direita do número: quantos seguem em aberto (período) ou quanto já passou do prazo (em aberto) */
function complementoDe(l: LinhaQuebra, m: Medida): ReactNode {
  if (m === 'fila') return l.atraso > 0 ? `${pctCurto(l.atraso, l.fila)} atr.` : undefined
  if (m === 'abertosPeriodo') return l.atrasoPeriodo > 0 ? `${pctCurto(l.atrasoPeriodo, l.abertosPeriodo)} atr.` : undefined
  return l.abertosPeriodo > 0 ? <span className="font-medium text-andamento-texto">{numero(l.abertosPeriodo)} em aberto</span> : undefined
}

/** contexto na linha pequena embaixo do nome (curta: no bairro ela divide a linha com a região) */
// Regra (usuário, 17/10/2026): o número pequeno embaixo do nome tem que ser PARTE do número grande, ou dizer com
// todas as letras que é o total de onde ele saiu. "445 no período" embaixo de "513 na fila" parecia 445 dos 513 —
// e eram as saídas do período, outro universo. O mesmo com "17 na fila agora" embaixo de "59 saídas".
function apoioDe(l: LinhaQuebra, m: Medida): string | undefined {
  // na fila: quantos desses saíram no período (toda saída do período ainda aberta está na fila de hoje)
  if (m === 'fila')
    return l.abertosPeriodo > 0 ? `${numero(l.abertosPeriodo)} ${l.abertosPeriodo === 1 ? 'deles saiu' : 'deles saíram'} no período` : undefined
  // em aberto do período: o total de onde eles vêm, dito como tal
  if (m === 'abertosPeriodo') return `de ${numero(l.saidas)} que saíram no período`
  // saíram no período: a parte em aberto já está ao lado do número (âmbar); nada embaixo
  return undefined
}

/** parte âmbar da barra (só na medida "no período") */
const parteDe = (l: LinhaQuebra, m: Medida) => (m === 'periodo' ? l.abertosPeriodo : 0)

const juntar = (...partes: (string | undefined)[]) => partes.filter(Boolean).join(' · ') || undefined

const FilaZerada = () => <EstadoVazio titulo="Fila zerada" texto="Nenhum serviço em aberto com esses filtros." altura="min-h-40" />

/** Chave única das listas do Panorama */
export function SeletorMedida({ medida, aoMudar, porRetorno }: { medida: Medida; aoMudar: (m: Medida) => void; porRetorno: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-xs text-ink-2">Nas listas abaixo:</span>
      <ToggleGroup
        aria-label="O que as listas de bairros, categorias e origens mostram"
        value={[medida]}
        onValueChange={(v) => v[0] && aoMudar(v[0] as Medida)}
        // celular: os três dividem a largura e o texto quebra em duas linhas com respiro (antes "Saíram no período"
        // quebrava dentro de uma pílula de 36 px, sem padding); a partir de sm, pílula numa linha só
        className="relative grid w-full auto-cols-fr grid-flow-col gap-0.5 rounded-xl border border-line bg-card p-1 sm:flex sm:h-9 sm:w-auto sm:items-center sm:rounded-full sm:p-0.5"
      >
        <MarcadorChave className="bg-acao shadow-1" />
        {[
          { v: 'periodo', t: porRetorno ? 'Executados no período' : 'Saíram no período' },
          ...(porRetorno ? [] : [{ v: 'abertosPeriodo', t: 'Em aberto do período' }]),
          { v: 'fila', t: 'Na fila agora' },
        ].map((o) => (
          <Toggle
            key={o.v}
            value={o.v}
            // escolhida em índigo cheio, como a aba dos Relatórios: muda o que as três listas mostram, tem que se ver
            className="opcao-chave min-h-11 rounded-lg px-2 py-1.5 text-xs leading-tight text-ink-2 hover:text-ink data-pressed:font-medium data-pressed:text-sobre-acao sm:h-full sm:min-h-0 sm:rounded-full sm:px-3 sm:py-0"
          >
            {o.t}
          </Toggle>
        ))}
      </ToggleGroup>
      {/* celular: a chave ocupa a largura toda e o texto desce — centrado embaixo dela (usuário, 24/10/2026) */}
      {medida === 'fila' && <span className="text-xs text-ink-3 max-sm:w-full max-sm:text-center">Em aberto hoje, de qualquer mês: o período não muda estas listas.</span>}
      {medida === 'abertosPeriodo' && <span className="text-xs text-ink-3 max-sm:w-full max-sm:text-center">Saíram para a rua no período e ainda não voltaram.</span>}
      {medida === 'periodo' && !porRetorno && (
        <span className="flex items-center gap-3 text-xs text-ink-3 max-sm:w-full max-sm:justify-center">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-3 rounded-full bg-s1" /> já voltaram
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-3 rounded-full bg-andamento" /> ainda em aberto
          </span>
        </span>
      )}
    </div>
  )
}

// ── Categorias (revisadas): o que mais se pede ─────────────────────────────
// Quando uma categoria passa do dobro da segunda (hoje "Lâmpada apagada", ~83%), ela sai da
// escala: vira um destaque com a sua fatia, e as demais ganham escala própria (senão viram tracinhos).
export function Categorias({ linhas, medida }: { linhas: LinhaQuebra[]; medida: Medida }) {
  const { filtros, mudar } = useFiltros()
  const porRetorno = filtros.contarPor === 'retorno'
  const valor = (l: LinhaQuebra) => valorDe(l, medida)
  const ordem = linhas.filter((l) => valor(l) > 0 || l.nome === filtros.categoria).sort((a, b) => valor(b) - valor(a))
  const totalMedida = ordem.reduce((s, l) => s + valor(l), 0)
  const domina = ordem.length > 2 && valor(ordem[0]) > 2 * valor(ordem[1]) ? ordem[0] : null
  const demais = domina ? ordem.slice(1) : ordem
  const somaDemais = demais.reduce((s, l) => s + valor(l), 0)
  const max = Math.max(1, ...demais.map(valor))
  const unidade = medida === 'fila' ? 'da fila' : medida === 'abertosPeriodo' ? 'dos em aberto' : porRetorno ? 'dos executados' : 'das saídas'
  // na dominante a parte do total já vem ao lado do número: embaixo só o contexto que falta
  const apoioDomina = domina ? apoioDe(domina, medida) : undefined
  const destaqueDomina = domina ? complementoDe(domina, medida) : undefined
  const alternar = (nome: string) => mudar({ categoria: filtros.categoria === nome ? null : nome })
  const linha = (l: LinhaQuebra) => (
    <LinhaBarra
      key={l.nome}
      rotulo={l.nome}
      valor={valor(l)}
      maximo={max}
      complemento={complementoDe(l, medida)}
      parteAberta={parteDe(l, medida)}
      apoio={apoioDe(l, medida)}
      ativo={filtros.categoria === l.nome}
      aoTocar={() => alternar(l.nome)}
      corBarra={l.nome === CATEGORIA_RISCO ? 'bg-risco' : 'bg-s1'}
      icone={l.nome === CATEGORIA_RISCO ? <Zap aria-hidden className="size-3.5 shrink-0 text-risco-texto" /> : undefined}
    />
  )
  return (
    <Card aria-labelledby="titulo-categorias">
      <CabecalhoCard
        id="titulo-categorias"
        titulo="O que mais se pede"
        subtitulo={
          medida === 'fila'
            ? 'Em aberto hoje, por categoria revisada.'
            : medida === 'abertosPeriodo'
              ? 'Saíram no período e seguem em aberto, por categoria revisada.'
              : `${porRetorno ? 'Executados' : 'Saídas'} no período por categoria revisada.`
        }
      />
      <div className="px-3 pt-2 pb-3">
        {ordem.length === 0 ? (
          medida === 'fila' ? <FilaZerada /> : <Vazio />
        ) : (
          <>
            {domina && (
              <button
                type="button"
                onClick={() => alternar(domina.nome)}
                aria-pressed={filtros.categoria === domina.nome}
                className={clsx(
                  'mb-2 w-full rounded-lg px-2 py-2 text-left',
                  filtros.categoria === domina.nome ? 'bg-acao-suave' : 'tocavel hover:bg-realce',
                )}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-medium text-ink">{domina.nome}</span>
                  <span className="numeros text-[13px] text-ink">
                    {numero(valor(domina))} <span className="text-xs text-ink-3">{pct(valor(domina), totalMedida)} {unidade}</span>
                    {destaqueDomina && <span className="ml-1.5 text-xs text-ink-3">· {destaqueDomina}</span>}
                  </span>
                </span>
                {/* fatia da dominante x resto, numa barra só */}
                <span aria-hidden className="mt-2 flex h-2.5 gap-[2px] overflow-hidden rounded-full">
                  <span className="bg-s1" style={{ flexGrow: valor(domina) }} />
                  <span className="bg-s1/35" style={{ flexGrow: somaDemais }} />
                </span>
                {apoioDomina && <span className="mt-1 block text-[11px] text-ink-3">{apoioDomina}</span>}
              </button>
            )}
            {domina && (
              <p className="border-t border-line px-2 pt-3 pb-1 text-xs text-ink-2">
                Demais categorias · <span className="numeros">{numero(somaDemais)}</span> ({pct(somaDemais, totalMedida)}) — escala própria
              </p>
            )}
            <ul className={LISTA_BARRAS}>{demais.map(linha)}</ul>
          </>
        )}
      </div>
    </Card>
  )
}

// ── Bairros: os 12 com mais (na medida escolhida), até 30 ───────────────────
export function Bairros({
  linhas,
  regiaoDe,
  medida,
  className,
}: {
  linhas: LinhaQuebra[]
  regiaoDe: (bairro: string) => string
  medida: Medida
  className?: string
}) {
  const { filtros, mudar } = useFiltros()
  const porRetorno = filtros.contarPor === 'retorno'
  const [todos, setTodos] = useState(false)
  const valor = (l: LinhaQuebra) => valorDe(l, medida)
  const ordem = linhas.filter((l) => valor(l) > 0).sort((a, b) => valor(b) - valor(a) || compararTexto(a.nome, b.nome))
  const visiveis = ordem.slice(0, todos ? 30 : 12)
  const max = Math.max(1, ...visiveis.map(valor))
  return (
    <Card aria-labelledby="titulo-bairros" className={clsx('flex flex-col', className)}>
      <CabecalhoCard
        id="titulo-bairros"
        titulo="Bairros"
        subtitulo={
          medida === 'fila'
            ? 'Em aberto hoje. Toque num bairro para filtrar.'
            : medida === 'abertosPeriodo'
              ? 'Saíram no período e seguem em aberto. Toque num bairro para filtrar.'
              : `${porRetorno ? 'Executados' : 'Saídas para a rua'} no período. Toque num bairro para filtrar.`
        }
      />
      <div className="flex flex-1 flex-col px-3 pt-2 pb-3">
        {visiveis.length === 0 ? (
          medida === 'fila' ? <FilaZerada /> : <Vazio />
        ) : (
          <>
            <ol className={LISTA_BARRAS}>
              {visiveis.map((l) => (
                <LinhaBarra
                  key={l.nome}
                  rotulo={l.nome}
                  apoio={juntar(regiaoDe(l.nome), apoioDe(l, medida))}
                  pontoApoio={corRegiao(regiaoDe(l.nome))}
                  valor={valor(l)}
                  maximo={max}
                  complemento={complementoDe(l, medida)}
                  parteAberta={parteDe(l, medida)}
                  ativo={filtros.bairro === l.nome}
                  aoTocar={() =>
                    filtros.bairro === l.nome ? mudar({ bairro: null }) : mudar({ regiao: regiaoDe(l.nome), bairro: l.nome })
                  }
                />
              ))}
            </ol>
            {ordem.length > 12 && (
              <button
                type="button"
                onClick={() => setTodos((v) => !v)}
                className="mt-auto h-10 w-full rounded-md pt-1 text-[13px] font-medium text-acao tocavel hover:bg-realce"
              >
                {todos ? 'Mostrar só os 12 primeiros' : `Mostrar até 30 (de ${numero(ordem.length)})`}
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

// ── Quem pede (origem) ─────────────────────────────────────────────────────
// Como região → bairros: tocar numa origem abre os nomes dela (regionais, vereadores, associações…),
// os 10 com mais saídas e "Mostrar todos"; tocar num nome filtra o site todo (filtro "quem").
// Origem com um nome só (Cidadão, Ouvidoria…) não abre: só filtra.
const NOME_DO_QUEM: Record<string, string> = { Regional: 'regional', Vereador: 'vereador', Associação: 'associação', Secretaria: 'secretaria' }

export function Origens({
  linhas,
  quens,
  medida,
  className,
}: {
  linhas: LinhaQuebra[]
  /** 2º nível da origem escolhida (null = nada para abrir) */
  quens: LinhaQuebra[] | null
  medida: Medida
  className?: string
}) {
  const { filtros, mudar } = useFiltros()
  const porRetorno = filtros.contarPor === 'retorno'
  const valor = (l: LinhaQuebra) => valorDe(l, medida)
  const vazio = medida === 'fila' ? <FilaZerada /> : <Vazio />
  const [todos, setTodos] = useState(false)
  const nivelQuem = quens !== null && filtros.origem !== null
  const { data: base } = useBase()
  const vereadores = useMemo(() => new Map((base?.vereadores ?? []).map((v) => [v.nome, v])), [base])
  const comFoto = filtros.origem === 'Vereador'
  // entrar numa origem desliza a lista da direita; voltar, da esquerda (lib/gaveta.ts)
  const escolherOrigem = (nome: string | null) => {
    direcaoDaTroca(nome ? 'gaveta-entra' : 'gaveta-volta', ['quem'])
    mudar({ origem: nome })
  }
  // "← Origens" com qualquer origem escolhida, abra ela uma lista de nomes ou não (Cidadão, Ouvidoria…)
  const voltar = filtros.origem !== null && (
    <button
      type="button"
      onClick={() => escolherOrigem(null)}
      className="pressionavel flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-acao hover:bg-realce"
    >
      <ArrowLeft aria-hidden className="size-3.5" />
      Origens
    </button>
  )

  let titulo: string
  let subtitulo: string
  let corpo: ReactNode
  if (!nivelQuem) {
    const ordem = linhas.filter((l) => valor(l) > 0 || l.nome === filtros.origem).sort((a, b) => valor(b) - valor(a))
    const max = Math.max(1, ...ordem.map(valor))
    const oQue =
      medida === 'fila'
        ? 'os pedidos em aberto hoje'
        : medida === 'abertosPeriodo'
          ? 'os que saíram no período e seguem em aberto'
          : porRetorno
            ? 'os executados do período'
            : 'as saídas do período'
    titulo = filtros.origem ? `Quem pede · ${filtros.origem}` : 'Quem pede'
    subtitulo = filtros.origem
      ? `De onde vieram ${oQue}: esta origem.`
      : `De onde vieram ${oQue}. Toque para ver as regionais, os vereadores…`
    corpo =
      ordem.length === 0 ? (
        vazio
      ) : (
        <ul className={LISTA_BARRAS}>
          {ordem.map((l) => (
            <LinhaBarra
              key={l.nome}
              rotulo={l.nome}
              valor={valor(l)}
              maximo={max}
              complemento={complementoDe(l, medida)}
              parteAberta={parteDe(l, medida)}
              apoio={apoioDe(l, medida)}
              ativo={filtros.origem === l.nome}
              aoTocar={() => escolherOrigem(filtros.origem === l.nome ? null : l.nome)}
              compacta
            />
          ))}
        </ul>
      )
  } else {
    const ordem = quens
      .filter((l) => valor(l) > 0 || l.nome === filtros.quem)
      .sort((a, b) => valor(b) - valor(a) || compararTexto(a.nome, b.nome))
    const visiveis = todos ? ordem : ordem.slice(0, 10)
    const max = Math.max(1, ...visiveis.map(valor))
    const oQue =
      medida === 'fila'
        ? 'Em aberto hoje'
        : medida === 'abertosPeriodo'
          ? 'Em aberto, dos que saíram no período,'
          : porRetorno
            ? 'Executados no período'
            : 'Saídas do período'
    titulo = `Quem pede · ${filtros.origem}`
    subtitulo = `${oQue} por ${NOME_DO_QUEM[filtros.origem!] ?? 'nome'}. Toque num nome para filtrar o site todo.`
    corpo =
      visiveis.length === 0 ? (
        vazio
      ) : (
        <>
          <ol className={LISTA_BARRAS}>
            {visiveis.map((l) => (
              <LinhaBarra
                key={l.nome}
                rotulo={l.nome}
                apoio={apoioDe(l, medida)}
                valor={valor(l)}
                maximo={max}
                complemento={complementoDe(l, medida)}
                parteAberta={parteDe(l, medida)}
                ativo={filtros.quem === l.nome}
                aoTocar={() => mudar({ quem: filtros.quem === l.nome ? null : l.nome })}
                prefixo={comFoto ? <FotoVereador vereador={l.nome === SEM_VEREADOR ? null : (vereadores.get(l.nome) ?? null)} /> : undefined}
                compacta={!comFoto}
              />
            ))}
          </ol>
          {ordem.length > 10 && (
            <button
              type="button"
              onClick={() => setTodos((v) => !v)}
              className="mt-auto h-10 w-full rounded-md pt-1 text-[13px] font-medium text-acao tocavel hover:bg-realce"
            >
              {todos ? 'Mostrar só os 10 primeiros' : `Mostrar todos (${numero(ordem.length)})`}
            </button>
          )}
        </>
      )
  }

  return (
    <Card aria-labelledby="titulo-origens" className={clsx('flex flex-col', className)} style={gavetaCartao('quem')}>
      <CabecalhoCard id="titulo-origens" titulo={titulo} subtitulo={subtitulo} acao={voltar} />
      <div className="flex flex-1 flex-col px-3 pt-2 pb-3" {...gavetaLista('quem')}>
        {corpo}
      </div>
    </Card>
  )
}
