// Cada página é um arquivo à parte: quem abre o Panorama não baixa o código do Prazo, da Evolução etc.
// Depois que a primeira página aparece, as outras são baixadas em segundo plano (preCarregarPaginas),
// para a troca de página continuar instantânea. Se um arquivo de página sumir (versão nova publicada
// com a aba aberta), quem trata é a ErroPagina (recarrega uma vez).
import { lazy } from 'react'

const importadores = {
  Panorama: () => import('./Panorama').then((m) => ({ default: m.Panorama })),
  Mapa: () => import('./Mapa').then((m) => ({ default: m.Mapa })),
  Prazo: () => import('./Prazo').then((m) => ({ default: m.Prazo })),
  Evolucao: () => import('./Evolucao').then((m) => ({ default: m.Evolucao })),
  Relatorios: () => import('./Relatorios').then((m) => ({ default: m.Relatorios })),
}

export const Panorama = lazy(importadores.Panorama)
export const Mapa = lazy(importadores.Mapa)
export const Prazo = lazy(importadores.Prazo)
export const Evolucao = lazy(importadores.Evolucao)
export const Relatorios = lazy(importadores.Relatorios)

let jaPediu = false

/** Baixa as outras páginas quando o navegador estiver ocioso (uma vez só). Falha aqui não importa:
 *  a página é pedida de novo quando for aberta. */
export function preCarregarPaginas() {
  if (jaPediu) return
  jaPediu = true
  const baixar = () => Object.values(importadores).forEach((f) => f().catch(() => {}))
  if ('requestIdleCallback' in window) window.requestIdleCallback(baixar, { timeout: 5000 })
  else setTimeout(baixar, 2000)
}
