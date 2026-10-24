// Busca rápida (atalho "/" ou Ctrl+K). Sem animação de abrir/fechar: é usada o tempo todo.
// Público: nº do serviço e rua (nome padronizado, sem número). Com acesso: endereço (com número) e local.
// Sem bairro e região (usuário, 24/10/2026: listavam alguns e não ajudavam — para isso há os filtros). Cada resultado
// diz a situação do serviço (antes, achar pelo endereço obrigava a abrir um por um para ver se já foi feito) e, ao
// abrir a ficha, a busca guarda o texto e volta aberta quando a ficha fecha (antes sumia e era preciso digitar de novo).
// Casa por palavras, em qualquer ordem, sem acento/maiúscula e tolerando erro de digitação (casar.ts).
// Busca de rua por texto aproximado — vira agrupada por rua normalizada depois do item 3 do roadmap.
import { Dialog } from '@base-ui/react/dialog'
import { Command } from 'cmdk'
import { ArrowRight, Hash, MapPin, Search } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent as TeclaReact } from 'react'
import { useNavigate } from 'react-router'
import { useInterface } from '@/componentes/layout/interface'
import { useBase, useDetalhes } from '@/dados/consultas'
import { enderecoCurto, situacao, ultimaSaida } from '@/dados/regras'
import type { Servico } from '@/dados/tipos'
import { normalizarBusca } from '@/lib/formato'
import { buscar, criarIndice, prepararConsulta } from './casar'
import { useDestino, useFicha, useHoje } from '@/lib/ganchos'
import { SeloSituacao } from '@/componentes/ui/SeloSituacao'

const LIMITE = 8
/** por endereço/rua vêm mais: a pessoa compara vários do mesmo lugar pela situação */
const LIMITE_ENDERECO = 15

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
  const { chave: fichaAberta, abrir } = useFicha()
  const hoje = useHoje()
  const navegar = useNavigate()
  const destino = useDestino()
  const [texto, setTexto] = useState('')

  useAtalhoTeclado(() => setBuscaAberta(true))

  // abriu a ficha por um resultado: quando a ficha fechar, a busca volta com o mesmo texto e a mesma lista
  const voltar = useRef(false)
  const fichaAntes = useRef(fichaAberta)
  useEffect(() => {
    if (fichaAntes.current && !fichaAberta && voltar.current) {
      voltar.current = false
      setBuscaAberta(true)
    }
    fichaAntes.current = fichaAberta
  }, [fichaAberta, setBuscaAberta])

  // índice montado uma vez: com acesso, endereço e local de cada serviço; sem, a rua (pública, sem número) e o bairro
  const indiceEndereco = useMemo(() => {
    if (!base) return null
    // texto: onde a busca procura (inteiro: o bairro do fim do endereço também acha); mostrar: o que aparece (sem
    // " - Bairro, Niterói - RJ, CEP", que repetia o bairro da linha de baixo)
    const r: { servico: Servico; texto: string; mostrar: string }[] = []
    if (acesso && detalhes) {
      for (const [chave, d] of detalhes) {
        const s = base.porChave.get(chave)
        if (!s) continue
        const t = [d.endereco, d.local].filter(Boolean).join(' · ')
        if (t) r.push({ servico: s, texto: t, mostrar: [d.endereco && enderecoCurto(d.endereco), d.local].filter(Boolean).join(' · ') })
      }
    } else {
      for (const s of base.servicos) if (s.rua) r.push({ servico: s, texto: `${s.rua} · ${s.bairro}`, mostrar: s.rua })
    }
    return criarIndice(r, (e) => e.texto)
  }, [acesso, detalhes, base])

  // a lista acompanha a digitação sem travar o campo (a conta roda logo depois de cada tecla)
  const textoBusca = useDeferredValue(texto)
  const resultado = useMemo(() => {
    const q = normalizarBusca(textoBusca)
    if (!base || q.length < 2) return null
    const soNumero = /^\d+$/.test(q)
    if (soNumero) return { servicos: base.servicos.filter((s) => String(s.idColab).startsWith(q)).slice(0, LIMITE), enderecos: [] }
    return { servicos: [], enderecos: indiceEndereco ? buscar(indiceEndereco, prepararConsulta(textoBusca), LIMITE_ENDERECO) : [] }
  }, [textoBusca, base, indiceEndereco])

  // fechar de propósito (Fechar, Esc, fora): esquece o texto
  const fechar = () => {
    voltar.current = false
    setBuscaAberta(false)
    setTexto('')
  }
  // a lista inteira na página Serviços, já com o texto da busca
  const verTodos = () => {
    const q = texto.trim()
    fechar()
    navegar(destino('/servicos', { q }))
  }
  // abrir a ficha de um resultado: fecha sem esquecer, para voltar quando a ficha fechar
  const abrirFicha = (chave: string) => {
    voltar.current = true
    setBuscaAberta(false)
    abrir(chave)
  }
  // Enter (usuário, 24/10/2026): sem ter escolhido um item com as setas, abre a lista completa na página Serviços (só
  // a equipe tem a página; sem acesso, abre o 1º, como antes); número exato de serviço abre a ficha dele
  const escolheu = useRef(false)
  const temTodos = acesso === true && !!resultado && resultado.servicos.length + resultado.enderecos.length > 0
  const aoTeclar = (e: TeclaReact<HTMLDivElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') escolheu.current = true
    if (e.key !== 'Enter' || escolheu.current || !resultado) return
    const q = normalizarBusca(texto)
    const exato = /^\d+$/.test(q) ? resultado.servicos.find((s) => String(s.idColab) === q) : undefined
    if (exato) {
      e.preventDefault()
      abrirFicha(exato.chave)
    } else if (temTodos) {
      e.preventDefault()
      verTodos()
    }
  }

  const item = 'flex min-h-11 cursor-default items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-ink outline-none data-[selected=true]:bg-acao-suave'
  const grupo = '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-[0.4px] [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:uppercase'

  return (
    <Dialog.Root open={buscaAberta} onOpenChange={(v) => (v ? setBuscaAberta(true) : fechar())}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30" />
        {/* ao fechar, o foco volta ao botão Buscar (aberta pelo "/", não havia para onde voltar e ele se perdia) */}
        <Dialog.Popup
          finalFocus={() => document.querySelector<HTMLElement>('[data-gatilho-busca]')}
          className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-xl overflow-hidden border-line bg-card shadow-2 sm:top-[12vh] sm:rounded-2xl sm:border"
        >
          <Dialog.Title className="sr-only">Buscar</Dialog.Title>
          <Command shouldFilter={false} label="Buscar" onKeyDown={aoTeclar} className="flex max-h-[80dvh] flex-col">
            {/* foco visível no campo: a linha de baixo vira índigo */}
            <div className="flex items-center gap-2 border-b-2 border-line px-4 pt-[env(safe-area-inset-top,0px)] focus-within:border-acao">
              <Search aria-hidden className="size-4 shrink-0 text-ink-3" />
              <Command.Input
                value={texto}
                onValueChange={(v) => {
                  escolheu.current = false
                  setTexto(v)
                }}
                placeholder={acesso ? 'Nº do serviço, rua ou endereço…' : 'Nº do serviço ou rua…'}
                className="h-14 w-full bg-transparent text-ink outline-none placeholder:text-ink-3"
              />
              <Dialog.Close className="h-10 shrink-0 px-2 text-[13px] text-ink-2 hover:text-ink">Fechar</Dialog.Close>
            </div>
            <Command.List className="overflow-y-auto overscroll-contain p-2">
              {resultado === null ? (
                <p className="px-3 py-6 text-center text-[13px] text-ink-3">
                  Digite ao menos 2 letras ou o número do serviço.
                  {!acesso && <span className="mt-1 block text-xs">Endereço com número: só para usuários autorizados.</span>}
                </p>
              ) : (
                <>
                  <Command.Empty className="px-3 py-6 text-center text-[13px] text-ink-3">Nada encontrado para “{texto}”.</Command.Empty>
                  {resultado.servicos.length > 0 && (
                    <Command.Group heading="Serviços" className={grupo}>
                      {resultado.servicos.map((s) => (
                        <Command.Item key={s.chave} value={`s-${s.chave}`} onSelect={() => abrirFicha(s.chave)} className={item}>
                          <Hash aria-hidden className="size-4 shrink-0 text-ink-3" />
                          <span className="numeros font-medium">{s.idColab}</span>
                          <span className="min-w-0 flex-1 truncate text-ink-2">
                            {s.categoria ?? 'Sem categoria'} · {s.bairro}
                          </span>
                          <SeloSituacao situacao={situacao(ultimaSaida(s.saidas), hoje)} />
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {resultado.enderecos.length > 0 && (
                    <Command.Group heading={acesso ? 'Endereços' : 'Ruas'} className={grupo}>
                      {resultado.enderecos.map((e) => (
                        <Command.Item
                          key={e.servico.chave}
                          value={`e-${e.servico.chave}`}
                          onSelect={() => abrirFicha(e.servico.chave)}
                          className={item}
                        >
                          <MapPin aria-hidden className="size-4 shrink-0 text-ink-3" />
                          {/* endereço em até 2 linhas (cortado em 1, o bairro, que muitas vezes é o que bateu, sumia); embaixo,
                              o número, a categoria e o bairro; à direita, a situação — para não abrir um por um */}
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 leading-snug">{e.mostrar}</span>
                            <span className="mt-0.5 block truncate text-xs text-ink-3">
                              <span className="numeros font-medium text-ink-2">{e.servico.idColab}</span> · {e.servico.categoria ?? 'Sem categoria'}
                              {` · ${e.servico.bairro}`}
                            </span>
                          </span>
                          <SeloSituacao situacao={situacao(ultimaSaida(e.servico.saidas), hoje)} />
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {/* a busca rápida mostra poucos: a lista inteira (de qualquer data, com a situação) fica na página Serviços */}
                  {temTodos && (
                    <Command.Item value="ver-todos" onSelect={verTodos} className={item}>
                      <ArrowRight aria-hidden className="size-4 shrink-0 text-acao" />
                      <span className="flex-1 text-acao">Ver todos para “{texto.trim()}” na página Serviços</span>
                      {/* a dica do Enter só onde há teclado (mouse/trackpad) */}
                      <kbd className="hidden rounded border border-line px-1.5 font-sans text-[11px] text-ink-3 [@media(pointer:fine)]:inline">Enter</kbd>
                    </Command.Item>
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
