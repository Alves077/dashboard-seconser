import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { escreverFiltros, FILTROS_PADRAO, lerFiltros, type Filtros } from './filtros'

/** Filtros globais lidos/escritos na URL (#/rota?periodo=…&regiao=…) */
export function useFiltros() {
  const [params, setParams] = useSearchParams()
  const filtros = useMemo(() => lerFiltros(params), [params])

  const mudar = useCallback(
    (parcial: Partial<Filtros>) => {
      setParams((atual) => {
        const f = { ...lerFiltros(atual), ...parcial }
        // bairro só faz sentido dentro da região escolhida
        if (parcial.regiao !== undefined && parcial.bairro === undefined) f.bairro = null
        return escreverFiltros(f, atual)
      })
    },
    [setParams],
  )

  const limpar = useCallback(() => setParams((atual) => escreverFiltros(FILTROS_PADRAO, atual)), [setParams])

  return { filtros, mudar, limpar }
}
