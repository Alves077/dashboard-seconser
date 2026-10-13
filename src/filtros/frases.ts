// Frases do período usadas no topo das páginas ("Nos últimos 30 dias", "vs. set/26").
import type { Intervalo, Periodo } from './filtros'
import { chaveMes, fimDoMes, inicioDoMes, rotuloMes } from '@/lib/datas'

/** "ago/26" quando o período anterior é um mês inteiro; senão "período anterior" */
export function rotuloComparacao(a: Intervalo | null): string | null {
  if (!a || a.de === null || a.ate === null) return null
  const mesInteiro = a.de === inicioDoMes(a.de) && a.ate === fimDoMes(a.de)
  return mesInteiro ? rotuloMes(chaveMes(a.de)) : 'período anterior'
}

/** "Nos últimos 30 dias", "Em setembro de 2026", "Neste ano"… (português natural, não "Em últimos 30 dias") */
export function fraseQuando(p: Periodo, i: Intervalo, primeiraSaida: number | null): string {
  if (p.tipo === 'mes') return `Em ${i.rotulo}`
  if (p.tipo === 'intervalo') return `De ${i.rotulo}`
  switch (p.atalho) {
    case 'tudo':
      return `Desde ${primeiraSaida !== null ? rotuloMes(chaveMes(primeiraSaida)) : 'o início'}`
    case '7d':
    case '30d':
    case '90d':
      return `Nos últimos ${parseInt(p.atalho)} dias`
    case '3m':
    case '6m':
    case '12m':
      return `Nos últimos ${parseInt(p.atalho)} meses fechados`
    case 'este-mes':
      return 'Neste mês'
    case 'este-ano':
      return 'Neste ano'
    case 'mes-anterior':
      return `Em ${i.rotulo}`
  }
}
