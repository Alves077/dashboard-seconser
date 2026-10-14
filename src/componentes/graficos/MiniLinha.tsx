// Mini-linha de tendência (13 meses) dentro de um indicador. Decorativa para a leitura rápida:
// o valor e a comparação estão escritos ao lado; o resumo em texto vai para o leitor de tela.
// `destaque`: os meses do período escolhido ganham uma faixa de fundo e pontos — dá para ver onde o
// número do indicador está na tendência (ex.: ago/26 no meio de 13 meses).
import { clsx } from 'clsx'

/** Índice do 1º ponto provisório (muita coisa ainda em aberto), ou undefined se nenhum */
export function desdeProvisorio(provisorios: boolean[]): number | undefined {
  const i = provisorios.findIndex(Boolean)
  return i < 0 ? undefined : i
}

export function MiniLinha({
  valores,
  parcialNoFim,
  provisorioDesde,
  destaque,
  descricao,
  className,
}: {
  /** null = mês sem dado (quebra a linha, não é zero) */
  valores: (number | null)[]
  /** o último ponto é o mês corrente, incompleto: trecho final tracejado */
  parcialNoFim?: boolean
  /** a partir deste ponto os valores ainda vão mudar (muita coisa em aberto): trecho tracejado até o fim */
  provisorioDesde?: number
  /** um por ponto: true = mês dentro do período escolhido */
  destaque?: boolean[]
  descricao: string
  className?: string
}) {
  const L = 120
  const A = 28
  const m = 3 // margem para o ponto final não cortar
  const nums = valores.filter((v): v is number => v !== null)
  if (nums.length < 2) return <span className="sr-only">{descricao}</span>

  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const passo = (L - 2 * m) / (valores.length - 1)
  const y = (v: number) => (max === min ? A / 2 : A - m - ((v - min) / (max - min)) * (A - 2 * m))
  const pts = valores.map((v, i) => (v === null ? null : ([m + i * passo, y(v)] as const)))

  // até `corte` a linha é cheia; dali até o fim, tracejada (mês em curso e/ou meses provisórios)
  const corte = Math.min(provisorioDesde ?? pts.length, parcialNoFim ? pts.length - 1 : pts.length)
  // segmentos contínuos (sem atravessar meses vazios)
  const caminhos: string[] = []
  let atual = ''
  pts.forEach((p, i) => {
    if (!p || i >= corte) {
      if (atual) caminhos.push(atual)
      atual = ''
      return
    }
    atual += `${atual ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`
  })
  if (atual) caminhos.push(atual)
  // tracejado: do último ponto cheio até o fim, pulando meses vazios
  const tracejados = pts.slice(Math.max(0, corte - 1)).filter((p): p is readonly [number, number] => p !== null)
  const tracejado = tracejados.length >= 2 ? tracejados.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('') : null

  const ultimo = pts[pts.length - 1]

  // trechos contínuos de meses marcados → uma faixa cada (meio passo para cada lado do ponto)
  const faixas: [number, number][] = []
  destaque?.forEach((d, i) => {
    if (!d) return
    const ult = faixas[faixas.length - 1]
    if (ult && ult[1] === i - 1) ult[1] = i
    else faixas.push([i, i])
  })
  const marcados = destaque ? pts.filter((p, i) => p && destaque[i] && p !== ultimo) : []

  return (
    <figure className={clsx('m-0', className)}>
      <svg viewBox={`0 0 ${L} ${A}`} className="h-7 w-full overflow-visible" aria-hidden preserveAspectRatio="none">
        {faixas.map(([a, b]) => {
          const x0 = Math.max(0, m + a * passo - passo / 2)
          const x1 = Math.min(L, m + b * passo + passo / 2)
          return <rect key={a} x={x0} y={-2} width={x1 - x0} height={A + 4} rx={2} fill="var(--c-s1)" opacity={0.12} />
        })}
        {caminhos.map((d) => (
          <path key={d} d={d} fill="none" stroke="var(--c-s1)" strokeWidth={1.75} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {tracejado && (
          <path
            d={tracejado}
            fill="none"
            stroke="var(--c-s1)"
            strokeWidth={1.75}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {/* pontos dos meses do período (traço de comprimento zero: não deforma quando o SVG estica) */}
        {marcados.map((p) => (
          <path key={p![0]} d={`M${p![0]},${p![1]}l0,0`} stroke="var(--c-s1)" strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}
        {/* ponto final: traço de comprimento zero com ponta redonda — não deforma quando o SVG estica */}
        {ultimo && (
          <>
            <path d={`M${ultimo[0]},${ultimo[1]}l0,0`} stroke="var(--c-card)" strokeWidth={8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path d={`M${ultimo[0]},${ultimo[1]}l0,0`} stroke="var(--c-s1)" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      <figcaption className="sr-only">{descricao}</figcaption>
    </figure>
  )
}
