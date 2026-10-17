import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { hoje as hojeAgora, type Dia } from './datas'

// ── Tema ────────────────────────────────────────────────────────────────────
// O index.html já aplicou o tema antes do 1º desenho; aqui só alterna e lembra.
export type Tema = 'claro' | 'escuro'

// O atributo data-theme é a fonte única: todos os componentes que usam useTema veem a mesma coisa.
function assinarTema(avisar: () => void) {
  const o = new MutationObserver(avisar)
  o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => o.disconnect()
}
const lerTema = (): Tema => (document.documentElement.dataset.theme === 'dark' ? 'escuro' : 'claro')

export function useTema() {
  const tema = useSyncExternalStore(assinarTema, lerTema)
  const alternar = useCallback(() => {
    const novo: Tema = lerTema() === 'escuro' ? 'claro' : 'escuro'
    document.documentElement.dataset.theme = novo === 'escuro' ? 'dark' : 'light'
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', novo === 'escuro' ? '#0a1324' : '#f6f9fc')
    try {
      localStorage.setItem('tema', novo)
    } catch {
      /* navegação privada: só não lembra */
    }
  }, [])
  return { tema, alternar }
}

// ── Media query ─────────────────────────────────────────────────────────────
export function useMidia(consulta: string): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const m = matchMedia(consulta)
      m.addEventListener('change', avisar)
      return () => m.removeEventListener('change', avisar)
    },
    () => matchMedia(consulta).matches,
  )
}

/**
 * Largura de um elemento, atualizada quando ele muda de tamanho — para gráficos SVG desenhados em
 * pixels reais (texto e traço sem distorcer). Uso: `const [ref, largura] = useLargura()`.
 */
export function useLargura<T extends HTMLElement = HTMLDivElement>() {
  const [el, setEl] = useState<T | null>(null)
  const [largura, setLargura] = useState(0)
  useEffect(() => {
    if (!el) return
    const o = new ResizeObserver(([e]) => setLargura(Math.round(e.contentRect.width)))
    o.observe(el)
    return () => o.disconnect()
  }, [el])
  return [setEl, largura] as const
}

/** "Hoje" que vira à meia-noite (situação de atraso muda com o dia) */
export function useHoje(): Dia {
  const [dia, setDia] = useState(hojeAgora)
  useEffect(() => {
    const t = setInterval(() => setDia((d) => (hojeAgora() !== d ? hojeAgora() : d)), 60_000)
    return () => clearInterval(t)
  }, [])
  return dia
}

// ── Ficha do serviço: aberta pela URL (?servico=508954-post), dá para mandar o link ──
export function useFicha() {
  const [params, setParams] = useSearchParams()
  const chave = params.get('servico')
  const abrir = useCallback(
    (c: string) =>
      setParams((p) => {
        const n = new URLSearchParams(p)
        n.set('servico', c)
        return n
      }),
    [setParams],
  )
  const fechar = useCallback(
    () =>
      setParams((p) => {
        const n = new URLSearchParams(p)
        n.delete('servico')
        return n
      }),
    [setParams],
  )
  return { chave, abrir, fechar }
}

/**
 * Escolhas que só valem dentro de uma página: não vão junto para as outras (antes, mexer na época da Lista de
 * campo e trocar de página levava "?relatorio=campo&saida=30d" para o Panorama). Relatórios: aba, só em atraso,
 * época da saída e mês de referência; Mapa: o que mostrar.
 */
const SO_DA_PAGINA = ['relatorio', 'campo', 'saida', 'referencia', 'mostrar']

/** Link para outra página levando os filtros atuais (e sem a ficha aberta, salvo se pedida em `extra`) */
export function useDestino() {
  const { search, pathname: aqui } = useLocation()
  return useCallback(
    (pathname: string, extra?: Record<string, string>) => {
      const p = new URLSearchParams(search)
      p.delete('servico')
      if (pathname !== aqui) for (const k of SO_DA_PAGINA) p.delete(k)
      for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v)
      const s = p.toString()
      return { pathname, search: s ? `?${s}` : '' }
    },
    [search, aqui],
  )
}

/**
 * Marca a direção da próxima troca de filtro (estilos.css: data-transicao). "entra" = foco num
 * recorte (desliza da direita); "volta" = de volta à visão geral. Some sozinha depois da troca.
 * "gaveta-entra"/"gaveta-volta": o mesmo, mas só dentro dos cards com vai-e-volta (lib/gaveta.ts; a página não desliza).
 * `alvos`: os cards que trocam de nível (ex.: ['onde']). Só as listas deles deslizam; as outras listas com nome
 * de transição na página ficam paradas nesta troca (antes, abrir uma região no "Onde estão" fazia a lista do
 * "Quem pede", que não mudou, deslizar junto).
 *
 * A marca só sai quando a transição TERMINA (não num tempo fixo): a troca pode levar ~250 ms
 * calculando a página antes de a animação começar, e tirar a marca no meio fazia a lista antiga
 * reaparecer por um instante. Navegador sem :active-view-transition → tempo fixo folgado.
 */
export function direcaoDaTroca(direcao: 'entra' | 'volta' | 'gaveta-entra' | 'gaveta-volta', alvos?: string[]) {
  const raiz = document.documentElement
  raiz.dataset.transicao = direcao
  // listas que NÃO são alvo: classe "parada" só durante esta troca (sem as regras de deslizar)
  const parados: HTMLElement[] = []
  if (alvos)
    for (const el of document.querySelectorAll<HTMLElement>('[data-gaveta-lista]'))
      if (!alvos.includes(el.dataset.gavetaLista!)) {
        el.style.setProperty('view-transition-class', 'gaveta-parada')
        parados.push(el)
      }
  const tirar = () => {
    if (raiz.dataset.transicao === direcao) delete raiz.dataset.transicao
    for (const el of parados) el.style.setProperty('view-transition-class', 'gaveta-lista')
  }
  let temSeletor = true
  const ativa = () => {
    try {
      return raiz.matches(':active-view-transition')
    } catch {
      temSeletor = false
      return false
    }
  }
  const inicio = performance.now()
  let comecou = false
  const vigiar = () => {
    const agora = ativa()
    if (!temSeletor) return void window.setTimeout(tirar, 1200)
    if (agora) comecou = true
    // terminou, ou nunca começou (sem View Transitions / troca sem animação), ou passou do limite
    if ((comecou && !agora) || (!comecou && performance.now() - inicio > 1000) || performance.now() - inicio > 3000) tirar()
    else requestAnimationFrame(vigiar)
  }
  requestAnimationFrame(vigiar)
}
