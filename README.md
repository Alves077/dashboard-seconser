# Dashboard DIP · SECONSER Niterói

Painel dos serviços de iluminação pública do **Departamento de Iluminação Pública (DIP)** da SECONSER Niterói:
fila em aberto, prazo de atendimento, evolução no tempo, mapa e relatórios para impressão.

🔗 **[Acessar o dashboard](https://alves077.github.io/dashboard-seconser/)**

> Esta branch (`v2`) é o site novo. O site no ar hoje ainda é o antigo (branch `main`).

## Páginas

Organizadas pela pergunta de quem usa:

| Página | Pergunta |
|---|---|
| **Panorama** | Como estamos agora? — fila de hoje, entradas e execuções do período, regiões, categorias e bairros |
| **Mapa** | Onde está o problema? — um pino por serviço, abertos por padrão, painel por região/bairro |
| **Prazo** | Estamos atendendo bem? — % no prazo (5 dias), tempo de execução, atraso de agora, reaberturas |
| **Evolução** | Está melhorando ou piorando? — entradas × execuções com a fila, tempo e prazo mês a mês, categorias |
| **Relatórios** | O que levo para a reunião ou para a rua? — mensal/histórico, em aberto e lista de campo, em A4 (acesso restrito) |

Filtros globais (período, região/bairro, categoria, origem) ficam na URL e valem em todas as páginas. Cada serviço
abre uma **Ficha** com o histórico de saídas; descrição, endereço e fotos só para quem tem acesso.

## Stack

Vite + React + TypeScript · Tailwind CSS · Base UI · TanStack Query · React Router · Leaflet (OpenStreetMap) ·
Supabase (dados e login) · GitHub Pages. Gráficos em SVG próprio, com paleta validada para daltonismo
(ver `DESIGN.md`).

## Dados

Os serviços vêm do banco da SECONSER (coleta do Colab + tratamento), sincronizados uma vez por dia para o
Supabase. O site lê a camada pública (sem dados pessoais); a parte restrita (descrição, endereço, fotos) exige
login e está protegida por regras de acesso no próprio banco (RLS).

Situação de cada serviço: com retorno → **OK**; sem retorno e mais de 5 dias desde a saída → **em atraso**;
senão → **em atendimento**. Uma linha = uma saída para a rua; um serviço pode ter mais de uma (reabertura).

## Rodar localmente

Precisa do Node 22 (Vite 8 pede ≥ 20.19 ou ≥ 22.12).

```bash
npm install
cp .env.example .env.local   # e ajuste: VITE_FONTE=csv + DADOS_LOCAIS=<pasta com os CSVs>
npm run dev                  # http://localhost:5173/dashboard-seconser/
```

Com `VITE_FONTE=csv`, o `npm run dev` lê um retrato do banco em CSV de uma pasta **fora** do repositório (dado
real nunca entra no git). `npm run build` gera o site em `dist/`.

## Documentação

- `docs/PLANO_V2.md` — plano, decisões e estado de cada fase
- `docs/CONFERENCIA_V2.md` — conferência dos números contra o site antigo
- `DESIGN.md` — sistema visual (cores, tipografia, gráficos, celular, estados)
