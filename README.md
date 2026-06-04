# Dashboard DIP · Seconser Niterói

Dashboard operacional do **Departamento de Iluminação Pública (DIP)** da Seconser Niterói. Acompanha em tempo real o fluxo de entrada e saída de demandas, qualidade do atendimento e distribuição geográfica dos serviços no município.

🔗 **[Acessar o dashboard](https://alves077.github.io/dashboard-seconser/)**

---

## Páginas

### Visão Geral
Painel principal com KPIs consolidados (total de serviços, concluídos, em aberto, em atraso, reaberturas e tempo médio), distribuição por categoria, reaberturas por categoria e região, tempo de execução por faixa, serviços por região, top 10 bairros e volume mensal de demandas. Filtros por período, região e categoria.

![Visão Geral](docs/screenshots/visao-geral.png)

### Mapa
Visualização georreferenciada dos registros sobre o mapa de Niterói. Filtros por situação (OK / Em Atendimento / Em Atraso) e por região, com zoom automático. Painel lateral com KPIs, abertos por região, top bairros em aberto e serviços mais antigos em atraso.

![Mapa — todos os pontos](docs/screenshots/mapa-completo.png)
![Mapa — somente abertos](docs/screenshots/mapa-abertos.png)
![Mapa — filtro por região](docs/screenshots/mapa-regiao.png)

### Qualidade
Indicadores de qualidade: taxa de conclusão, reincidência, resolução rápida (≤3 dias), cauda longa (>15 dias), tempo médio e percentual em atraso. Atraso por região, reincidência por categoria, histograma dia a dia, distribuição de faixas por região e evolução mensal de tempo médio e cauda longa.

![Qualidade](docs/screenshots/qualidade.png)

### Tendência
Análise temporal: mês de pico, último mês completo, variação mensal, média mensal, saldo acumulado e cumprimento de prazo. Gráfico de fluxo (entradas × concluídos × saldo acumulado), tabela de calor de sazonalidade por categoria e evolução mensal de prazo e tempo médio.

![Tendência](docs/screenshots/tendencia.png)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript puro |
| Gráficos | Chart.js 4.4.1 |
| Mapa | Leaflet.js 1.9.4 |
| Parse de dados | PapaParse 5.4.1 |
| Fonte de dados | Google Sheets via Apps Script (proxy autenticado) |
| Cache | sessionStorage (TTL de sessão) |
| Hospedagem | GitHub Pages |

---

## Fonte de Dados

Os dados são exportados de uma planilha Excel alimentada manualmente pela equipe do DIP, processada via Power Query e publicada no Google Sheets. O dashboard acessa os dados via **Google Apps Script** com autenticação por token, mantendo a planilha privada.

O cache de sessão (`sessionStorage`) evita múltiplas requisições durante a mesma navegação — os dados são buscados uma vez por sessão e reutilizados ao trocar de página.

---

## Modelo de Dados

| Coluna | Tipo | Descrição |
|---|---|---|
| ID Colab | Inteiro | Identificador do serviço (pode repetir em reaberturas) |
| Categoria | Texto | Tipo de ocorrência |
| Bairro | Texto | Bairro do serviço |
| Região | Texto | Região de Niterói |
| Data Saída | Data dd/mm/aaaa | Data de abertura/envio |
| Data Retorno | Data dd/mm/aaaa | Data de conclusão (vazio se em aberto) |
| Prazo | Data | Data Saída + 5 dias úteis |
| Situação | Texto | OK / Em Atendimento / Em Atraso |
| Dias Execução | Inteiro | Dias entre saída e retorno |
| Faixa Execução | Texto | Em Atendimento / Até 3 dias / 4 a 7 dias / 8 a 15 dias / Mais de 15 dias |
| Ocorrências | Inteiro | Quantas vezes o ID aparece na tabela |
| Latitude | Decimal | Coordenada geográfica |
| Longitude | Decimal | Coordenada geográfica |

---

## Estrutura de Arquivos

```
dashboard-seconser/
├── index.html                  — Visão Geral (página principal)
├── css/
│   └── style.css               — Estilos globais + responsividade
├── js/
│   ├── config.js               — URL do Apps Script e estado global
│   ├── utils.js                — Funções utilitárias (formatação, datas)
│   ├── data.js                 — Fetch + cache + normalização do CSV
│   ├── charts.js               — Fábricas de gráficos Chart.js
│   ├── filters.js              — Filtros e topbar
│   ├── render.js               — Render da Visão Geral
│   └── main.js                 — Ponto de entrada
├── pages/
│   ├── mapa.html               — Mapa (JS inline)
│   ├── qualidade.html
│   ├── qualidade.js
│   ├── tendencia.html
│   └── tendencia.js
├── img/
│   └── logo-seconser.png
└── docs/
    └── screenshots/
        ├── visao-geral.png
        ├── mapa-completo.png
        ├── mapa-abertos.png
        ├── mapa-regiao.png
        ├── qualidade.png
        └── tendencia.png
```

---

## Atualização dos Dados

Para atualizar os dados do dashboard, basta atualizar a planilha Excel de origem e exportar para o Google Sheets via Power Query. O dashboard buscará os dados atualizados automaticamente na próxima sessão.

Para trocar a planilha de origem, atualize o ID no Google Apps Script e a URL em `js/config.js`.
