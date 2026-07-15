# CLAUDE.md

Notas técnicas para quem (ou qual agente) for dar manutenção neste projeto.

## O que é

Painel comercial estático para a Unctus Acabamentos. HTML + CSS + JavaScript puro, sem
build, sem framework, sem backend. Hospedado no GitHub Pages. Lê dados de uma aba do
Google Sheets publicada como CSV (arquitetura descrita no README.md).

## Regras fixas do projeto

- Sem React/Vue/Angular/TypeScript/Node/npm/backend/banco de dados/n8n/Apps Script.
- Sem CSS ou JavaScript inline em `index.html`.
- Sem dependências externas além do Google Fonts (Inter).
- Sem `innerHTML` com dado vindo da planilha — sempre `textContent`.
- Sem `console.log`; apenas `console.error` para falhas reais (dentro de `catch`).

## Arquivos

- `index.html` — estrutura estática. IDs usados pelo `app.js` e o `<template>` dos cards
  de consultor vivem aqui.
- `style.css` — único lugar com estilo. Paleta e variáveis em `:root`. Classes
  dinâmicas adicionadas via JS (`is-leader`, `level-good`, `level-warning`, `level-low`)
  precisam ter regra correspondente aqui.
- `app.js` — um único IIFE. Seções: parsing de CSV, cálculos, formatação, renderização,
  estado de conexão, carregamento de dados (`fetch` + polling).
- `config.js` — único arquivo que o usuário final edita (`sheetUrl`, `refreshInterval`,
  `companyName`, `panelTitle`).

## Contrato do CSV (aba `Painel_API`)

Colunas, nesta ordem exata:

```
Tipo,Nome,ProspMeta,ProspReal,FollowMeta,FollowReal,LeadsMeta,LeadsReal,Meta,Real
```

- `Tipo=consultor`: usa `Nome`, `ProspMeta/Real`, `FollowMeta/Real`, `LeadsMeta/Real`.
- `Tipo=equipe`: usa `Nome`, `Meta`, `Real`. O painel identifica o time de orçamentos e
  o de vendas normalizando o nome (minúsculas, sem acento) e checando se começa com
  `orcamento` ou `venda` — não depende da ordem das linhas.

`app.js` valida a presença das 10 colunas no cabeçalho antes de processar qualquer linha
(`rowsToObjects` lança `CsvStructureError` se faltar alguma).

## Origem dos dados na planilha real

A planilha de trabalho (`Metas Diarias - Unctus`) tem abas separadas para lançamento
diário:

- `Metas por Consultor`: um bloco de 5 linhas por consultor (uma por dia), com metas e
  realizados de prospecção (colunas C/D), follow-up (F/G) e leads (I/J).
- `Metas Diárias Equipe`: uma linha por dia com metas e realizados de orçamento
  (colunas B/C) e vendas (E/F).
- `Painel Equipe`: aba de métricas extras (contatos abordados, taxa de resposta etc.) —
  **não** faz parte do contrato do painel e não deve ser usada nas fórmulas da aba
  `Painel_API`.

A aba `Painel_API` (a que é publicada como CSV) deve agregar essas duas primeiras abas
com `SUMIF` por nome do consultor / por linhas que começam com "Dia", em vez de somar por
número de linha fixo — assim ela não quebra se alguém inserir ou remover uma linha nas
abas de origem. As fórmulas completas estão no README.md, seção 1.

## Cálculo de performance

Para cada consultor:

```
percProsp  = ProspReal  / ProspMeta  * 100   (0 se ProspMeta  for 0)
percFollow = FollowReal / FollowMeta * 100   (0 se FollowMeta for 0)
percLeads  = LeadsReal  / LeadsMeta  * 100   (0 se LeadsMeta  for 0)
performance = (percProsp + percFollow + percLeads) / 3
```

Barras de progresso são sempre limitadas a 100% de largura (`clampPercent`); o texto do
percentual pode passar de 100%. Faixas de cor (`levelFromPercent`): `>=100` verde,
`>=50` dourado, abaixo disso vermelho.

## Ranking

Consultores são ordenados por `performance` decrescente (empate resolvido pela ordem
original de leitura do CSV, para estabilidade). O 1º colocado recebe o rótulo
"Destaque da equipe" e a classe `is-leader`; os demais recebem `Nº da equipe`.

## Atualização automática

`loadData()` roda uma vez no carregamento e depois a cada `config.refreshInterval` ms
(padrão 15000). Cada requisição usa `fetch(url, { cache: "no-store" })` com
`?cache=<Date.now()>` (ou `&cache=`) anexado à URL. Em caso de falha, os últimos dados
válidos (`state.consultants` / `state.teams`) permanecem na tela.

## Ao alterar este projeto

- Se adicionar um novo `id` em `index.html`, confirme que `app.js` usa exatamente esse
  nome em `document.querySelector`.
- Se adicionar uma classe dinâmica em `app.js` (via `classList.add`), adicione a regra
  correspondente em `style.css`.
- Não hospede fora do GitHub Pages sem revisar CORS: o CSV publicado do Google Sheets
  já permite `fetch` de qualquer origem, mas outros formatos de link do Sheets podem não
  permitir.
