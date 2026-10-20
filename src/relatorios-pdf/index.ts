// PDF dos relatórios montado no próprio navegador, a partir dos mesmos dados da folha na tela — para
// compartilhar o arquivo (WhatsApp, e-mail) com quem não tem conta no painel (o link pede login).
// Carregado sob demanda (import dinâmico em Relatorios.tsx): pdf-lib + fontes só descem quando alguém usa.
import type { RegiaoCampo, RelatorioAbertos, RelatorioMensal } from '@/calculos/relatorios'
import type { Detalhe } from '@/dados/tipos'
import type { Dia } from '@/lib/datas'
import { desenharAbertos } from './abertos'
import { desenharCampo } from './campo'
import { desenharMensal } from './mensal'
import { Folha, type Formato } from './motor'
import { cabecalho, type Cabecalho } from './pecas'

export { carregarFontes as prepararPdf } from './motor'

export type PedidoPdf = {
  cabecalho: Cabecalho
  hoje: Dia
  /** 'continuo' no celular (uma página que rola), 'a4' no computador (para imprimir) */
  formato: Formato
} & (
  | { tipo: 'mensal'; r: RelatorioMensal; obs: string }
  | { tipo: 'abertos'; r: RelatorioAbertos; detalhes: Map<string, Detalhe> | null }
  | { tipo: 'campo'; regioes: RegiaoCampo[]; detalhes: Map<string, Detalhe> | null }
)

export async function gerarPdf(p: PedidoPdf): Promise<Blob> {
  const f = await Folha.criar(p.cabecalho.titulo, p.formato)
  cabecalho(f, p.cabecalho)
  if (p.tipo === 'mensal') desenharMensal(f, p.r, p.obs)
  else if (p.tipo === 'abertos') desenharAbertos(f, p.r, p.detalhes, p.hoje)
  else desenharCampo(f, p.regioes, p.detalhes, p.hoje)
  // com endereço, o arquivo leva dado da parte restrita para fora do login: o rodapé avisa
  const comEndereco = p.tipo !== 'mensal' && p.detalhes !== null
  f.rodapes(`${p.cabecalho.titulo} · DIP · SECONSER Niterói`, comEndereco ? 'Contém endereços: uso interno' : undefined)
  return f.salvar()
}
