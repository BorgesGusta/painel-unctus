# Painel Unctus V2

## Estrutura

- `index.html`
- `style.css`
- `app.js`
- `config.js`

## Como conectar ao Google Sheets

Abra o arquivo `config.js` e substitua:

```js
sheetUrl: "COLE_AQUI_O_LINK_CSV_PUBLICADO_DO_GOOGLE_SHEETS"
```

pelo link CSV publicado da aba `Painel Web`.

Exemplo:

```js
sheetUrl: "https://docs.google.com/spreadsheets/d/e/SEU_CODIGO/pub?gid=123456&single=true&output=csv"
```

## Como testar no VS Code

Use a extensão Live Server e abra o `index.html`.

## Como enviar para o GitHub

```bash
git add .
git commit -m "Atualiza painel para versão responsiva"
git push
```

## Responsividade

- Desktop e TV: três cards lado a lado
- Tablet: dois cards por linha
- Celular: um card por linha
- Atualização automática a cada 15 segundos
