// Marcador da opção escolhida numa chave (2–4 opções lado a lado): o fundo desliza de uma opção para a
// outra em vez de pular — o olho acompanha para onde foi a escolha (ideia do vídeo "Dashboard V14", 18/10/2026).
// Uso: primeiro filho do grupo (que precisa de `relative`); as opções levam `opcao-chave` e NÃO pintam o
// próprio fundo quando escolhidas — só a cor do texto, que acompanha o marcador chegando.
// Acha sozinho a opção escolhida ([data-pressed] do Toggle do Base UI ou [aria-checked="true"] de um radio)
// e acompanha troca de escolha, de tamanho da tela e de quantidade de opções.
import { clsx } from 'clsx'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface Caixa {
  x: number
  y: number
  w: number
  h: number
  raio: string
}

const ESCOLHIDA = '[data-pressed], [aria-checked="true"]'
/** nomes de transição únicos na página (estilos.css: ::view-transition-*(*.chave)) */
let chaves = 0

export function MarcadorChave({ className }: { className: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [caixa, setCaixa] = useState<Caixa | null>(null)
  // só desliza depois da primeira medida: ao abrir a página o marcador já nasce no lugar
  const [desliza, setDesliza] = useState(false)
  const [nome] = useState(() => `chave-${++chaves}`)

  useLayoutEffect(() => {
    const grupo = ref.current?.parentElement
    if (!grupo) return
    // a chave fica de fora do esmaecer da troca (filtro, medida, aba): o marcador desliza ao vivo, sem a foto antiga
    // da página por cima mostrando o marcador no lugar velho
    grupo.style.setProperty('view-transition-name', nome)
    grupo.style.setProperty('view-transition-class', 'chave')
    const medir = () => {
      const el = grupo.querySelector<HTMLElement>(ESCOLHIDA)
      if (!el) return setCaixa(null)
      // o canto acompanha a opção (no celular algumas chaves são cantos arredondados, no computador pílula)
      const proxima = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, raio: getComputedStyle(el).borderRadius }
      setCaixa((c) => (c && c.x === proxima.x && c.y === proxima.y && c.w === proxima.w && c.h === proxima.h && c.raio === proxima.raio ? c : proxima))
    }
    medir()
    const tamanho = new ResizeObserver(medir)
    tamanho.observe(grupo)
    for (const filho of grupo.children) tamanho.observe(filho)
    const escolha = new MutationObserver(medir)
    escolha.observe(grupo, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-pressed', 'aria-checked'] })
    return () => {
      tamanho.disconnect()
      escolha.disconnect()
      grupo.style.removeProperty('view-transition-name')
      grupo.style.removeProperty('view-transition-class')
    }
  }, [nome])

  useEffect(() => {
    if (!caixa || desliza) return
    const quadro = requestAnimationFrame(() => setDesliza(true))
    return () => cancelAnimationFrame(quadro)
  }, [caixa, desliza])

  return (
    <span
      ref={ref}
      aria-hidden
      className={clsx(
        'pointer-events-none absolute top-0 left-0',
        // posição por transform; largura e altura também mudam (opções de tamanhos diferentes) — é um elemento
        // solto (absolute), não empurra nada; com movimento reduzido, pula direto
        desliza && 'transition-[translate,width,height] duration-[220ms] ease-(--ease-saida) motion-reduce:transition-none',
        !caixa && 'hidden',
        className,
      )}
      style={caixa ? { translate: `${caixa.x}px ${caixa.y}px`, width: caixa.w, height: caixa.h, borderRadius: caixa.raio } : undefined}
    />
  )
}
