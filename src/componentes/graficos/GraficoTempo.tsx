// Gráfico ao longo do tempo (SVG em pixels reais). Um eixo só, começando no zero; grade discreta;
// mês em curso tracejado. Cada série é uma linha ou uma área de fundo (nível, ex.: o estoque, por
// trás dos fluxos). Valor null = sem dado (quebra a linha, não é zero). Passar o dedo/mouse marca o
// bloco e abre uma dica com todos os valores. Leitor de tela: resumo no aria-label + tabela oculta.
import { clsx } from 'clsx'
import { useState, type PointerEvent, type ReactNode } from 'react'
import { useLargura } from '@/lib/ganchos'
import { numero } from '@/lib/formato'

export interface SerieTempo {
  id: string
  nome: string
  /** var(--c-…) */
  cor: string
  valores: (number | null)[]
  /** área de fundo (desenhada antes, por trás das linhas) */
  estilo?: 'linha' | 'area'
  /** forma dos pontos: com duas linhas, uma bolinha e outra quadradinho — distingue no papel em preto e branco
   * (tracejado não: no painel inteiro ele quer dizer "mês em curso") */
  marcador?: 'circulo' | 'quadrado'
}

export interface IntervaloTempo {
  rotulo: string
  nome: string
  parcial: boolean
}

const ESQ = 40
const DIR = 12
const TOPO = 12
const BAIXO = 24

/** Topo "redondo" da escala e 3–5 marcas; passo de no mínimo 1 (contagens e dias: "0,5 serviço" não existe) */
export function escala(max: number): number[] {
  if (max <= 0) return [0, 1]
  const bruto = max / 4
  const p = 10 ** Math.floor(Math.log10(bruto))
  const passo = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= bruto)!)
  const topo = Math.ceil(max / passo) * passo
  const marcas: number[] = []
  for (let v = 0; v <= topo + passo / 2; v += passo) marcas.push(Math.round(v * 100) / 100)
  return marcas
}

export function GraficoTempo({
  intervalos,
  series,
  altura = 220,
  formatar = numero,
  marcasFixas,
  referencia,
  extra,
  provisorioDesde,
  descricao,
}: {
  intervalos: IntervaloTempo[]
  series: SerieTempo[]
  altura?: number
  /** número no eixo e na dica */
  formatar?: (v: number) => string
  /** escala fixa (ex.: [0, 25, 50, 75, 100] para %) */
  marcasFixas?: number[]
  /** linha tracejada de referência (ex.: o prazo de 5 dias) */
  referencia?: { valor: number; rotulo: string }
  /** linhas a mais na dica (ex.: saldo do bloco) */
  extra?: (i: number) => ReactNode
  /** a partir deste bloco os valores ainda vão mudar (muita coisa em aberto): tracejado e "provisório" na dica */
  provisorioDesde?: number
  descricao: string
}) {
  const [ref, largura] = useLargura()
  const [foco, setFoco] = useState<number | null>(null)
  const n = intervalos.length
  const passo = n > 1 ? (largura - ESQ - DIR) / (n - 1) : 0
  const x = (i: number) => (n > 1 ? ESQ + i * passo : (ESQ + largura - DIR) / 2)

  const todos = series.flatMap((s) => s.valores.filter((v): v is number => v !== null))
  const marcas = marcasFixas ?? escala(Math.max(1, ...todos, referencia?.valor ?? 0) * 1.05)
  const topo = marcas[marcas.length - 1]
  const y = (v: number) => TOPO + (1 - v / topo) * (altura - TOPO - BAIXO)

  const parcial = n > 1 && intervalos[n - 1].parcial
  // até `corte` a linha é cheia; dali até o fim, tracejada (bloco em curso e/ou blocos provisórios)
  const corte = Math.min(provisorioDesde ?? n, parcial ? n - 1 : n)
  const aberto = (i: number) => i >= corte

  /** trechos contínuos (sem atravessar null) até o corte; do último ponto cheio ao fim sai à parte, tracejado */
  function trechos(valores: (number | null)[]) {
    const cheios: [number, number][][] = []
    let atual: [number, number][] = []
    for (let i = 0; i < corte; i++) {
      const v = valores[i]
      if (v === null) {
        if (atual.length) cheios.push(atual)
        atual = []
      } else atual.push([x(i), y(v)])
    }
    if (atual.length) cheios.push(atual)
    const resto: [number, number][] = []
    for (let i = Math.max(0, corte - 1); i < n; i++) {
      const v = valores[i]
      if (v !== null) resto.push([x(i), y(v)])
    }
    const emCurso = corte < n && resto.length >= 2 ? resto : null
    return { cheios, emCurso }
  }
  const caminho = (pts: [number, number][]) => pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
  const area = (pts: [number, number][]) =>
    pts.length < 2 ? '' : `${caminho(pts)} L${pts[pts.length - 1][0].toFixed(1)},${y(0)} L${pts[0][0].toFixed(1)},${y(0)} Z`

  // um rótulo de eixo a cada ~52 px (sempre o último)
  const cada = Math.max(1, Math.ceil(52 / (passo || 52)))
  const ordem = [...series.filter((s) => s.estilo === 'area'), ...series.filter((s) => s.estilo !== 'area')]

  const mover = (e: PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    const i = Math.round((e.clientX - r.left - ESQ) / (passo || 1))
    setFoco(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div ref={ref} className="relative">
      {largura > 0 && n > 0 && (
        // viewBox: se o papel for mais estreito que a tela na impressão, o gráfico encolhe em vez de cortar
        <svg
          width={largura}
          height={altura}
          viewBox={`0 0 ${largura} ${altura}`}
          role="img"
          aria-label={descricao}
          className="block h-auto max-w-full overflow-visible"
        >
          {marcas.map((m) => (
            <g key={m}>
              <line x1={ESQ} x2={largura - DIR} y1={y(m)} y2={y(m)} stroke="var(--c-line)" strokeDasharray={m === 0 ? undefined : '2 3'} />
              <text x={ESQ - 6} y={y(m)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--c-ink-3)" className="numeros">
                {formatar(m)}
              </text>
            </g>
          ))}
          {referencia && (
            <g>
              <line x1={ESQ} x2={largura - DIR} y1={y(referencia.valor)} y2={y(referencia.valor)} stroke="var(--c-ok)" strokeWidth={1.5} strokeDasharray="5 4" />
              <text x={largura - DIR} y={y(referencia.valor) - 5} textAnchor="end" fontSize={10} fill="var(--c-ok-texto)">
                {referencia.rotulo}
              </text>
            </g>
          )}
          {foco !== null && <line x1={x(foco)} x2={x(foco)} y1={TOPO - 4} y2={altura - BAIXO} stroke="var(--c-ink-3)" strokeOpacity={0.5} />}

          {ordem.map((s) => {
            const { cheios, emCurso } = trechos(s.valores)
            const eArea = s.estilo === 'area'
            return (
              <g key={s.id}>
                {eArea && cheios.map((t, k) => <path key={k} d={area(t)} fill={s.cor} fillOpacity={0.14} />)}
                {eArea && emCurso && <path d={area(emCurso)} fill={s.cor} fillOpacity={0.07} />}
                {cheios.map((t, k) => (
                  <path key={k} d={caminho(t)} fill="none" stroke={s.cor} strokeWidth={eArea ? 1.5 : 2} strokeLinejoin="round" strokeLinecap="round" />
                ))}
                {emCurso && <path d={caminho(emCurso)} fill="none" stroke={s.cor} strokeWidth={eArea ? 1.5 : 2} strokeDasharray="4 4" strokeLinecap="round" />}
                {!eArea &&
                  s.valores.map((v, i) =>
                    v === null || (n > 40 && foco !== i) ? null : s.marcador === 'quadrado' ? (
                      <rect
                        key={i}
                        x={x(i) - (foco === i ? 4 : 2.75)}
                        y={y(v) - (foco === i ? 4 : 2.75)}
                        width={foco === i ? 8 : 5.5}
                        height={foco === i ? 8 : 5.5}
                        rx={0.75}
                        fill={aberto(i) ? 'var(--c-card)' : s.cor}
                        stroke={aberto(i) ? s.cor : 'var(--c-card)'}
                        strokeWidth={foco === i ? 2 : 1.5}
                      />
                    ) : (
                      <circle
                        key={i}
                        cx={x(i)}
                        cy={y(v)}
                        r={foco === i ? 4.5 : 3}
                        fill={aberto(i) ? 'var(--c-card)' : s.cor}
                        stroke={aberto(i) ? s.cor : 'var(--c-card)'}
                        strokeWidth={foco === i ? 2 : 1.5}
                      />
                    ),
                  )}
                {eArea && foco !== null && s.valores[foco] !== null && (
                  <circle cx={x(foco)} cy={y(s.valores[foco]!)} r={4} fill={s.cor} stroke="var(--c-card)" strokeWidth={2} />
                )}
              </g>
            )
          })}

          {intervalos.map((iv, i) =>
            (n - 1 - i) % cada !== 0 ? null : (
              <text
                key={i}
                x={x(i)}
                y={altura - 6}
                textAnchor={n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'}
                fontSize={10}
                fill={foco === i ? 'var(--c-ink)' : 'var(--c-ink-3)'}
              >
                {iv.rotulo}
              </text>
            ),
          )}
          {/* área de toque: arrastar na horizontal percorre; na vertical, rola a página */}
          <rect
            x={ESQ - Math.max(passo, 8) / 2}
            y={0}
            width={Math.max(0, largura - ESQ - DIR + Math.max(passo, 8))}
            height={altura}
            fill="transparent"
            style={{ touchAction: 'pan-y' }}
            onPointerMove={mover}
            onPointerDown={mover}
            onPointerLeave={() => setFoco(null)}
          />
        </svg>
      )}

      {foco !== null && largura > 0 && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-0 z-10 w-56 rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink shadow-2"
          // ao lado da marcação (não por cima dos pontos)
          style={{ left: x(foco) < largura / 2 ? x(foco) + 12 : Math.max(0, x(foco) - 12 - 224) }}
        >
          <p className="font-medium">
            {intervalos[foco].nome}
            {intervalos[foco].parcial && <span className="font-normal text-ink-3"> · em curso</span>}
            {!intervalos[foco].parcial && provisorioDesde !== undefined && foco >= provisorioDesde && (
              <span className="font-normal text-ink-3"> · provisório</span>
            )}
          </p>
          <dl className="numeros mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
            {series.map((s) => (
              <div key={s.id} className="contents">
                <dt className="flex items-center gap-1.5 text-ink-2">
                  <span aria-hidden className={s.estilo === 'area' ? 'size-2 rounded-[2px]' : 'h-[3px] w-3 rounded-full'} style={{ background: s.cor }} />
                  {s.nome}
                </dt>
                <dd className="text-right">{s.valores[foco] === null ? '—' : formatar(s.valores[foco]!)}</dd>
              </div>
            ))}
          </dl>
          {extra && <div className="mt-1 border-t border-line pt-1">{extra(foco)}</div>}
        </div>
      )}

      {/* tabela para leitor de tela (sr-only num invólucro: direto na <table>, a legenda escapava) */}
      <div className="sr-only">
        <table>
          <caption>{descricao}</caption>
          <thead>
            <tr>
              <th scope="col">Período</th>
              {series.map((s) => (
                <th key={s.id} scope="col">
                  {s.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {intervalos.map((iv, i) => (
              <tr key={i}>
                <th scope="row">
                  {iv.nome}
                  {iv.parcial && ' (em curso)'}
                </th>
                {series.map((s) => (
                  <td key={s.id}>{s.valores[i] === null ? 'sem dado' : formatar(s.valores[i]!)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Legenda das séries (cor + nome + total opcional), sempre presente com 2 séries ou mais */
export function LegendaTempo({
  itens,
  className,
}: {
  itens: { nome: string; cor: string; valor?: ReactNode; area?: boolean; marcador?: 'circulo' | 'quadrado' }[]
  className?: string
}) {
  return (
    <ul className={clsx('flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-2', className)}>
      {itens.map((it) => (
        <li key={it.nome} className="flex items-center gap-1.5">
          {it.marcador ? (
            // traço com o ponto no meio, igual ao gráfico (bolinha × quadradinho)
            <svg aria-hidden width="18" height="10" viewBox="0 0 18 10" className="shrink-0">
              <line x1="1" x2="17" y1="5" y2="5" stroke={it.cor} strokeWidth="2" strokeLinecap="round" />
              {it.marcador === 'quadrado' ? (
                <rect x="6.25" y="2.25" width="5.5" height="5.5" rx="0.75" fill={it.cor} />
              ) : (
                <circle cx="9" cy="5" r="3" fill={it.cor} />
              )}
            </svg>
          ) : (
            <span
              aria-hidden
              className={it.area ? 'size-2.5 rounded-[3px] border' : 'h-[3px] w-4 rounded-full'}
              style={it.area ? { background: `color-mix(in oklab, ${it.cor} 18%, transparent)`, borderColor: it.cor } : { background: it.cor }}
            />
          )}
          {it.nome}
          {it.valor !== undefined && <span className="numeros font-medium text-ink">{it.valor}</span>}
        </li>
      ))}
    </ul>
  )
}
