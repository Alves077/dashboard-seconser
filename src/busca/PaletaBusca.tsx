// Busca rápida (atalho "/" ou Ctrl+K). Sem animação de abrir/fechar: é usada o tempo todo.
// Público: nº do serviço, bairro, região. Com acesso: também endereço e local.
// Busca de rua por texto aproximado — vira agrupada por rua normalizada depois do item 3 do roadmap.
import { Dialog } from '@base-ui/react/dialog'
import { Command } from 'cmdk'
import { Hash, Map as MapaIcone, MapPin, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useInterface } from '@/componentes/layout/interface'
import { useBase, useDetalhes } from '@/dados/consultas'
import { situacao, ultimaSaida } from '@/dados/regras'
import type { Servico } from '@/dados/tipos'
import { useFiltros } from '@/filtros/useFiltros'
import { normalizarBusca, numero } from '@/lib/formato'
import { useFicha, useHoje } from '@/lib/ganchos'
import { SeloSituacao } from '@/componentes/ui/SeloSituacao'

const LIMITE = 8

function useAtalhoTeclado(abrir: () => void) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      const digitando = alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)
      if ((e.key === '/' && !digitando) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        abrir()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [abrir])
}

export function PaletaBusca() {
  const { buscaAberta, setBuscaAberta } = useInterface()
  const { data: base } = useBase()
  const { data: detalhes, acesso } = useDetalhes()
  const { abrir } = useFicha()
  const { mudar } = useFiltros()
  const hoje = useHoje()
  const [texto, setTexto] = useState('')

  useAtalhoTeclado(() => setBuscaAberta(true))

  // índice de endereços normalizados (só com acesso), montado uma vez
  const indiceEndereco = useMemo(() => {
    if (!acesso || !detalhes || !base) return []
    const r: { servico: Servico; alvo: string; texto: string }[] = []
    for (const [chave, d] of detalhes) {
      const s = base.porChave.get(chave)
      if (!s) continue
      const t = [d.endereco, d.local].filter(Boolean).join(' · ')
      if (t) r.push({ servico: s, alvo: normalizarBusca(t), texto: t })
    }
    return r
  }, [acesso, detalhes, base])

  const resultado = useMemo(() => {
    const q = normalizarBusca(texto)
    if (!base || q.length < 2) return null
    const soNumero = /^\d+$/.test(q)
    const servicos = soNumero
      ? base.servicos.filter((s) => String(s.idColab).startsWith(q)).slice(0, LIMITE)
      : []
    const bairros = soNumero
      ? []
      : base.bairros.filter((b) => normalizarBusca(b.nome).includes(q)).slice(0, LIMITE)
    const regioes = soNumero ? [] : [...new Set(base.bairros.map((b) => b.regiao))].filter((r) => normalizarBusca(r).includes(q))
    const enderecos = soNumero ? [] : indiceEndereco.filter((e) => e.alvo.includes(q)).slice(0, LIMITE)
    return { servicos, bairros, regioes, enderecos }
  }, [texto, base, indiceEndereco])

  const fechar = () => {
    setBuscaAberta(false)
    setTexto('')
  }
  const contarServicos = (campo: 'bairro' | 'regiao', valor: string) =>
    base ? base.servicos.filter((s) => s[campo] === valor).length : 0

  const item = 'flex min-h-11 cursor-default items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-ink outline-none data-[selected=true]:bg-acao-suave'
  const grupo = '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-[0.4px] [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:uppercase'

  return (
    <Dialog.Root open={buscaAberta} onOpenChange={(v) => (v ? setBuscaAberta(true) : fechar())}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Popup className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-xl overflow-hidden border-line bg-card shadow-2 sm:top-[12vh] sm:rounded-2xl sm:border">
          <Dialog.Title className="sr-only">Buscar</Dialog.Title>
          <Command shouldFilter={false} label="Buscar" className="flex max-h-[80dvh] flex-col">
            <div className="flex items-center gap-2 border-b border-line px-4 pt-[env(safe-area-inset-top,0px)]">
              <Search aria-hidden className="size-4 shrink-0 text-ink-3" />
              <Command.Input
                value={texto}
                onValueChange={setTexto}
                placeholder={acesso ? 'Nº do serviço, bairro, região, rua ou endereço…' : 'Nº do serviço, bairro ou região…'}
                className="h-14 w-full bg-transparent text-ink outline-none placeholder:text-ink-3"
              />
              <Dialog.Close className="h-10 shrink-0 px-2 text-[13px] text-ink-2 hover:text-ink">Fechar</Dialog.Close>
            </div>
            <Command.List className="overflow-y-auto overscroll-contain p-2">
              {resultado === null ? (
                <p className="px-3 py-6 text-center text-[13px] text-ink-3">
                  Digite ao menos 2 letras ou o número do serviço.
                  {!acesso && <span className="mt-1 block text-xs">Busca por rua e endereço: só para usuários autorizados.</span>}
                </p>
              ) : (
                <>
                  <Command.Empty className="px-3 py-6 text-center text-[13px] text-ink-3">Nada encontrado para “{texto}”.</Command.Empty>
                  {resultado.servicos.length > 0 && (
                    <Command.Group heading="Serviços" className={grupo}>
                      {resultado.servicos.map((s) => (
                        <Command.Item key={s.chave} value={`s-${s.chave}`} onSelect={() => (fechar(), abrir(s.chave))} className={item}>
                          <Hash aria-hidden className="size-4 shrink-0 text-ink-3" />
                          <span className="numeros font-medium">{s.idColab}</span>
                          <span className="min-w-0 flex-1 truncate text-ink-2">
                            {s.categoria} · {s.bairro}
                          </span>
                          <SeloSituacao situacao={situacao(ultimaSaida(s.saidas), hoje)} />
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {resultado.regioes.length > 0 && (
                    <Command.Group heading="Regiões" className={grupo}>
                      {resultado.regioes.map((r) => (
                        <Command.Item key={r} value={`r-${r}`} onSelect={() => (fechar(), mudar({ regiao: r }))} className={item}>
                          <MapaIcone aria-hidden className="size-4 shrink-0 text-ink-3" />
                          <span className="flex-1">{r}</span>
                          <span className="numeros text-xs text-ink-3">{numero(contarServicos('regiao', r))} serviços</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {resultado.bairros.length > 0 && (
                    <Command.Group heading="Bairros" className={grupo}>
                      {resultado.bairros.map((b) => (
                        <Command.Item
                          key={b.id}
                          value={`b-${b.id}`}
                          onSelect={() => (fechar(), mudar({ regiao: b.regiao, bairro: b.nome }))}
                          className={item}
                        >
                          <MapPin aria-hidden className="size-4 shrink-0 text-ink-3" />
                          <span className="flex-1">
                            {b.nome} <span className="text-ink-3">· {b.regiao}</span>
                          </span>
                          <span className="numeros text-xs text-ink-3">{numero(contarServicos('bairro', b.nome))} serviços</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {resultado.enderecos.length > 0 && (
                    <Command.Group heading="Endereços" className={grupo}>
                      {resultado.enderecos.map((e) => (
                        <Command.Item
                          key={e.servico.chave}
                          value={`e-${e.servico.chave}`}
                          onSelect={() => (fechar(), abrir(e.servico.chave))}
                          className={item}
                        >
                          <MapPin aria-hidden className="size-4 shrink-0 text-ink-3" />
                          <span className="min-w-0 flex-1 truncate">{e.texto}</span>
                          <span className="numeros text-xs text-ink-3">{e.servico.idColab}</span>
                        </Command.Item>
                      ))}
                      <p className="px-3 pt-1 pb-2 text-xs text-ink-3">
                        A mesma rua pode aparecer escrita de jeitos diferentes até a normalização dos endereços.
                      </p>
                    </Command.Group>
                  )}
                </>
              )}
            </Command.List>
          </Command>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
