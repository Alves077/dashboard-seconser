# Segurança — auditoria de 14/10/2026

Feita com o projeto Supabase `dip-iluminacao` já com a carga real (carga 13) e o site v2 lendo dele. Testes de fora
só com a chave pública (a que qualquer visitante tem, embutida no site); inspeção do banco só com consultas de leitura.

## Resultado

| Ataque / verificação | Resultado |
|---|---|
| Ler o restrito sem login (`servicos_detalhe`, `servico_fotos`) | **barrado** (401) |
| Ler o restrito "embutido" numa consulta pública (`servicos?select=…,servicos_detalhe(…)`) | **barrado** (401) |
| Ler o esquema `privado` (lista de acessos, erros da carga) | **barrado** (esquema não exposto) |
| Inserir / alterar / apagar em qualquer tabela | **barrado** (401 — visitante e logado só têm SELECT) |
| Chamar as funções da carga (`iniciar_carga`, `aplicar_carga`, `falhar_carga`) | **barrado** (só `sincronizador`/`service_role`) |
| SQL injection pelos filtros (aspas, `;drop table`, subconsulta no `or=`, SQL no `select=`) | **sem efeito** (vira texto literal, erro de tipo ou bloqueio na entrada) |
| Funções com SQL montado de texto (`EXECUTE`) | **nenhuma**; todas com `search_path` vazio |
| View pública `vw_servicos` | `security_invoker` (respeita as regras das tabelas); só colunas públicas |
| Acesso ao restrito | `privado.tem_acesso()`: usuário logado + na lista + ativo + dentro da validade |
| Criar conta sozinho | **desligado** (`disable_signup`); só e-mail/senha; sem login anônimo |
| GraphQL / Storage | GraphQL desligado; nenhum bucket |
| Segredos no site publicado (`dist`) e no repositório | **nenhum**: só a chave *publishable* (feita para ser pública); nenhum `.env`, CSV ou planilha no git |
| XSS (HTML montado com dado) | só no mapa (dicas e lista do ponto): categoria e bairro escapados; o resto é número |
| Navegador | não grava dado restrito (só tema, mapa detalhado e as observações digitadas no relatório) |
| Sair da conta | **corrigido**: o restrito (detalhes, fotos) agora sai da memória na hora (`SIGNED_OUT`, também se sair em outra aba ou a sessão expirar) |
| Servidor de desenvolvimento | só escuta no próprio computador; `dados-locais` não sai da pasta (`../`, `%2e`, `%5C`, `%00` testados); `@fs` e `.env*` bloqueados (403); não vai para o site publicado |

## Rotas (sem login, no build de produção e no de desenvolvimento)

| Rota aberta direto | O que aparece | Pedidos ao restrito |
|---|---|---|
| `#/relatorios` (mensal, em aberto, lista de campo) | "Relatórios são para a equipe da DIP" + Entrar; some do menu | nenhum |
| `#/?servico=…` e `#/mapa?servico=…` (Ficha) | parte pública; no lugar de descrição/endereço/fotos, "Restrito · Entrar para ver" | nenhum |
| rota inexistente | "Em construção" | nenhum |

A trava das telas é só conforto: quem garante é o banco (as regras acima). Mesmo forçando a tela, sem login o
Supabase não entrega o restrito. Visto de passagem: no servidor de **desenvolvimento**, a 1ª abertura da Ficha às
vezes recarrega uma vez (o Vite preparando o Leaflet sob demanda) — no build de produção não acontece.

## Chaves e segredos

- Site publicado: só a chave *publishable* (pública por definição). Nenhuma `sb_secret_`, `service_role`, senha ou
  token. O `.env.local` está no `.gitignore`.
- Histórico do git — dashboard (90 commits, todos os ramos) e projeto de dados (público; só o commit inicial): nenhum
  segredo e nenhum arquivo de dado (CSV, planilha, `.env`) jamais commitado.
- Site antigo (ramo `main`): o endereço do Apps Script com o token está no código (já sabido) — quem tiver o link
  baixa a planilha com as colunas públicas. **Quando a v2 for ao ar, desativar esse Apps Script.**

## Recomendações (não são falhas)

1. **Proteção contra senha vazada** (aviso do Supabase): verifica a senha na base do HaveIBeenPwned. Nos planos que
   têm, ligar em *Authentication → Policies*. Senha forte para as contas de acesso.
2. **URLs de redirecionamento do login** (*Authentication → URL Configuration*): deixar só o endereço do site
   publicado (e `http://localhost:5173` enquanto houver desenvolvimento). Evita link de "nova senha" apontando para
   outro site.
3. **Privacidade dos pinos:** a posição do pino é pública (já era no site antigo) e, em pedido de cidadão, cai na porta
   de quem pediu — o endereço em texto continua restrito. Se a Dayse/TI preferir, dá para arredondar as coordenadas na
   camada pública (ex.: 3 casas ≈ 100 m) e manter a exata só no restrito.
4. **Cabeçalhos de segurança:** o GitHub Pages não deixa configurar CSP/anti-iframe; dá para pôr uma CSP por `<meta>`
   como camada extra (precisa liberar o script do tema, o OpenStreetMap e o Supabase). Opcional.
5. Repetir esta auditoria (o `get_advisors` de segurança do Supabase e os testes de fora) depois de qualquer mudança
   de esquema ou de regra de acesso.
