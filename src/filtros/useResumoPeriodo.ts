import { useHoje } from '@/lib/ganchos'
import { intervaloDo } from './filtros'
import { useFiltros } from './useFiltros'

/** "Últimos 30 dias · por retorno" */
export function useResumoPeriodo() {
  const { filtros } = useFiltros()
  const hoje = useHoje()
  const i = intervaloDo(filtros.periodo, hoje)
  return `${i.rotulo}${filtros.contarPor === 'retorno' ? ' · por retorno' : ''}`
}
