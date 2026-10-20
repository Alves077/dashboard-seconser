# Publicação da v2 (plano decidido em 17/10/2026)

> **20/10 — troca preparada** (workflow em `ETAPA: troca`, `FIM_LEGADO: '03/11/2026'`; usuário: "até 2 semanas,
> talvez até antes — não é como se muita gente usasse"). Simulada em casa com o mesmo script do workflow e um servidor
> igual ao Pages: raiz = painel novo; `/legado/` = antigo com aviso e fora dos buscadores (todas as 5 páginas — antes
> o `noindex` só entrava nas da raiz); favoritos antigos redirecionam (`pages/mapa.html` → `#/mapa`, `qualidade` →
> `#/prazo`, `tendencia` → `#/evolucao`, `relatorio.html` → `#/relatorios`); links de `/teste/` seguem para o mesmo
> lugar no endereço principal. **Ordem importa:** criar a marca `site-antigo` ANTES do push (o workflow busca o antigo
> nela; sem ela a publicação falha e o site fica como estava — é só rodar de novo depois).

> **Estado (17/10, noite):** etapa `teste` no ar — `…/dashboard-seconser/teste/` = v2, raiz = site antigo. Pages já
> em GitHub Actions e `v2` liberado no environment. Usuário testou no celular (Samsung A25): ok; pediu compartilhar
> o relatório como PDF (o botão PDF abria o "salvar" do Android e Compartilhar mandava só o link) → **feito
> (17/10, à noite): "Compartilhar PDF" manda o arquivo** (PLANO_V2, "Relatório em PDF de verdade").
> **Esqueci a senha (17/10):** o link do e-mail caía em "Em construção" (o retorno `#access_token=…` do Supabase
> brigava com as rotas `#/…`) e não havia tela de senha nova. Corrigido: `index.html` guarda o retorno antes do app
> abrir, `sessao.tsx` entra com o token e abre "Criar nova senha" (`DialogoNovaSenha.tsx`); link vencido ou já usado
> mostra aviso. **Testado de verdade pelo usuário (17/10): link novo → senha refeita no site, ok.**

Endereço: `https://alves077.github.io/dashboard-seconser/` (GitHub Pages). Quem publica é o workflow
`.github/workflows/publicar.yml`, a cada push no ramo `v2`. A linha `ETAPA:` do workflow decide o que vai ao ar.

| Etapa | Raiz (`…/dashboard-seconser/`) | Outro endereço |
|---|---|---|
| `teste` | site antigo (do ramo `main`, igual a hoje) | v2 em `…/teste/` (fora dos buscadores) |
| `troca` | **v2** | site antigo em `…/legado/`, com aviso "sai do ar em `FIM_LEGADO`" |
| `final` | v2 | — |

Decisões (usuário, 17/10): teste numa subpasta do mesmo site; legado por 2 a 4 semanas em `/legado/` com aviso,
depois desligar o Apps Script e tirar a pasta. O código do antigo fica para sempre na marca `site-antigo` do git.

## 1. Teste — o que fazer uma vez (no GitHub e no Supabase)
1. GitHub → repositório → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   (O site antigo continua no ar: o workflow publica ele na raiz.)
2. Dar push na `v2` (ou Actions → **Publicar site** → Run workflow). Se a publicação falhar com "Branch v2 is not
   allowed to deploy to github-pages": **Settings → Environments → github-pages → Deployment branches** → acrescentar
   `v2` e rodar de novo.
3. Supabase → **Authentication → URL Configuration → Redirect URLs**: acrescentar
   `https://alves077.github.io/dashboard-seconser/**` (vale para `/teste/` e, depois, para a raiz — o "esqueci a
   senha" volta para o endereço de onde foi pedido).
4. Conferir: `…/dashboard-seconser/` = site antigo; `…/dashboard-seconser/teste/` = v2.

## 2. Teste no celular de verdade (o que o computador não mostra)
- [ ] Abrir `…/teste/` no celular (Android e, se der, iPhone), com 4G e com Wi-Fi.
- [ ] Entrar com a conta; abrir uma Ficha com fotos; Relatórios → Lista de campo; Compartilhar (abre o WhatsApp etc.).
- [ ] Tocar nas linhas (fundo escurece ao tocar), arrastar a Ficha para fechar, gaveta de filtros.
- [ ] Campo de busca e de senha **não** dão zoom na página ao tocar.
- [ ] Barra de baixo não fica atrás da barra do sistema; nada gruda em "hover" depois de tocar.
- [ ] Relatórios → "Compartilhar PDF" no celular: escolher o WhatsApp, abrir o arquivo do outro lado (sem login).
- [ ] Computador: "Baixar PDF" das três abas; conferir números com a tela.
- [x] Esqueci a senha (17/10, ok): pedir o link, abrir no celular, criar a senha nova, sair e entrar com ela.
- [ ] Segunda visita abre rápido (cópia no navegador).

## 3. Troca (quando o teste estiver aprovado)
1. Marcar o site antigo no git (guarda o código para sempre):
   `git tag site-antigo origin/main` e `git push origin site-antigo`.
2. No workflow: `ETAPA: troca` e `FIM_LEGADO: 'DD/MM/AAAA'` (2 a 4 semanas). Commit e push na `v2`.
3. Supabase → URL Configuration → **Site URL**: `https://alves077.github.io/dashboard-seconser/`.
4. Avisar a equipe do endereço (o mesmo de sempre) e de que o antigo fica em `/legado/` até a data.
5. Opcional (organização do repositório): levar a `v2` para a `main` (merge) e deixar a `main` como ramo do
   workflow — quando fizer, trocar `branches: [v2]` por `[main]` no workflow e o ramo permitido no environment.

## 4. Final (na data de FIM_LEGADO)
1. **Desligar o Apps Script** do site antigo (o token dele está no código público): no Google Apps Script, remover
   a implantação (Implantar → Gerenciar implantações → Arquivar) e, se quiser, despublicar a planilha.
2. No trabalho: tirar da rotina diária o passo Power Query → CSV → Google Sheets (a v2 lê o Supabase).
3. No workflow: `ETAPA: final`. Commit e push.
4. Segurança (docs/SEGURANCA.md): ligar a proteção de senha vazada no Supabase (Authentication → Policies).
