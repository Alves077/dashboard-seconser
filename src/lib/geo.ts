// Distância entre pinos. A rua sozinha engana: avenida e estrada longas têm o "mesmo nome" a quilômetros de
// distância (decisão do usuário, 17/10/2026) — para "o que dá para fazer na mesma ida", vale a distância.

/** Raio de "perto daqui": ~3 quarteirões, uma caminhada curta com a escada no carro */
export const RAIO_PERTO_M = 300

/** Distância em metros entre dois pontos (fórmula de haversine; na escala de Niterói o erro é desprezível) */
export function distanciaM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLng = (lng2 - lng1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a))
}

/** "80 m", "1,2 km" */
export function formatarDistancia(m: number): string {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`
  return `${(m / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
}
