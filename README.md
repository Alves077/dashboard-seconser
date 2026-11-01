# Dashboard DIP · SECONSER Niterói

Painel dos serviços de iluminação pública do **Departamento de Iluminação Pública (DIP)** da SECONSER Niterói:
fila em aberto, prazo de atendimento, evolução no tempo, mapa, pedidos de vereadores e relatórios em PDF.

🔗 **[Acessar o dashboard](https://alves077.github.io/dashboard-seconser/)**

## Páginas

Cada página responde a uma pergunta de quem usa:

| Página | Pergunta | O que mostra |
|---|---|---|
| **Panorama** | Como estamos agora? | fila de hoje por tempo de espera, saídas e execuções do período, movimento da fila, regiões, categorias, bairros e quem pede |
| **Mapa** | Onde está o problema? | um pino por serviço (abertos por padrão), painel por região e bairro |
| **Prazo** | Estamos atendendo bem? | % no prazo de 5 dias, tempo até a execução, atraso de agora, reaberturas |
| **Evolução** | Está melhorando ou piorando? | saídas × execuções com a fila, tempo e prazo mês a mês, categorias |
| **Vereadores** | O que os vereadores pediram? | pedidos por vereador, situação e perfil de cada um |
| **Serviços** 🔒 | Onde está tal serviço? | todos os serviços, de qualquer data, com busca, situação, ordem por coluna e páginas de 50 |
| **Relatórios** 🔒 | O que levo para a reunião ou para a rua? | Mensal/histórico, Em aberto, Executados e Lista de campo, na tela e em PDF A4 |

- **Filtros globais** (período, região, bairro, categoria, origem) ficam na URL: valem em todas as páginas e o link
  filtrado pode ser compartilhado.
- **Ficha do serviço**: histórico de saídas para a rua; descrição, endereço e fotos só para quem tem acesso.
- **Busca rápida** (tecla `/`): número do serviço, bairro, rua e, com acesso, endereço.
- Tema claro e escuro, celular com navegação embaixo, gráficos legíveis em impressão preto e branco.

🔒 = só com login de quem tem acesso (equipe da DIP).

## Dados

```
Colab → banco da SECONSER (MySQL) → tratamento → sincronização diária → Supabase → este site
```

O site lê do Supabase a camada pública (sem dados pessoais). A parte restrita (descrição, endereço, fotos) exige login
e é protegida por regras de acesso no próprio banco (RLS) — ver `docs/SEGURANCA.md`. A coleta e o tratamento ficam em
outro repositório; dado real nunca entra neste.

Regras: uma linha = uma **saída para a rua**; um serviço pode ter mais de uma (reabertura). Com retorno → **executado**;
sem retorno e mais de 5 dias corridos desde a saída → **em atraso**; senão → **em atendimento**.

## Stack

Vite + React + TypeScript · Tailwind CSS · Base UI · TanStack Query · React Router · Leaflet (OpenStreetMap) ·
pdf-lib (relatórios em PDF) · Supabase (dados e login) · GitHub Pages. Gráficos em SVG próprio, com paleta validada
para daltonismo (ver `DESIGN.md`).

## Rodar localmente

Precisa do Node 22 (Vite 8 pede ≥ 20.19 ou ≥ 22.12).

```bash
npm install
cp .env.example .env.local   # e ajuste: VITE_FONTE=supabase, ou csv + DADOS_LOCAIS=<pasta com os CSVs>
npm run dev                  # http://localhost:5173/dashboard-seconser/
```

- `VITE_FONTE=supabase` lê o banco publicado; `VITE_FONTE=csv` lê um retrato do banco em CSV de uma pasta **fora** do
  repositório.
- Dados de teste só no `npm run dev`: `…/?dados=pior#/` (também `vazio`, `um`, `enorme`, `lento`, `erro`,
  `erro-restrito`) — dados inventados, para ver a tela no pior caso.

| Comando | O quê |
|---|---|
| `npm test` | testes dos cálculos (vitest, `src/testes/`) — os números que vão para a tela e os PDFs |
| `npm run lint` | oxlint |
| `npx tsc -b` | tipos |
| `npm run build` | gera o site em `dist/` |

## Publicação

Cada push no ramo `main` publica o site no GitHub Pages (`.github/workflows/publicar.yml`): instala, **roda os
testes** (se algum falhar, não publica e o site no ar fica como estava), confere os tipos e gera o site. Os endereços
do site antigo (`pages/mapa.html`, `/legado/`…) levam ao mesmo assunto no painel novo. O código do site antigo
(HTML + Apps Script, até outubro de 2026) fica guardado na marca `site-antigo`.

## Organização do código

| Pasta | O quê |
|---|---|
| `src/paginas/` | uma pasta/arquivo por página; `relatorios/` são as folhas da tela |
| `src/relatorios-pdf/` | os mesmos relatórios desenhados em PDF (motor próprio sobre o pdf-lib) |
| `src/calculos/` | os números de cada página e relatório (sem React) |
| `src/dados/` | leitura (Supabase ou CSV), montagem da base e regras de negócio (`regras.ts`) |
| `src/filtros/`, `src/busca/`, `src/ficha/`, `src/mapa/` | filtros na URL, busca rápida, ficha do serviço, mapas |
| `src/componentes/` | layout, gráficos, estados (carregando, vazio, erro) e peças de interface |
| `src/lib/` | datas, formatação de números e textos, cores, geo |
| `src/testes/` | testes dos cálculos, com uma base pequena montada à mão |
| `src/dev/` | dados de teste (`?dados=`), fora do site publicado |

## Documentação

- `docs/PLANO_V2.md` — plano, decisões e o que foi feito em cada rodada
- `docs/PUBLICACAO.md` — como o site foi ao ar (teste → troca → final)
- `docs/SEGURANCA.md` — acesso, dados restritos e auditoria
- `docs/CONFERENCIA_V2.md` — conferência dos números contra o site antigo
- `DESIGN.md` — sistema visual (cores, tipografia, gráficos, celular, estados)
