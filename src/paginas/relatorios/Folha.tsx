// Peças comuns dos relatórios: a folha (A4 na tela e na impressão), o cabeçalho com escopo e datas,
// seções que não quebram no meio, a barra empilhada de faixas e os indicadores compactos.
// Impressão: o navegador salva em PDF ("Imprimir → Salvar como PDF"); estilos em estilos.css (.folha).
import { clsx } from 'clsx'
import { Info } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import type { Servico } from '@/dados/tipos'
import { useFicha } from '@/lib/ganchos'
import { numero, pct } from '@/lib/formato'

/** Na impressão, sempre tema claro (o escuro gastaria tinta e sai ilegível no papel) */
export function useImpressaoClara() {
  useEffect(() => {
    let anterior: string | undefined
    const antes = () => {
      anterior = document.documentElement.dataset.theme
      document.documentElement.dataset.theme = 'light'
    }
    const depois = () => {
      if (anterior) document.documentElement.dataset.theme = anterior
    }
    window.addEventListener('beforeprint', antes)
    window.addEventListener('afterprint', depois)
    return () => {
      window.removeEventListener('beforeprint', antes)
      window.removeEventListener('afterprint', depois)
    }
  }, [])
}

/**
 * Tabela larga: no celular rola para o lado em vez de cortar colunas. A largura mínima (`minimo`, sempre
 * com `max-sm:`) só vale no celular; no computador e no papel a tabela se ajusta como antes.
 */
export function Rolavel({ children, minimo = 'max-sm:min-w-[30rem]' }: { children: ReactNode; minimo?: string }) {
  return (
    <div className="overflow-x-auto overscroll-x-contain print:overflow-visible">
      <div className={clsx(minimo, 'print:min-w-0')}>{children}</div>
    </div>
  )
}

export function Folha({ children }: { children: ReactNode }) {
  return <article className="folha mx-auto w-full max-w-[850px] rounded-xl border border-line bg-card px-5 py-6 text-ink shadow-1 sm:px-10 sm:py-9">{children}</article>
}

export function CabecalhoFolha({ titulo, subtitulo, meta }: { titulo: string; subtitulo?: ReactNode; meta: ReactNode[] }) {
  return (
    <header className="mb-5 flex flex-col gap-3 border-b-2 border-ink pb-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[19px] leading-tight font-semibold tracking-[-0.3px] text-ink">{titulo}</h2>
        <p className="mt-0.5 text-[11.5px] text-ink-2">Departamento de Iluminação Pública · SECONSER Niterói</p>
        {subtitulo && <p className="mt-1 text-[12px] text-ink-2">{subtitulo}</p>}
      </div>
      <ul className="text-[10.5px] leading-relaxed text-ink-3 sm:text-right">
        {meta.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </header>
  )
}

/**
 * `colado`: sem margem de cima (dentro de uma grade de duas colunas, que já tem a margem).
 * `cartao`: o conteúdo dentro de um cartão com borda (separa bem uma tabela da outra).
 */
export function SecaoFolha({
  titulo,
  children,
  className,
  colado = false,
  cartao = false,
}: {
  titulo: string
  children: ReactNode
  className?: string
  colado?: boolean
  cartao?: boolean
}) {
  return (
    // celular: min-w-0 — dentro de uma grade, sem isso a tabela larga esticava a coluna e não rolava de lado.
    // Do sm para cima e no papel fica como sempre foi (as colunas se ajustam ao conteúdo).
    <section className={clsx('secao-folha max-sm:min-w-0', !colado && 'mt-5 first:mt-0', className)}>
      <h3 className="mb-2 text-[10px] font-semibold tracking-[0.08em] text-ink-3 uppercase">{titulo}</h3>
      {cartao ? <div className="cartao-folha">{children}</div> : children}
    </section>
  )
}

/** Número do serviço como pílula que abre a ficha (descrição, fotos, histórico); no papel, só o número */
export function IdServico({ servico, ordem }: { servico: Servico; ordem?: number }) {
  const { abrir } = useFicha()
  return (
    <>
      <button
        type="button"
        onClick={() => abrir(servico.chave)}
        title="Ver a ficha do serviço"
        className="pressionavel inline-flex items-center gap-1 rounded-full bg-acao-suave px-2 py-0.5 font-semibold text-acao hover:bg-acao/15 print:hidden"
      >
        <span className="numeros">{servico.idColab}</span>
        <Info aria-hidden className="size-3" />
      </button>
      <span className="numeros hidden font-semibold print:inline">{servico.idColab}</span>
      {ordem !== undefined && ordem > 1 && <span className="ml-1 text-[10px] font-normal text-ink-3">({ordem}ª ida)</span>}
    </>
  )
}

/** Indicador compacto da folha: rótulo, valor e uma linha de apoio (comparação ou detalhe) */
export function NumeroFolha({ rotulo, valor, apoio, tom }: { rotulo: string; valor: ReactNode; apoio?: ReactNode; tom?: string }) {
  return (
    <div className="rounded-md border border-line px-3 py-2">
      <p className="text-[10px] font-medium tracking-[0.04em] text-ink-3 uppercase">{rotulo}</p>
      <p className="numeros mt-0.5 text-[20px] leading-tight font-light text-ink">{valor}</p>
      {apoio && <p className={clsx('numeros mt-0.5 text-[10.5px]', tom ?? 'text-ink-2')}>{apoio}</p>}
    </div>
  )
}

/** Barra 100% empilhada com legenda (contagem, parte de cada faixa e uma nota opcional) */
export function BarraFaixas({
  partes,
  total,
  comPct = true,
}: {
  /** textoEscuro: faixa clara (verde, âmbar, laranja) — branco nela ficava com contraste 1,8–3,4 */
  partes: { rotulo: string; n: number; cor: string; nota?: string; textoEscuro?: boolean }[]
  total: number
  /** parte (%) também na legenda */
  comPct?: boolean
}) {
  return (
    <div>
      <div className="flex h-6 gap-[2px] overflow-hidden rounded-md bg-line/50">
        {partes.map(
          (p) =>
            p.n > 0 && (
              <span
                key={p.rotulo}
                className={clsx('numeros flex items-center justify-center text-[10px] font-semibold', p.textoEscuro ? 'text-[#0d253d]' : 'text-white')}
                style={{ flexGrow: p.n, background: p.cor }}
              >
                {p.n / total >= 0.07 ? pct(p.n, total) : ''}
              </span>
            ),
        )}
      </div>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-ink-2">
        {partes.map((p) => (
          <li key={p.rotulo} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: p.cor }} />
            {p.rotulo}
            <span className="numeros font-medium text-ink">{numero(p.n)}</span>
            {comPct && <span className="numeros text-ink-3">({pct(p.n, total)})</span>}
            {p.nota && <span className="text-ink-3">· {p.nota}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Observações do relatório: caixa de texto na tela; no papel, só o texto (some se ficar vazio) */
export function Observacoes({ valor, aoMudar }: { valor: string; aoMudar: (v: string) => void }) {
  return (
    <section className={clsx('secao-folha mt-5', !valor.trim() && 'print:hidden')}>
      <h3 className="mb-2 text-[10px] font-semibold tracking-[0.08em] text-ink-3 uppercase">Observações</h3>
      <textarea
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        rows={3}
        placeholder="Notas do período para quem vai ler (ex.: chuva forte na semana de 22/09). Se ficar vazio, não sai na impressão."
        className="w-full resize-y rounded-md border border-line-input bg-page px-3 py-2 text-[12.5px] text-ink pointer-coarse:text-base placeholder:text-ink-3 focus:border-acao focus:outline-none print:hidden"
      />
      <p className="hidden text-[12px] leading-relaxed whitespace-pre-wrap text-ink print:block">{valor}</p>
    </section>
  )
}
