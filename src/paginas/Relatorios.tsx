// Relatórios — "O que levo para a reunião / para a rua?". Quatro folhas A4 (na tela e na impressão,
// que o navegador salva em PDF): o relatório mensal / histórico completo (o mesmo do site antigo, com
// o seu seletor de mês), os serviços em aberto, os executados e a lista de campo. Aba e mês ficam na URL
// (?relatorio=…&mes=…), dá para mandar o link. Valem os filtros de região, bairro, categoria e origem.
// O link pede login; para quem não tem conta, o PDF de verdade (src/relatorios-pdf, montado aqui no
// navegador): baixar no computador, compartilhar o arquivo no celular (decisão do usuário, 17/10/2026).
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { ClipboardList, Download, FileText, Link2, ListChecks, ListTodo, Printer, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { EstadoErro, Esqueleto } from '@/componentes/estados/Estados'
import { PaginaRestrita } from '@/componentes/layout/PaginaRestrita'
import { Botao } from '@/componentes/ui/Botao'
import { Card } from '@/componentes/ui/Card'
import { Selecao } from '@/componentes/ui/Selecao'
import { listaCampo, mesesDoRelatorio, relatorioAbertos, relatorioExecutados, relatorioMensal } from '@/calculos/relatorios'
import { useBase, useDetalhes } from '@/dados/consultas'
import { filtrarLugar, intervaloDo, noIntervalo, type Atalho, type Intervalo } from '@/filtros/filtros'
import { useFiltros } from '@/filtros/useFiltros'
import { chaveMes, diaDe, formatarDia, formatarDiaCurto, rotuloMesLongo, type ChaveMes, type Dia } from '@/lib/datas'
import { numero } from '@/lib/formato'
import { useHoje, useMidia } from '@/lib/ganchos'
import type { PedidoPdf } from '@/relatorios-pdf'
import { RelatorioAbertosFolha } from './relatorios/Abertos'
import { ListaCampoFolha } from './relatorios/Campo'
import { RelatorioExecutadosFolha } from './relatorios/Executados'
import { CabecalhoFolha, Folha, useImpressaoClara } from './relatorios/Folha'
import { RelatorioMensalFolha } from './relatorios/Mensal'
import { MarcadorChave } from '@/componentes/ui/MarcadorChave'

type Aba = 'mensal' | 'abertos' | 'executados' | 'campo'

const ABAS: { id: Aba; nome: string; icone: typeof FileText; descricao: string }[] = [
  { id: 'mensal', nome: 'Mensal', icone: FileText, descricao: 'Para reunião e prestação de contas: o relatório de um mês fechado ou o histórico completo. Escolha o mês aqui (o período do filtro não vale nesta aba).' },
  { id: 'abertos', nome: 'Em aberto', icone: ListTodo, descricao: 'A fila de hoje da cidade, de uma região ou de um bairro (escolha nos filtros). Para ver só os que saíram para a rua numa época, escolha aqui (o período do filtro não vale nesta aba).' },
  { id: 'executados', nome: 'Executados', icone: ListChecks, descricao: 'Os serviços que voltaram da rua executados numa época, por região e bairro, com os dias da saída à execução. A época se escolhe aqui (o período do filtro não vale nesta aba).' },
  { id: 'campo', nome: 'Lista de campo', icone: ClipboardList, descricao: 'Para levar à rua: os abertos por região e bairro, juntando os que estão perto um do outro (até 300 m), mais antigos primeiro, com espaço para anotar o retorno. A época da saída se escolhe aqui (o período do filtro não vale nesta aba).' },
]

// "Saíram para a rua" das abas Em aberto e Lista de campo (decisão do usuário, 17/10/2026): seletor próprio,
// padrão "qualquer data" — o período global (padrão: últimos 30 dias) esconderia os pedidos parados há mais tempo.
// Na URL: ?saida=hoje | 30d | este-ano | m202609 (mês, chave como em lib/datas) ; sem o parâmetro = qualquer data.
// "Hoje" (pedido do usuário, 20/10/2026): a lista de campo só com o que saiu para a rua no dia.
const ATALHOS_SAIDA: { id: Atalho | 'hoje'; texto: string }[] = [
  { id: 'hoje', texto: 'Hoje' },
  { id: '7d', texto: 'Nos últimos 7 dias' },
  { id: '30d', texto: 'Nos últimos 30 dias' },
  { id: '90d', texto: 'Nos últimos 90 dias' },
  { id: 'este-ano', texto: 'Este ano' },
]

// Executados (pedido do usuário, 21/10/2026): época pela data de execução, seletor próprio. Padrão: últimos 7 dias —
// sem "qualquer data" nem ano (seriam milhares de linhas). No lugar de "Hoje"/"Ontem", o ÚLTIMO DIA COM EXECUÇÃO
// (usuário, 24/10/2026): as execuções só entram com a carga (feita no trabalho), e "hoje" vivia vazio.
// Na URL: ?execucao=ultimo | 30d | m202608 ; sem o parâmetro = últimos 7 dias.
const ATALHOS_EXECUCAO: { id: 'ultimo' | '7d' | '30d'; texto: string }[] = [
  { id: 'ultimo', texto: 'Último dia com execução' },
  { id: '7d', texto: 'Nos últimos 7 dias' },
  { id: '30d', texto: 'Nos últimos 30 dias' },
]
/** meses de execução no seletor (os mais recentes) */
const MESES_EXECUCAO = 12

/** "hoje", "ontem" ou "em 22/10" */
const quandoDia = (d: Dia, hoje: Dia) => (d === hoje ? 'hoje' : d === hoje - 1 ? 'ontem' : `em ${formatarDiaCurto(d)}`)

/**
 * "Últimos 7/30 dias" terminam no último dia com execução da cidade, não em hoje (usuário, 26/10/2026): a execução só
 * entra com a baixa do dia seguinte, então hoje fica vazio e a janela que termina hoje perdia o 7º dia (numa segunda,
 * a segunda anterior). Sem execução nenhuma na base, termina em hoje.
 */
function ultimosDias(n: number, hoje: Dia, ultimoNaCidade: Dia | null): { intervalo: Intervalo; quando: string } {
  const ate = ultimoNaCidade ?? hoje
  const de = ate - (n - 1)
  return {
    intervalo: { de, ate, parcial: ate >= hoje, rotulo: `${formatarDia(de)} a ${formatarDia(ate)}` },
    quando: `nos últimos ${n} dias (${formatarDiaCurto(de)} até ${formatarDiaCurto(ate)})`,
  }
}

function intervaloDaExecucao(
  valor: string | null,
  hoje: Dia,
  ultimo: Dia | null,
  ultimoNaCidade: Dia | null,
): { intervalo: Intervalo; quando: string } {
  if (valor === 'ultimo' && ultimo !== null)
    return { intervalo: { de: ultimo, ate: ultimo, parcial: ultimo === hoje, rotulo: formatarDia(ultimo) }, quando: quandoDia(ultimo, hoje) }
  if (valor === '30d') return ultimosDias(30, hoje, ultimoNaCidade)
  const mes = /^m(\d{6})$/.exec(valor ?? '')
  if (mes) {
    const intervalo = intervaloDo({ tipo: 'mes', mes: +mes[1] }, hoje)
    return { intervalo, quando: `em ${intervalo.rotulo}` }
  }
  return ultimosDias(7, hoje, ultimoNaCidade)
}

function intervaloDaSaida(valor: string | null, hoje: Dia): Intervalo | null {
  if (valor === 'hoje') return { de: hoje, ate: hoje, parcial: true, rotulo: 'Hoje' }
  const atalho = ATALHOS_SAIDA.find((a) => a.id === valor)
  if (atalho && atalho.id !== 'hoje') return intervaloDo({ tipo: 'atalho', atalho: atalho.id }, hoje)
  const mes = /^m(\d{6})$/.exec(valor ?? '')
  return mes ? intervaloDo({ tipo: 'mes', mes: +mes[1] }, hoje) : null
}

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

/** Relatórios são ferramenta da equipe da DIP (reunião e rua): só com acesso à parte restrita (PaginaRestrita) */
export function Relatorios() {
  return (
    <PaginaRestrita
      nome="Relatórios"
      titulo="Relatórios são para a equipe da DIP"
      texto="Entre com a sua conta para imprimir o relatório mensal, os serviços em aberto, os executados e a lista de campo."
      tituloErro="Não foi possível abrir os relatórios"
    >
      <PaginaRelatorios />
    </PaginaRestrita>
  )
}

/**
 * Botão que monta o PDF. O "Gerando…" fica só nele: com o estado na página, ligar e desligar o aviso
 * redesenhava a folha inteira (a lista de campo da cidade tem centenas de linhas) e atrasava o PDF.
 */
function BotaoPdf({
  aoTocar,
  disabled,
  children,
  variante = 'primario',
}: {
  aoTocar: () => Promise<void>
  disabled: boolean
  children: ReactNode
  variante?: 'primario' | 'secundario'
}) {
  const [gerando, setGerando] = useState(false)
  const tocar = async () => {
    setGerando(true)
    try {
      await aoTocar()
    } finally {
      setGerando(false)
    }
  }
  return (
    <Botao variante={variante} onClick={tocar} disabled={disabled || gerando} aria-busy={gerando}>
      {gerando ? 'Gerando…' : children}
    </Botao>
  )
}

function PaginaRelatorios() {
  useImpressaoClara()
  const [params, setParams] = useSearchParams()
  const aba: Aba = (['mensal', 'abertos', 'executados', 'campo'] as const).find((a) => a === params.get('relatorio')) ?? 'mensal'
  // "Hoje" com "Só em atraso" seria sempre vazio (atraso = saiu há mais de 5 dias): com "Hoje" a chave some e não vale
  const soAtraso = params.get('campo') === 'atraso' && params.get('saida') !== 'hoje'
  // aba, mês, época, "só em atraso": o mesmo esmaecer da troca de filtro (antes trocava a folha seco)
  const trocar = (chave: string, valor: string | null) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (valor === null) n.delete(chave)
        else n.set(chave, valor)
        return n
      },
      { viewTransition: true },
    )

  const { data: base, isLoading, error, refetch } = useBase()
  // a página só abre com acesso (ver Relatorios acima): os detalhes (endereço) estão sempre disponíveis
  const { data: detalhes, acesso } = useDetalhes()
  const { filtros } = useFiltros()
  const hoje = useHoje()

  const escopo = [filtros.bairro ?? filtros.regiao, filtros.categoria, filtros.quem ?? filtros.origem].filter(Boolean).join(' · ') || 'Cidade inteira'
  // mês de referência (como no antigo): meses fechados, o mais recente por padrão; "tudo" = histórico completo
  const meses = useMemo(() => (base ? mesesDoRelatorio(base, hoje) : []), [base, hoje])
  // "referencia" e não "mes": "mes" é do filtro de período do site (?periodo=mes&mes=2026-09)
  const paramMes = params.get('referencia')
  const mes: ChaveMes | null = paramMes === 'tudo' ? null : meses.find((k) => String(k) === paramMes) ?? meses[0] ?? null
  const [obs, setObs] = useObservacao(JSON.stringify([mes ?? 'tudo', escopo]))

  const paramSaida = params.get('saida')
  const paramExecucao = params.get('execucao')
  const comLista = params.get('lista') === '1'
  // o último dia com execução, com os filtros de lugar (num bairro pode ser outro dia que na cidade)
  const ultimoExecutado = useMemo(() => {
    if (!base) return null
    let ultimo: Dia | null = null
    for (const s of filtrarLugar(base.saidas, filtros)) if (s.dataRetorno !== null && (ultimo === null || s.dataRetorno > ultimo)) ultimo = s.dataRetorno
    return ultimo
  }, [base, filtros])
  // o último dia com execução na cidade: onde terminam "últimos 7/30 dias" (num bairro parado, o dele puxaria a janela para trás)
  const ultimoNaCidade = useMemo(() => {
    if (!base) return null
    let ultimo: Dia | null = null
    for (const s of base.saidas) if (s.dataRetorno !== null && (ultimo === null || s.dataRetorno > ultimo)) ultimo = s.dataRetorno
    return ultimo
  }, [base])
  const execucao = useMemo(
    () => intervaloDaExecucao(paramExecucao, hoje, ultimoExecutado, ultimoNaCidade),
    [paramExecucao, hoje, ultimoExecutado, ultimoNaCidade],
  )
  const saida = useMemo(() => intervaloDaSaida(paramSaida, hoje), [paramSaida, hoje])
  // meses que ainda têm pedido em aberto (os mais recentes primeiro)
  const mesesAbertos = useMemo(
    () => (base ? [...new Set(base.saidas.filter((s) => s.dataRetorno === null).map((s) => chaveMes(s.dataSaida)))].sort((a, b) => b - a) : []),
    [base],
  )
  // Com a época escolhida, o relatório diz de quantos saíram e quantos seguem em aberto: "Leste, últimos 30 dias"
  // mostrava 12 e o Panorama 39 (as saídas) — os dois certos, mas sem dizer que 12 são os 39 que ainda não voltaram
  const quandoSaida = saida ? (ATALHOS_SAIDA.find((a) => a.id === paramSaida)?.texto.toLowerCase() ?? `em ${saida.rotulo}`) : null
  const saidasDaEpoca = useMemo(
    () => (base && saida ? filtrarLugar(base.saidas, filtros).filter((s) => noIntervalo(s, saida, 'saida')).length : 0),
    [base, filtros, saida],
  )
  // "Hoje" sem nenhuma saída e com a última carga de antes de hoje: a lista vazia não quer dizer que ninguém saiu —
  // as saídas do dia só entram com a carga diária (feita no trabalho). Com saída de hoje na base, a carga já entrou.
  const cargaAntiga = useMemo(() => {
    const c = base?.atualizadoEm
    return c ? diaDe(c.getFullYear(), c.getMonth(), c.getDate()) < hoje : false
  }, [base, hoje])
  // "Hoje": está saindo agora, não faz sentido dizer quantos seguem em aberto (usuário, 20/10/2026)
  const rotuloSaida = (emAberto: number, soAtrasados = false) =>
    paramSaida === 'hoje' && saida
      ? saidasDaEpoca === 0 && cargaAntiga && base?.atualizadoEm
        ? `Saídas de hoje: a carga de hoje ainda não entrou (dados até ${base.atualizadoEm.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}); aparecem depois dela`
        : `${numero(saidasDaEpoca)} ${saidasDaEpoca === 1 ? 'saiu' : 'saíram'} para a rua hoje`
      : quandoSaida
        ? `Dos ${numero(saidasDaEpoca)} que saíram para a rua ${quandoSaida}, ${numero(emAberto)} ${soAtrasados ? 'seguem em atraso' : 'seguem em aberto'}`
        : null

  // meses com execução (os mais recentes primeiro)
  const mesesExecucao = useMemo(
    () =>
      base
        ? [...new Set(base.saidas.filter((s) => s.dataRetorno !== null).map((s) => chaveMes(s.dataRetorno!)))].sort((a, b) => b - a).slice(0, MESES_EXECUCAO)
        : [],
    [base],
  )

  const mensal = useMemo(() => (base && aba === 'mensal' ? relatorioMensal(base, filtros, mes, hoje) : null), [base, filtros, hoje, aba, mes])
  const abertos = useMemo(
    () => (base && aba === 'abertos' ? relatorioAbertos(base, filtros, hoje, saida) : null),
    [base, filtros, hoje, aba, saida],
  )
  const executados = useMemo(
    () => (base && aba === 'executados' ? relatorioExecutados(base, filtros, execucao.intervalo) : null),
    [base, filtros, aba, execucao],
  )
  const campo = useMemo(
    () => (base && aba === 'campo' ? listaCampo(base, filtros, hoje, soAtraso, saida) : null),
    [base, filtros, hoje, aba, soAtraso, saida],
  )

  const atual = ABAS.find((a) => a.id === aba)!
  // hora em que a página foi aberta (fica no cabeçalho do relatório)
  const [agora] = useState(() => new Date())
  const geradoEm = `Gerado em ${formatarDia(hoje)} às ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
  const dadosAte = base?.atualizadoEm ? `Dados até ${base.atualizadoEm.toLocaleDateString('pt-BR')} (última carga)` : null
  const comEndereco = aba !== 'mensal' && acesso === true ? (detalhes ?? null) : null
  const geradoLongo = `Gerado em ${agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`
  const soTexto = (lista: (string | null | undefined | false)[]) => lista.filter((m): m is string => !!m)

  // cabeçalho da folha — o mesmo na tela e no PDF
  const cab =
    aba === 'mensal' && mensal
      ? {
          titulo: mensal.todos ? 'Visão Geral · Todo o Período' : `Relatório Mensal · ${rotuloMesLongo(mensal.mes!)}`,
          subtitulo: escopo === 'Cidade inteira' ? undefined : escopo,
          meta: soTexto([geradoLongo, `${numero(mensal.total)} serviços ${mensal.todos ? 'no período' : 'registrados no mês'}`, dadosAte]),
        }
      : aba === 'abertos' && abertos
        ? {
            titulo: `Serviços em Aberto · ${filtros.bairro ? `Bairro ${filtros.bairro}` : filtros.regiao ? `Região ${filtros.regiao}` : 'Niterói'}`,
            // com época, "Dos N que saíram…, M seguem em aberto" já abre o relatório: aqui só a época
            subtitulo:
              soTexto([
                filtros.categoria,
                filtros.quem ?? filtros.origem,
                quandoSaida && paramSaida !== 'hoje' ? `Saíram para a rua ${quandoSaida}` : rotuloSaida(abertos.n),
              ]).join(' · ') || undefined,
            meta: soTexto([geradoLongo, `${numero(abertos.n)} serviços em aberto`, dadosAte]),
          }
        : aba === 'executados' && executados
          ? {
              titulo: `Serviços Executados · ${filtros.bairro ? `Bairro ${filtros.bairro}` : filtros.regiao ? `Região ${filtros.regiao}` : 'Niterói'}`,
              subtitulo: soTexto([filtros.categoria, filtros.quem ?? filtros.origem, `Executados ${execucao.quando}`, comLista ? null : 'Resumo']).join(' · '),
              meta: soTexto([geradoLongo, `${numero(executados.n)} ${executados.n === 1 ? 'serviço executado' : 'serviços executados'}`, dadosAte]),
            }
        : aba === 'campo' && campo
          ? {
              titulo: `Lista de campo · ${escopo}`,
              subtitulo: soTexto([soAtraso ? 'Só os serviços em atraso (mais de 5 dias)' : 'Todos os serviços em aberto', rotuloSaida(campo.total, soAtraso)]).join(' · '),
              meta: soTexto([geradoEm, dadosAte, `${numero(campo.total)} serviços${campo.risco ? ` · ${numero(campo.risco)} com risco elétrico` : ''}`]),
            }
          : null

  // compartilhar = o link desta tela (aba, mês e filtros vão na URL); quem abre precisa entrar com a conta
  const celular = useMidia('(max-width: 767px)')
  const podeCompartilhar = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const tituloCompartilhar =
    aba === 'mensal'
      ? `Relatório ${mes === null ? 'histórico' : rotuloMesLongo(mes)} · ${escopo}`
      : `${aba === 'abertos' ? 'Serviços em aberto' : aba === 'executados' ? `Serviços executados ${execucao.quando}` : 'Lista de campo'} · ${escopo}`
  const compartilhar = async () => {
    try {
      await navigator.share({ title: tituloCompartilhar, text: `${tituloCompartilhar} — painel da DIP (entrar com a conta)`, url: window.location.href })
    } catch {
      /* a pessoa fechou a janela de compartilhar: nada a fazer */
    }
  }
  // ---- PDF de verdade (arquivo) ----
  // o gerador e as fontes descem sem pressa depois que a página abre: no toque o PDF sai na hora, e a janela
  // de compartilhar ainda abre (o navegador só a deixa abrir logo depois de um toque). São ~0,5 MB: com
  // economia de dados ou rede lenta, só descem no toque (se demorar, o aviso "PDF pronto" abre a janela)
  useEffect(() => {
    const rede = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (rede?.saveData || ['slow-2g', '2g', '3g'].includes(rede?.effectiveType ?? '')) return
    const t = window.setTimeout(() => {
      import('@/relatorios-pdf').then((m) => m.prepararPdf()).catch(() => {})
    }, 1500)
    return () => window.clearTimeout(t)
  }, [])
  const podeEnviarArquivo = useMemo(() => {
    try {
      return typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], 'teste.pdf', { type: 'application/pdf' })] })
    } catch {
      return false
    }
  }, [])
  const pedidoPdf = (): PedidoPdf | null => {
    if (!cab) return null
    if (aba === 'mensal' && mensal) return { tipo: 'mensal', cabecalho: cab, hoje, r: mensal, obs }
    if (aba === 'abertos' && abertos) return { tipo: 'abertos', cabecalho: cab, hoje, r: abertos, detalhes: comEndereco, doDia: paramSaida === 'hoje', quando: quandoSaida }
    if (aba === 'executados' && executados)
      return { tipo: 'executados', cabecalho: cab, hoje, r: executados, detalhes: comEndereco, quando: execucao.quando, comLista }
    if (aba === 'campo' && campo) return { tipo: 'campo', cabecalho: cab, hoje, regioes: campo.regioes, detalhes: comEndereco }
    return null
  }
  // "Relatório Mensal - setembro de 2026 - Leste.pdf"; Em aberto e Lista de campo levam a data (mudam todo dia)
  const nomeArquivo = cab
    ? `${soTexto([cab.titulo, aba === 'mensal' && escopo !== 'Cidade inteira' && escopo, aba !== 'mensal' && formatarDia(hoje).replaceAll('/', '-')])
        .join(' - ')
        .replaceAll(' · ', ' - ')
        .replace(/[\\/:*?"<>|]/g, '-')}.pdf`
    : 'relatorio.pdf'
  const gerarArquivo = async (): Promise<File | null> => {
    const pedido = pedidoPdf()
    if (!pedido) return null
    try {
      const { gerarPdf } = await import('@/relatorios-pdf')
      return new File([await gerarPdf(pedido)], nomeArquivo, { type: 'application/pdf' })
    } catch (e) {
      console.error('PDF do relatório', e)
      toast.error('Não foi possível montar o PDF. Confira a internet e tente de novo.')
      return null
    }
  }
  const baixar = (arquivo: File) => {
    const url = URL.createObjectURL(arquivo)
    const a = document.createElement('a')
    a.href = url
    a.download = arquivo.name
    document.body.append(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  const baixarPdf = async () => {
    const arquivo = await gerarArquivo()
    if (arquivo) baixar(arquivo)
  }
  // Imprimir = o mesmo PDF (usuário, 20/10/2026): antes imprimia a página do site, outro layout — escala para ajustar
  // à mão e as quebras de página ruins. O PDF vai num quadro escondido e o navegador abre a janela de impressão dele;
  // se o navegador não deixar, abre o PDF numa aba para imprimir dali. (Ctrl+P na página continua imprimindo a tela.)
  const imprimirPdf = async () => {
    const arquivo = await gerarArquivo()
    if (!arquivo) return
    const url = URL.createObjectURL(arquivo)
    const quadro = document.createElement('iframe')
    quadro.title = 'PDF para imprimir'
    quadro.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden')
    quadro.onload = () => {
      try {
        quadro.contentWindow!.focus()
        quadro.contentWindow!.print()
      } catch {
        window.open(url, '_blank')
      }
      window.setTimeout(() => {
        quadro.remove()
        URL.revokeObjectURL(url)
      }, 60_000)
    }
    quadro.src = url
    document.body.append(quadro)
  }
  const enviar = (arquivo: File) => navigator.share({ files: [arquivo], title: tituloCompartilhar })
  const compartilharPdf = async () => {
    const arquivo = await gerarArquivo()
    if (!arquivo) return
    try {
      await enviar(arquivo)
    } catch (e) {
      const nome = e instanceof DOMException ? e.name : ''
      // a pessoa fechou a janela de compartilhar: nada a fazer
      if (nome === 'AbortError') return
      // demorou e o navegador não abre mais a janela sem um toque novo: o toque do aviso abre
      if (nome === 'NotAllowedError')
        toast('PDF pronto', { action: { label: 'Compartilhar', onClick: () => void enviar(arquivo).catch(() => {}) }, duration: 15_000 })
      // o aparelho não aceita mandar esse arquivo: baixa
      else baixar(arquivo)
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
          {/* celular: o principal é mandar o PDF (o arquivo abre sem login; WhatsApp, e-mail…), com o link ao lado
              para quem tem conta; computador: baixar o PDF é o principal, com imprimir e copiar o link ao lado */}
          {celular ? (
            <div className="flex gap-2">
              {podeCompartilhar ? (
                <Botao variante="secundario" onClick={compartilhar} aria-label="Compartilhar o link (quem abre precisa entrar com a conta)">
                  <Link2 aria-hidden className="size-4" />
                  Link
                </Botao>
              ) : (
                <Botao variante="secundario" onClick={copiarLink} aria-label="Copiar o link deste relatório">
                  <Link2 aria-hidden className="size-4" />
                  Copiar link
                </Botao>
              )}
              <BotaoPdf aoTocar={podeEnviarArquivo ? compartilharPdf : baixarPdf} disabled={!cab}>
                {podeEnviarArquivo ? <Share2 aria-hidden className="size-4" /> : <Download aria-hidden className="size-4" />}
                {podeEnviarArquivo ? 'Compartilhar PDF' : 'Baixar PDF'}
              </BotaoPdf>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Botao variante="secundario" onClick={copiarLink} aria-label="Copiar o link deste relatório">
                <Link2 aria-hidden className="size-4" />
                Copiar link
              </Botao>
              <BotaoPdf variante="secundario" aoTocar={imprimirPdf} disabled={!cab}>
                <Printer aria-hidden className="size-4" />
                Imprimir
              </BotaoPdf>
              <BotaoPdf aoTocar={baixarPdf} disabled={!cab}>
                <Download aria-hidden className="size-4" />
                Baixar PDF
              </BotaoPdf>
            </div>
          )}
        </div>
        <ToggleGroup
          aria-label="Relatório"
          value={[aba]}
          onValueChange={(v) => v[0] && trocar('relatorio', v[0] === 'mensal' ? null : (v[0] as string))}
          className="relative mt-4 grid grid-cols-4 gap-1 rounded-xl border border-line bg-card p-1 sm:inline-grid sm:w-auto"
        >
          <MarcadorChave className="bg-acao" />
          {ABAS.map(({ id, nome, icone: Icone }) => (
            <Toggle
              key={id}
              value={id}
              className="opcao-chave flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-[12px] text-ink-2 hover:text-ink data-pressed:font-medium data-pressed:text-sobre-acao sm:flex-row sm:gap-2 sm:text-[13px]"
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
            onChange={(e) => trocar('referencia', e.target.value)}
          />
        )}

        {aba === 'executados' && (
          <Selecao
            rotulo="Executados"
            className="mt-3 w-full max-w-64"
            opcoes={[
              ...ATALHOS_EXECUCAO.filter((a) => a.id !== 'ultimo' || ultimoExecutado !== null).map((a) => ({
                valor: a.id,
                texto: a.id === 'ultimo' && ultimoExecutado !== null ? `${a.texto} (${formatarDiaCurto(ultimoExecutado)})` : a.texto,
              })),
              ...mesesExecucao.map((k) => ({ valor: `m${k}`, texto: `Em ${rotuloMesLongo(k)}` })),
            ]}
            value={paramExecucao && (ATALHOS_EXECUCAO.some((a) => a.id === paramExecucao) || /^m\d{6}$/.test(paramExecucao)) ? paramExecucao : '7d'}
            onChange={(e) => trocar('execucao', e.target.value === '7d' ? null : e.target.value)}
          />
        )}

        {/* resumo (uma página, para o dia a dia) ou com a lista de todos (pode dar dezenas de páginas; usuário, 24/10/2026) */}
        {aba === 'executados' && (
          <ToggleGroup
            aria-label="O que mostrar"
            value={[comLista ? 'lista' : 'resumo']}
            onValueChange={(v) => v[0] && trocar('lista', v[0] === 'lista' ? '1' : null)}
            className="relative mt-3 flex h-9 w-fit items-center rounded-full border border-line bg-page p-0.5"
          >
            <MarcadorChave className="bg-card shadow-1" />
            {[
              { v: 'resumo', t: 'Só o resumo' },
              { v: 'lista', t: `Com a lista${executados ? ` (${numero(executados.n)})` : ''}` },
            ].map((o) => (
              <Toggle
                key={o.v}
                value={o.v}
                className="opcao-chave h-full rounded-full px-3 text-xs text-ink-2 data-pressed:font-medium data-pressed:text-ink"
              >
                {o.t}
              </Toggle>
            ))}
          </ToggleGroup>
        )}

        {(aba === 'abertos' || aba === 'campo') && (
          <Selecao
            rotulo="Em aberto que saíram para a rua"
            className="mt-3 w-full max-w-64"
            opcoes={[
              { valor: '', texto: 'Qualquer data' },
              ...ATALHOS_SAIDA.map((a) => ({ valor: a.id, texto: a.texto })),
              ...mesesAbertos.map((k) => ({ valor: `m${k}`, texto: `Em ${rotuloMesLongo(k)}` })),
            ]}
            value={saida ? (paramSaida ?? '') : ''}
            onChange={(e) => trocar('saida', e.target.value || null)}
          />
        )}

        {aba === 'campo' && paramSaida !== 'hoje' && (
          <ToggleGroup
            aria-label="Quais serviços"
            value={[soAtraso ? 'atraso' : 'todos']}
            onValueChange={(v) => v[0] && trocar('campo', v[0] === 'atraso' ? 'atraso' : null)}
            className="relative mt-3 flex h-9 w-fit items-center rounded-full border border-line bg-page p-0.5"
          >
            <MarcadorChave className="bg-card shadow-1" />
            {[
              { v: 'todos', t: 'Todos em aberto' },
              { v: 'atraso', t: 'Só em atraso' },
            ].map((o) => (
              <Toggle
                key={o.v}
                value={o.v}
                className="opcao-chave h-full rounded-full px-3 text-xs text-ink-2 data-pressed:font-medium data-pressed:text-ink"
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
              {cab && <CabecalhoFolha {...cab} />}
              <RelatorioMensalFolha r={mensal} obs={obs} aoMudarObs={setObs} />
            </>
          )}
          {aba === 'abertos' && abertos && (
            <>
              {cab && <CabecalhoFolha {...cab} />}
              <RelatorioAbertosFolha r={abertos} detalhes={comEndereco} hoje={hoje} doDia={paramSaida === 'hoje'} quando={quandoSaida} />
            </>
          )}
          {aba === 'executados' && executados && (
            <>
              {cab && <CabecalhoFolha {...cab} />}
              <RelatorioExecutadosFolha r={executados} detalhes={comEndereco} hoje={hoje} quando={execucao.quando} comLista={comLista} />
            </>
          )}
          {aba === 'campo' && campo && (
            <>
              {cab && <CabecalhoFolha {...cab} />}
              <ListaCampoFolha regioes={campo.regioes} detalhes={comEndereco} hoje={hoje} />
            </>
          )}
        </Folha>
      )}
    </>
  )
}
