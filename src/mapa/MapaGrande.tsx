// Mapa grande (página Mapa). Pinos desenhados direto no Leaflet, em canvas: até ~17 mil pontos
// sem um componente React por pino (isso travaria a página).
//   - cor = situação da saída mais recente (status: sempre explicado na legenda com ícone + texto)
//   - aro laranja = risco elétrico em aberto
//   - vários serviços na MESMA coordenada (comum em pedidos de Regional: até 8 no mesmo ponto) viram
//     um pino com o número; tocar abre a lista para escolher. Sem isso, ficavam escondidos um sob o outro.
//   - mudou o filtro → reenquadra; escolheu um serviço → voa até o pino e marca com um anel
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { clsx } from 'clsx'
import { Layers, Maximize } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, useMap } from 'react-leaflet'
import { CENTRO_NITEROI, type Ponto } from '@/calculos/mapa'
import type { Situacao } from '@/dados/tipos'
import { numero } from '@/lib/formato'
import { useMidia, useTema } from '@/lib/ganchos'
import { FundoMapa } from './FundoMapa'

const botaoMapa =
  'pressionavel flex h-10 items-center gap-2 rounded-full border border-line bg-card/95 px-3 text-[13px] font-medium text-ink shadow-1 backdrop-blur-sm hover:border-acao/40'

const ORDEM: Record<Situacao, number> = { ok: 0, andamento: 1, atraso: 2 } // atraso desenhado por cima
const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
const semMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const chaveLugar = (p: Ponto) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`
const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/**
 * Leva o mapa até o ponto. No computador a ficha abre por cima, à direita: o pino vai para o centro
 * da parte do mapa que fica VISÍVEL (desconta só o pedaço que a ficha cobre de fato — numa tela larga
 * ela cobre quase só o painel). `animar=false` = já abre lá (ex.: chegou pelo "Ver no mapa").
 */
function voarPara(map: L.Map, latlng: L.LatLngExpression, zoom: number, descontarFicha: boolean, animar: boolean) {
  let alvo = L.latLng(latlng)
  if (descontarFicha) {
    const larguraFicha = Math.min(Math.max(560, window.innerWidth * 0.4), window.innerWidth)
    const inicioFicha = window.innerWidth - larguraFicha
    const caixa = map.getContainer().getBoundingClientRect()
    const coberto = Math.min(Math.max(0, caixa.right - inicioFicha), caixa.width * 0.7)
    alvo = map.unproject(map.project(alvo, zoom).add([coberto / 2, 0]), zoom)
  }
  if (!animar || semMovimento()) map.setView(alvo, zoom, { animate: false })
  else map.flyTo(alvo, zoom, { duration: DURACAO_VOO })
}

/** Mapa estreito (celular): o enquadramento automático mostra o miolo, não o todo */
const LARGURA_ESTREITA = 640

/** Limites sem as pontas: tira os 5% mais afastados de cada lado (latitude e longitude) */
function limitesDoMiolo(pontos: Ponto[]): L.LatLngBounds {
  const corte = (v: number[]) => {
    v.sort((a, b) => a - b)
    const i = Math.floor(v.length * 0.05)
    return [v[i], v[v.length - 1 - i]]
  }
  const [lat0, lat1] = corte(pontos.map((p) => p.lat))
  const [lng0, lng1] = corte(pontos.map((p) => p.lng))
  return L.latLngBounds([lat0, lng0], [lat1, lng1])
}

/**
 * Centro que deixa mais pinos à vista neste zoom: testa uma grade 11×11 de centros dentro do miolo
 * (o centro geométrico cortava o Centro/Icaraí, onde há mais pinos, e sobrava São Gonçalo vazio).
 */
function centroComMaisPinos(map: L.Map, pontos: Ponto[], miolo: L.LatLngBounds, zoom: number): L.LatLng {
  const px = pontos.map((p) => map.project([p.lat, p.lng], zoom))
  const meio = map.getSize().divideBy(2).subtract([16, 16])
  const a = map.project(miolo.getNorthWest(), zoom)
  const b = map.project(miolo.getSouthEast(), zoom)
  let melhor = miolo.getCenter()
  let maior = -1
  for (let i = 0; i <= 10; i++) {
    for (let j = 0; j <= 10; j++) {
      const c = L.point(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * j) / 10)
      let n = 0
      for (const q of px) if (Math.abs(q.x - c.x) <= meio.x && Math.abs(q.y - c.y) <= meio.y) n++
      if (n > maior) {
        maior = n
        melhor = map.unproject(c, zoom)
      }
    }
  }
  return melhor
}

/**
 * Enquadra os pontos. `miolo` (enquadramento automático no celular): Niterói inteira só cabe numa tela
 * estreita em zoom fracionado (~11,25), que estica as imagens do mapa (nomes borrados) e embola os pinos
 * → zoom inteiro (nítido) que cabe o miolo (sem os 5% mais afastados de cada lado), centrado onde há mais
 * pinos à vista. "Ver todos" mostra tudo.
 */
function enquadrar(map: L.Map, pontos: Ponto[], animar: boolean, miolo = false): boolean {
  if (!pontos.length) return true
  // Mapa sem tamanho (aba em segundo plano, janela minimizada, layout ainda sem altura): o zoom que
  // "cabe" vira infinito e o centro vira NaN ("Invalid LatLng object: (NaN, NaN)"). Não enquadra agora;
  // quem chamou tenta de novo quando o mapa ganhar tamanho.
  const tamanho = map.getSize()
  if (!tamanho.x || !tamanho.y) return false
  const limites = L.latLngBounds(pontos.map((p) => [p.lat, p.lng] as [number, number]))
  const mover = animar && !semMovimento()
  if (miolo && pontos.length >= 20) {
    const nucleo = limitesDoMiolo(pontos)
    const cabe = map.getBoundsZoom(nucleo, false, L.point(16, 16))
    const zoom = Math.min(17, Math.max(map.getMinZoom(), Math.round(cabe)))
    const centro = centroComMaisPinos(map, pontos, nucleo, zoom)
    if (mover) map.flyTo(centro, zoom, { duration: DURACAO_VOO })
    else map.setView(centro, zoom, { animate: false })
    return true
  }
  // margem pequena + zoom fracionado (zoomSnap 0.25): enquadra mais perto que o zoom inteiro
  const opcoes = { padding: [16, 16] as [number, number], maxZoom: 17 }
  if (mover) map.flyToBounds(limites, { ...opcoes, duration: DURACAO_VOO })
  // sem animate:false o Leaflet ainda anima o zoom
  else map.fitBounds(limites, { ...opcoes, animate: false })
  return true
}

/** Voo do mapa: mostra para onde foi (por isso passa dos 300 ms), mas acontece a cada filtro — 0,6 s fazia esperar */
const DURACAO_VOO = 0.4

const quando = (p: Ponto) => (p.situacao === 'ok' ? `executado em ${p.dias} d` : `${p.dias} d em aberto`)

function rotuloPino(p: Ponto) {
  return `<strong>${p.servico.idColab}</strong> · ${escapar(p.servico.categoria ?? '')}<br>${escapar(p.servico.bairro)} · ${quando(p)}`
}

/** Pior situação do grupo manda na cor (atraso > em atendimento > executado) */
const piorSituacao = (g: Ponto[]) => g.reduce((s, p) => (ORDEM[p.situacao] > ORDEM[s] ? p.situacao : s), 'ok' as Situacao)

/** Lista do ponto com vários serviços (popup): cada linha abre a Ficha */
function listaDoPonto(g: Ponto[], aoEscolher: (c: string) => void, fechar: () => void): HTMLElement {
  const raiz = document.createElement('div')
  raiz.className = 'lista-ponto'
  const titulo = document.createElement('p')
  titulo.className = 'lista-ponto-titulo'
  titulo.textContent = `${g.length} serviços neste ponto · ${g[0].servico.bairro}`
  raiz.append(titulo)
  for (const p of [...g].sort((a, b) => ORDEM[b.situacao] - ORDEM[a.situacao] || b.dias - a.dias)) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = `lista-ponto-item sit-${p.situacao}`
    b.innerHTML = `<span class="lista-ponto-id">${p.servico.idColab}</span><span class="lista-ponto-cat">${escapar(p.servico.categoria ?? '')}</span><span class="lista-ponto-dias">${quando(p)}</span>`
    b.addEventListener('click', () => {
      fechar()
      aoEscolher(p.servico.chave)
    })
    raiz.append(b)
  }
  return raiz
}

/** Quantos números (elementos da página) de grupo cabem à vista sem pesar no zoom */
const MAX_NUMEROS = 250

/** Diâmetro do grupo: 24 px é o mínimo de alvo de toque (WCAG 2.5.8) */
const tamanhoGrupo = (g: Ponto[]) => (g.length >= 10 ? 28 : 26)

function dicaGrupo(g: Ponto[]) {
  const atrasos = g.filter((x) => x.situacao === 'atraso').length
  return `<strong>${g.length} serviços neste ponto</strong><br>${escapar(g[0].servico.bairro)}${atrasos ? ` · ${atrasos} em atraso` : ''}<br><span class="dica-mapa-acao">Toque para escolher</span>`
}

/** O número em cima do grupo (elemento da página; o toque abre a lista do ponto) */
function marcadorGrupo(g: Ponto[], aoTocar: () => void): L.Marker {
  const tam = tamanhoGrupo(g)
  const sit = piorSituacao(g)
  const riscoAberto = g.some((x) => x.risco && x.situacao !== 'ok')
  const m = L.marker([g[0].lat, g[0].lng], {
    icon: L.divIcon({
      className: '',
      html: `<span class="pino-grupo sit-${sit}${riscoAberto ? ' com-risco' : ''}" style="width:${tam}px;height:${tam}px">${g.length}</span>`,
      iconSize: [tam, tam],
      iconAnchor: [tam / 2, tam / 2],
    }),
    // fora do Tab: os pinos soltos (canvas) não são alcançáveis; quem usa teclado tem a lista do painel ao lado
    keyboard: false,
    title: `${g.length} serviços neste ponto`,
    riseOnHover: true,
  })
  m.bindTooltip(dicaGrupo(g), { direction: 'top', offset: [0, -tam / 2], className: 'dica-mapa' })
  m.on('click', () => {
    m.closeTooltip()
    aoTocar()
  })
  return m
}

function Pinos({
  pontos,
  selecionado,
  aoEscolher,
  chaveEnquadre,
}: {
  pontos: Ponto[]
  selecionado: string | null
  aoEscolher: (chave: string) => void
  chaveEnquadre: string
}) {
  const map = useMap()
  const { tema } = useTema()
  const lateral = useMidia('(min-width: 768px)')
  const renderer = useMemo(() => L.canvas({ padding: 0.5 }), [])
  const primeira = useRef(true)
  const jaPosicionou = useRef(false)
  // enquadramento que não pôde ser feito porque o mapa estava sem tamanho (ver enquadrar)
  const enquadrePendente = useRef<(() => boolean) | null>(null)

  // o espaço do mapa muda (altura medida da página, painel, rotação do celular): o Leaflet precisa saber
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      map.invalidateSize({ pan: false })
      if (enquadrePendente.current?.()) enquadrePendente.current = null
    })
    obs.observe(map.getContainer())
    return () => obs.disconnect()
  }, [map])

  // pinos (refaz quando os pontos ou o tema mudam — as cores vêm das variáveis do tema)
  // Desempenho (17/10/2026): com "todos do período" em "todo o período" (17 mil pontos, ~2 mil lugares com vários)
  // cada grupo era um elemento da página e cada zoom travava ~0,6 s. Agora tudo é desenhado no canvas — o grupo
  // é um círculo maior — e o número em cima (elemento da página) só aparece nos grupos À VISTA quando são até
  // MAX_NUMEROS (aproximou o zoom, os números aparecem). Uma dica só, compartilhada, no lugar de uma por ponto.
  useEffect(() => {
    const cor: Record<Situacao, string> = { ok: cssVar('--c-ok'), andamento: cssVar('--c-andamento'), atraso: cssVar('--c-atraso') }
    const corRisco = cssVar('--c-risco')
    const borda = cssVar('--c-card')
    const desenhados = L.featureGroup()
    const numeros = L.layerGroup()
    const doPino = new WeakMap<L.Layer, Ponto[]>()

    const porLugar = new Map<string, Ponto[]>()
    for (const p of pontos) {
      const k = chaveLugar(p)
      const g = porLugar.get(k)
      if (g) g.push(p)
      else porLugar.set(k, [p])
    }
    const lugares = [...porLugar.values()].sort((a, b) => ORDEM[piorSituacao(a)] - ORDEM[piorSituacao(b)])
    const grupos: { g: Ponto[]; circulo: L.CircleMarker; marcador?: L.Marker }[] = []

    const abrirLista = (g: Ponto[]) => {
      const tam = tamanhoGrupo(g)
      L.popup({ className: 'popup-mapa', maxWidth: 320, minWidth: 240, offset: [0, -tam / 2], autoPanPadding: [24, 24] })
        .setLatLng([g[0].lat, g[0].lng])
        .setContent(listaDoPonto(g, aoEscolher, () => map.closePopup()))
        .openOn(map)
    }

    for (const g of lugares) {
      const p = g[0]
      const sit = piorSituacao(g)
      const riscoAberto = g.some((x) => x.risco && x.situacao !== 'ok')
      const sozinho = g.length === 1
      const circulo = L.circleMarker([p.lat, p.lng], {
        renderer,
        radius: sozinho ? (riscoAberto ? 7 : 5) : tamanhoGrupo(g) / 2,
        color: riscoAberto ? corRisco : borda,
        weight: sozinho ? (riscoAberto ? 2.5 : 1) : riscoAberto ? 2.5 : 2,
        fillColor: cor[sit],
        fillOpacity: 0.92,
      }).addTo(desenhados)
      doPino.set(circulo, g)
      if (!sozinho) grupos.push({ g, circulo })
    }

    // uma dica e um toque para todos os desenhados (antes: uma dica por ponto — 80 mil no cenário Enorme)
    const dica = L.tooltip({ direction: 'top', className: 'dica-mapa' })
    desenhados.on('mouseover', (e) => {
      const g = doPino.get(e.layer)
      if (!g) return
      dica.options.offset = [0, -(g.length > 1 ? tamanhoGrupo(g) / 2 : 6)]
      dica.setLatLng([g[0].lat, g[0].lng]).setContent(g.length > 1 ? dicaGrupo(g) : rotuloPino(g[0]))
      map.openTooltip(dica)
    })
    desenhados.on('mouseout', () => map.closeTooltip(dica))
    desenhados.on('click', (e) => {
      const g = doPino.get(e.layer)
      if (!g) return
      map.closeTooltip(dica)
      if (g.length > 1) abrirLista(g)
      else aoEscolher(g[0].servico.chave)
    })

    // número em cima dos grupos à vista, quando cabem (senão fica só o círculo desenhado)
    const atualizarNumeros = () => {
      const area = map.getBounds().pad(0.1)
      const aVista = grupos.filter(({ g }) => area.contains([g[0].lat, g[0].lng]))
      const comNumero = aVista.length <= MAX_NUMEROS
      const mostrar = new Set(comNumero ? aVista : [])
      for (const item of grupos) {
        // sem número em cima, o grupo é só um pouco maior que o pino sozinho (com 26 px, a cidade inteira virava borrão)
        item.circulo.setRadius(comNumero ? tamanhoGrupo(item.g) / 2 : 7)
        if (mostrar.has(item)) {
          if (!item.marcador) item.marcador = marcadorGrupo(item.g, () => abrirLista(item.g))
          if (!numeros.hasLayer(item.marcador)) numeros.addLayer(item.marcador)
        } else if (item.marcador && numeros.hasLayer(item.marcador)) numeros.removeLayer(item.marcador)
      }
    }

    desenhados.addTo(map)
    numeros.addTo(map)
    atualizarNumeros()
    map.on('moveend', atualizarNumeros)
    return () => {
      map.off('moveend', atualizarNumeros)
      map.closeTooltip(dica)
      desenhados.remove()
      numeros.remove()
    }
  }, [map, pontos, renderer, tema, aoEscolher])

  // reenquadrar quando os filtros/"mostrar" mudam (na 1ª vez sem animação; com serviço escolhido, não)
  useEffect(() => {
    if (selecionado && primeira.current) {
      primeira.current = false
      return
    }
    const animar = !primeira.current
    const fazer = () => enquadrar(map, pontos, animar, map.getSize().x < LARGURA_ESTREITA)
    enquadrePendente.current = fazer() ? null : fazer
    primeira.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando o recorte muda, não a cada ponto
  }, [map, chaveEnquadre])

  // serviço escolhido: voa até ele e marca com um anel
  useEffect(() => {
    if (!selecionado) return
    const p = pontos.find((x) => x.servico.chave === selecionado)
    if (!p) return
    // 1ª vez (chegou com o serviço escolhido): abre direto no pino; depois, voa
    map.invalidateSize({ pan: false })
    voarPara(map, [p.lat, p.lng], Math.max(map.getZoom(), 17), lateral, jaPosicionou.current)
    jaPosicionou.current = true
    const anel = L.circleMarker([p.lat, p.lng], {
      renderer,
      radius: 15,
      color: cssVar('--c-acao'),
      weight: 3,
      fill: false,
      interactive: false,
    }).addTo(map)
    return () => {
      anel.remove()
    }
  }, [map, selecionado, pontos, renderer, lateral])

  return null
}

function Legenda({ porSituacao, risco, empilhados }: { porSituacao: Record<Situacao, number>; risco: number; empilhados: number }) {
  const itens: { s: Situacao; texto: string; classe: string }[] = [
    { s: 'atraso', texto: 'Em atraso', classe: 'bg-atraso' },
    { s: 'andamento', texto: 'Em atendimento', classe: 'bg-andamento' },
    { s: 'ok', texto: 'Executado', classe: 'bg-ok' },
  ]
  return (
    <div className="absolute bottom-6 left-3 z-[500] rounded-lg border border-line bg-card/95 px-3 py-2 text-xs shadow-1 backdrop-blur-sm">
      <ul className="flex flex-col gap-1">
        {itens
          .filter((i) => porSituacao[i.s] > 0)
          .map((i) => (
            <li key={i.s} className="flex items-center gap-2 text-ink-2">
              <span aria-hidden className={`size-2.5 rounded-full ring-1 ring-card ${i.classe}`} />
              {i.texto}
              <span className="numeros ml-auto pl-3 font-medium text-ink">{numero(porSituacao[i.s])}</span>
            </li>
          ))}
        {risco > 0 && (
          <li className="flex items-center gap-2 text-ink-2">
            <span aria-hidden className="size-2.5 rounded-full border-2 border-risco" />
            Risco elétrico
            <span className="numeros ml-auto pl-3 font-medium text-ink">{numero(risco)}</span>
          </li>
        )}
        {empilhados > 0 && (
          <li className="flex items-center gap-2 text-ink-2">
            <span aria-hidden className="grid size-4 place-items-center rounded-full bg-ink-3 text-[9px] font-semibold text-card">n</span>
            Vários no mesmo ponto
          </li>
        )}
      </ul>
    </div>
  )
}

export default function MapaGrande({
  pontos,
  porSituacao,
  risco,
  selecionado,
  aoEscolher,
  chaveEnquadre,
}: {
  pontos: Ponto[]
  porSituacao: Record<Situacao, number>
  risco: number
  selecionado: string | null
  aoEscolher: (chave: string) => void
  chaveEnquadre: string
}) {
  const [mapa, setMapa] = useState<L.Map | null>(null)
  // fundo detalhado (OSM) é preferência de quem olha: lembrado neste navegador
  const [detalhado, setDetalhado] = useState(() => {
    try {
      return localStorage.getItem('mapa-detalhado') === '1'
    } catch {
      return false
    }
  })
  // no celular não há o botão (pouco espaço, e o fundo suave lê melhor numa tela pequena)
  const estreito = !useMidia(`(min-width: ${LARGURA_ESTREITA}px)`)
  const fundoDetalhado = detalhado && !estreito
  const alternarDetalhado = () =>
    setDetalhado((v) => {
      try {
        localStorage.setItem('mapa-detalhado', v ? '0' : '1')
      } catch {
        /* navegação privada: só não lembra */
      }
      return !v
    })
  // só no desenvolvimento: deixa o mapa acessível no console para depurar (window.__mapa)
  useEffect(() => {
    if (import.meta.env.DEV && mapa) (window as unknown as { __mapa?: L.Map }).__mapa = mapa
  }, [mapa])
  const empilhados = useMemo(() => {
    const n = new Map<string, number>()
    for (const p of pontos) n.set(chaveLugar(p), (n.get(chaveLugar(p)) ?? 0) + 1)
    return [...n.values()].filter((v) => v > 1).length
  }, [pontos])

  return (
    // isolate: as camadas do Leaflet (z-index 400+) não passam por cima do cabeçalho fixo
    <div className="relative isolate h-full w-full">
      <MapContainer
        ref={setMapa}
        center={CENTRO_NITEROI}
        zoom={13}
        minZoom={11}
        zoomSnap={0.25}
        zoomDelta={0.5}
        preferCanvas
        className="mapa-tema h-full w-full"
        aria-label="Mapa dos serviços. Setas movem o mapa; mais e menos mudam o zoom. A lista ao lado traz os mesmos serviços."
      >
        <FundoMapa detalhado={fundoDetalhado} />
        <Pinos pontos={pontos} selecionado={selecionado} aoEscolher={aoEscolher} chaveEnquadre={chaveEnquadre} />
      </MapContainer>
      <div className="absolute top-3 right-3 z-[500] flex flex-col items-end gap-2">
        <button type="button" onClick={() => mapa && enquadrar(mapa, pontos, true)} className={botaoMapa}>
          <Maximize aria-hidden className="size-4" />
          Ver todos
        </button>
        {!estreito && (
          <button
            type="button"
            role="switch"
            onClick={alternarDetalhado}
            aria-checked={detalhado}
            title="Mostra comércio, escolas, igrejas e outros pontos de referência"
            className={clsx(botaoMapa, detalhado && 'border-acao/60')}
          >
            <Layers aria-hidden className="size-4" />
            Mapa detalhado
            {/* chave liga/desliga: o estado fica visível sem depender só da cor */}
            <span
              aria-hidden
              className={clsx(
                'relative ml-0.5 inline-flex h-[18px] w-8 shrink-0 rounded-full transition-colors duration-150',
                detalhado ? 'bg-acao' : 'bg-line-input',
              )}
            >
              <span
                className={clsx(
                  'absolute top-[2px] left-[2px] size-[14px] rounded-full bg-white shadow-1 transition-transform duration-150 ease-out motion-reduce:transition-none',
                  detalhado && 'translate-x-[14px]',
                )}
              />
            </span>
          </button>
        )}
      </div>
      <Legenda porSituacao={porSituacao} risco={risco} empilhados={empilhados} />
    </div>
  )
}
