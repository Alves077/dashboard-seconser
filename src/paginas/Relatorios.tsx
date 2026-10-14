// Relatórios — "O que levo para a reunião / para a rua?". Três folhas A4 (na tela e na impressão,
// que o navegador salva em PDF): o relatório mensal / histórico completo (o mesmo do site antigo, com
// o seu seletor de mês), os serviços em aberto e a lista de campo. Aba e mês ficam na URL
// (?relatorio=…&mes=…), dá para mandar o link. Valem os filtros de região, bairro, categoria e origem.
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { ClipboardList, FileText, Link2, ListTodo, LogIn, Printer, Share2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { EstadoErro, EstadoRestrito, Esqueleto } from '@/componentes/estados/Estados'
import { useInterface } from '@/componentes/layout/interface'
import { Botao } from '@/componentes/ui/Botao'
import { Card } from '@/componentes/ui/Card'
import { Selecao } from '@/componentes/ui/Selecao'
import { listaCampo, mesesDoRelatorio, relatorioAbertos, relatorioMensal } from '@/calculos/relatorios'
import { useBase, useDetalhes } from '@/dados/consultas'
import { useSessao } from '@/dados/sessao'
import { useFiltros } from '@/filtros/useFiltros'
import { formatarDia, rotuloMesLongo, type ChaveMes } from '@/lib/datas'
import { numero } from '@/lib/formato'
import { useHoje, useMidia } from '@/lib/ganchos'
import { RelatorioAbertosFolha } from './relatorios/Abertos'
import { ListaCampoFolha } from './relatorios/Campo'
import { CabecalhoFolha, Folha, useImpressaoClara } from './relatorios/Folha'
import { RelatorioMensalFolha } from './relatorios/Mensal'

type Aba = 'mensal' | 'abertos' | 'campo'

const ABAS: { id: Aba; nome: string; icone: typeof FileText; descricao: string }[] = [
  { id: 'mensal', nome: 'Mensal', icone: FileText, descricao: 'Para reunião e prestação de contas: o relatório de um mês fechado ou o histórico completo. Escolha o mês aqui (o período do filtro não vale nesta aba).' },
  { id: 'abertos', nome: 'Em aberto', icone: ListTodo, descricao: 'A fila de hoje da cidade, de uma região ou de um bairro (escolha nos filtros). Não depende do período.' },
  { id: 'campo', nome: 'Lista de campo', icone: ClipboardList, descricao: 'Para levar à rua: os abertos por região e bairro, mais antigos primeiro, com espaço para anotar o retorno.' },
]

/** Observações do relatório do período: lembradas neste navegador, por período e escopo */
function useObservacao(chave: string) {
  const [valores, setValores] = useState<Record<string, string>>({})
  const ler = (k: string) => {
    try {
      return localStorage.getItem(`obs-relatorio:${k}`) ?? ''
    } catch {
      return ''
    }
  }
  const valor = valores[chave] ?? ler(chave)
  const mudar = (v: string) => {
    setValores((x) => ({ ...x, [chave]: v }))
    try {
      if (v.trim()) localStorage.setItem(`obs-relatorio:${chave}`, v)
      else localStorage.removeItem(`obs-relatorio:${chave}`)
    } catch {
      /* navegação privada: só não lembra */
    }
  }
  return [valor, mudar] as const
}

/**
 * Relatórios são ferramenta da equipe da DIP (reunião e rua): só com acesso à parte restrita.
 * O menu já esconde a página (usePaginas); quem chega pelo link vê esta tela com o botão de entrar,
 * e depois de entrar a página aparece sozinha (o acesso muda e o componente redesenha).
 */
export function Relatorios() {
  const { modo, usuario } = useSessao()
  const { acesso } = useDetalhes()
  const { setLoginAberto } = useInterface()
  if (acesso === true) return <PaginaRelatorios />
  return (
    <>
      <h1 className="mb-5 text-2xl font-normal tracking-[-0.4px] text-ink">Relatórios</h1>
      <Card>
        {acesso === undefined ? (
          <div aria-busy="true" className="flex min-h-72 flex-col items-center justify-center gap-3">
            <Esqueleto className="size-10 rounded-full" />
            <Esqueleto className="h-4 w-56" />
          </div>
        ) : (
          <EstadoRestrito
            titulo="Relatórios são para a equipe da DIP"
            texto={
              usuario
                ? 'Sua conta não tem acesso a esta parte. Fale com o administrador.'
                : 'Entre com a sua conta para imprimir o relatório mensal, os serviços em aberto e a lista de campo.'
            }
            acao={
              !usuario &&
              modo === 'supabase' && (
                <Botao variante="primario" tamanho="compacto" onClick={() => setLoginAberto(true)}>
                  <LogIn aria-hidden className="size-4" /> Entrar
                </Botao>
              )
            }
            altura="min-h-72"
          />
        )}
      </Card>
    </>
  )
}

function PaginaRelatorios() {
  useImpressaoClara()
  const [params, setParams] = useSearchParams()
  const aba: Aba = (['mensal', 'abertos', 'campo'] as const).find((a) => a === params.get('relatorio')) ?? 'mensal'
  const soAtraso = params.get('campo') === 'atraso'
  const trocar = (chave: string, valor: string | null) =>
    setParams((p) => {
      const n = new URLSearchParams(p)
      if (valor === null) n.delete(chave)
      else n.set(chave, valor)
      return n
    })

  const { data: base, isLoading, error, refetch } = useBase()
  // a página só abre com acesso (ver Relatorios acima): os detalhes (endereço) estão sempre disponíveis
  const { data: detalhes, acesso } = useDetalhes()
  const { filtros } = useFiltros()
  const hoje = useHoje()

  const escopo = [filtros.bairro ?? filtros.regiao, filtros.categoria, filtros.quem ?? filtros.origem].filter(Boolean).join(' · ') || 'Cidade inteira'
  // mês de referência (como no antigo): meses fechados, o mais recente por padrão; "tudo" = histórico completo
  const meses = useMemo(() => (base ? mesesDoRelatorio(base, hoje) : []), [base, hoje])
  const paramMes = params.get('mes')
  const mes: ChaveMes | null = paramMes === 'tudo' ? null : meses.find((k) => String(k) === paramMes) ?? meses[0] ?? null
  const [obs, setObs] = useObservacao(JSON.stringify([mes ?? 'tudo', escopo]))

  const mensal = useMemo(() => (base && aba === 'mensal' ? relatorioMensal(base, filtros, mes, hoje) : null), [base, filtros, hoje, aba, mes])
  const abertos = useMemo(() => (base && aba === 'abertos' ? relatorioAbertos(base, filtros, hoje) : null), [base, filtros, hoje, aba])
  const campo = useMemo(() => (base && aba === 'campo' ? listaCampo(base, filtros, hoje, soAtraso) : null), [base, filtros, hoje, aba, soAtraso])

  const atual = ABAS.find((a) => a.id === aba)!
  // hora em que a página foi aberta (fica no cabeçalho do relatório)
  const [agora] = useState(() => new Date())
  const geradoEm = `Gerado em ${formatarDia(hoje)} às ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
  const dadosAte = base?.atualizadoEm ? `Dados até ${base.atualizadoEm.toLocaleDateString('pt-BR')} (última carga)` : null
  const comEndereco = aba !== 'mensal' && acesso === true ? (detalhes ?? null) : null
  const geradoLongo = `Gerado em ${agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`

  // compartilhar = o link desta tela (aba, mês e filtros vão na URL); quem abre precisa entrar com a conta
  const celular = useMidia('(max-width: 767px)')
  const podeCompartilhar = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const tituloCompartilhar =
    aba === 'mensal'
      ? `Relatório ${mes === null ? 'histórico' : rotuloMesLongo(mes)} · ${escopo}`
      : `${aba === 'abertos' ? 'Serviços em aberto' : 'Lista de campo'} · ${escopo}`
  const compartilhar = async () => {
    try {
      await navigator.share({ title: tituloCompartilhar, text: `${tituloCompartilhar} — painel da DIP (entrar com a conta)`, url: window.location.href })
    } catch {
      /* a pessoa fechou a janela de compartilhar: nada a fazer */
    }
  }
  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copiado. Quem abrir precisa entrar com a conta da DIP.')
    } catch {
      toast.error('Não deu para copiar. Copie o endereço da barra do navegador.')
    }
  }

  return (
    <>
      <header className="mb-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-normal tracking-[-0.4px] text-ink">Relatórios</h1>
          {/* celular: compartilhar o link (janela nativa: WhatsApp, e-mail…) é o principal, o PDF fica ao lado;
              computador: imprimir/PDF é o principal, com "copiar link" ao lado */}
          {celular && podeCompartilhar ? (
            <div className="flex gap-2">
              <Botao variante="secundario" onClick={() => window.print()} disabled={!base} aria-label="Imprimir ou salvar PDF">
                <Printer aria-hidden className="size-4" />
                PDF
              </Botao>
              <Botao variante="primario" onClick={compartilhar} disabled={!base}>
                <Share2 aria-hidden className="size-4" />
                Compartilhar
              </Botao>
            </div>
          ) : (
            <div className="flex gap-2">
              <Botao variante="secundario" onClick={copiarLink} aria-label="Copiar o link deste relatório">
                <Link2 aria-hidden className="size-4" />
                Copiar link
              </Botao>
              <Botao variante="primario" onClick={() => window.print()} disabled={!base}>
                <Printer aria-hidden className="size-4" />
                Imprimir ou salvar PDF
              </Botao>
            </div>
          )}
        </div>
        <ToggleGroup
          aria-label="Relatório"
          value={[aba]}
          onValueChange={(v) => v[0] && trocar('relatorio', v[0] === 'mensal' ? null : (v[0] as string))}
          className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1 sm:inline-grid sm:w-auto"
        >
          {ABAS.map(({ id, nome, icone: Icone }) => (
            <Toggle
              key={id}
              value={id}
              className="pressionavel flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-[12px] text-ink-2 hover:text-ink data-pressed:bg-acao data-pressed:font-medium data-pressed:text-sobre-acao sm:flex-row sm:gap-2 sm:text-[13px]"
            >
              <Icone aria-hidden className="size-4" />
              {nome}
            </Toggle>
          ))}
        </ToggleGroup>
        <p className="mt-3 text-[13px] text-ink-2">{atual.descricao}</p>

        {aba === 'mensal' && meses.length > 0 && (
          <Selecao
            rotulo="Mês de referência"
            className="mt-3 w-full max-w-64"
            opcoes={[{ valor: 'tudo', texto: 'Histórico completo' }, ...meses.map((k) => ({ valor: String(k), texto: rotuloMesLongo(k) }))]}
            value={mes === null ? 'tudo' : String(mes)}
            onChange={(e) => trocar('mes', e.target.value)}
          />
        )}

        {aba === 'campo' && (
          <ToggleGroup
            aria-label="Quais serviços"
            value={[soAtraso ? 'atraso' : 'todos']}
            onValueChange={(v) => v[0] && trocar('campo', v[0] === 'atraso' ? 'atraso' : null)}
            className="mt-3 flex h-9 w-fit items-center rounded-full border border-line bg-page p-0.5"
          >
            {[
              { v: 'todos', t: 'Todos em aberto' },
              { v: 'atraso', t: 'Só em atraso' },
            ].map((o) => (
              <Toggle
                key={o.v}
                value={o.v}
                className="pressionavel h-full rounded-full px-3 text-xs text-ink-2 data-pressed:bg-card data-pressed:font-medium data-pressed:text-ink data-pressed:shadow-1"
              >
                {o.t}
              </Toggle>
            ))}
          </ToggleGroup>
        )}

      </header>

      {error ? (
        <Card>
          <EstadoErro erro={error} aoTentar={() => refetch()} altura="min-h-72" />
        </Card>
      ) : isLoading || !base ? (
        <Folha>
          <div aria-busy="true">
            <Esqueleto className="h-6 w-64" />
            <Esqueleto className="mt-2 h-3 w-80 max-w-full" />
            <div className="mt-6 grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Esqueleto key={i} className="h-16" />
              ))}
            </div>
            <Esqueleto className="mt-6 h-40 w-full" />
          </div>
        </Folha>
      ) : (
        <Folha>
          {aba === 'mensal' && mensal && (
            <>
              <CabecalhoFolha
                titulo={mensal.todos ? 'Visão Geral · Todo o Período' : `Relatório Mensal · ${rotuloMesLongo(mensal.mes!)}`}
                subtitulo={escopo === 'Cidade inteira' ? undefined : escopo}
                meta={[geradoLongo, `${numero(mensal.total)} serviços ${mensal.todos ? 'no período' : 'registrados no mês'}`, dadosAte].filter(Boolean)}
              />
              <RelatorioMensalFolha r={mensal} obs={obs} aoMudarObs={setObs} />
            </>
          )}
          {aba === 'abertos' && abertos && (
            <>
              <CabecalhoFolha
                titulo={`Serviços em Aberto · ${filtros.bairro ? `Bairro ${filtros.bairro}` : filtros.regiao ? `Região ${filtros.regiao}` : 'Niterói'}`}
                subtitulo={[filtros.categoria, filtros.quem ?? filtros.origem].filter(Boolean).join(' · ') || undefined}
                meta={[geradoLongo, `${numero(abertos.n)} serviços em aberto`, dadosAte].filter(Boolean)}
              />
              <RelatorioAbertosFolha r={abertos} detalhes={comEndereco} hoje={hoje} />
            </>
          )}
          {aba === 'campo' && campo && (
            <>
              <CabecalhoFolha
                titulo={`Lista de campo · ${escopo}`}
                subtitulo={soAtraso ? 'Só os serviços em atraso (mais de 5 dias)' : 'Todos os serviços em aberto'}
                meta={[geradoEm, dadosAte, `${numero(campo.total)} serviços${campo.risco ? ` · ${numero(campo.risco)} com risco elétrico` : ''}`].filter(Boolean)}
              />
              <ListaCampoFolha regioes={campo.regioes} detalhes={comEndereco} hoje={hoje} />
            </>
          )}
        </Folha>
      )}
    </>
  )
}
