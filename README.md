# Dashboard DIP · Seconser Niterói

Dashboard operacional do **Departamento de Iluminação Pública (DIP)** da Seconser Niterói. Permite acompanhar em tempo real o fluxo de entrada e saída de demandas, qualidade do atendimento e distribuição geográfica dos serviços no município.

🔗 **[Acessar o dashboard](https://alves077.github.io/dashboard-seconser/)**

---

## Páginas

### Visão Geral
Painel principal com KPIs consolidados, distribuição por categoria, reaberturas, tempo de execução, serviços por região, top 10 bairros e volume mensal de demandas. Possui filtros por período, região e categoria.

![Visão Geral](docs/screenshots/visao-geral.png)

### Mapa
Visualização georreferenciada dos 12.730+ registros sobre o mapa de Niterói. Permite filtrar por situação (OK / Em Atendimento / Em Atraso) e por região, com zoom automático e painel lateral com KPIs, abertos por região, top bairros em aberto e serviços mais antigos em atraso.

![Mapa — todos os pontos](docs/screenshots/mapa-completo.png)
![Mapa — somente abertos](docs/screenshots/mapa-abertos.png)
![Mapa — filtro por região (Oceânica)](docs/screenshots/mapa-regiao.png)

### Qualidade
Indicadores de qualidade do atendimento: taxa de conclusão, reincidência, resolução rápida, cauda longa, tempo médio e percentual em atraso. Inclui histograma de tempo de execução dia a dia, distribuição de faixas por região e evolução mensal.

![Qualidade](docs/screenshots/qualidade.png)

### Tendência
Análise temporal: mês de pico, variação mensal, saldo acumulado e cumprimento de prazo. Gráfico de fluxo (entradas × concluídos × saldo acumulado), tabela de calor de sazonalidade por categoria e evolução mensal de prazo e tempo médio.

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
| Hospedagem | GitHub Pages |

---

## Fonte de Dados

Os dados são exportados de uma planilha Excel alimentada manualmente pela equipe do DIP, processada via Power Query e publicada no Google Sheets. O dashboard acessa os dados através de um **Google Apps Script** com autenticação por token, mantendo a planilha privada.

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
| Prazo | Data | Data Saída + 5 dias |
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
├── index.html              — Visão Geral (página principal)
├── img/
│   └── logo-seconser.png   — Logo institucional
├── css/
│   └── style.css           — Estilos globais + responsividade
├── js/
│   ├── config.js           — URL do CSV e estado global
│   ├── utils.js            — Funções utilitárias
│   ├── data.js             — Fetch + cache + normalização
│   ├── charts.js           — Fábricas de gráficos
│   ├── filters.js          — Filtros e topbar
│   ├── render.js           — Render da Visão Geral
│   └── main.js             — Ponto de entrada
└── pages/
    ├── mapa.html / (js inline)
    ├── qualidade.html + qualidade.js
    └── tendencia.html + tendencia.js
```

---

## Atualização dos Dados

Para atualizar os dados do dashboard, basta atualizar a planilha Excel de origem e exportar para o Google Sheets via Power Query. O dashboard buscará os dados atualizados automaticamente na próxima sessão.

Para trocar a planilha de origem, atualize o ID no Google Apps Script e a URL em `js/config.js`.
