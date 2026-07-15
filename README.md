# Painel Comercial — Unctus Acabamentos

Painel comercial estático (HTML, CSS e JavaScript puro) que lê dados de uma aba do Google
Sheets publicada como CSV e atualiza automaticamente a cada 15 segundos. Não usa build,
frameworks, backend nem banco de dados — pode ser hospedado gratuitamente no GitHub Pages.

## Estrutura do projeto

```
index.html    Estrutura da página (sem CSS/JS embutido)
style.css     Todo o visual do painel
app.js        Parser de CSV, cálculos e atualização automática
config.js     Único arquivo que você precisa editar
README.md     Este arquivo
CLAUDE.md     Notas técnicas do projeto
.gitignore
```

## 1. Como preparar a aba `Painel_API` no Google Sheets

O painel não lê a planilha de metas diárias diretamente — ele lê uma aba resumo chamada
`Painel_API`, com exatamente estas 10 colunas:

```
Tipo,Nome,ProspMeta,ProspReal,FollowMeta,FollowReal,LeadsMeta,LeadsReal,Meta,Real
```

- Linhas com `Tipo = consultor` usam `Nome`, `ProspMeta`, `ProspReal`, `FollowMeta`,
  `FollowReal`, `LeadsMeta`, `LeadsReal` (as colunas `Meta`/`Real` ficam vazias).
- Linhas com `Tipo = equipe` usam `Nome`, `Meta`, `Real` (as colunas de prospecção,
  follow-up e leads ficam vazias).

### 1.1. Criando a aba

1. Na planilha `Metas Diarias - Unctus`, clique em **+** na parte inferior e crie uma aba
   chamada exatamente `Painel_API`.
2. Na primeira linha, cole o cabeçalho acima (uma coluna por célula, de A a J).

### 1.2. Fórmulas para os consultores

Na planilha analisada, a aba **Metas por Consultor** tem um bloco de 5 linhas diárias por
consultor (colunas C/D = prospecção meta/realizado, F/G = follow-up meta/realizado,
I/J = leads meta/realizado), seguido de uma linha "Total Consultor N". As fórmulas abaixo
somam as 5 linhas diárias pelo nome do consultor — assim elas continuam funcionando mesmo
se você inserir, remover ou reordenar linhas na aba de origem.

Linha 2 (Adriano):

```
A2: consultor
B2: Adriano
C2: =SUMIF('Metas por Consultor'!$A:$A,"Adriano",'Metas por Consultor'!C:C)
D2: =SUMIF('Metas por Consultor'!$A:$A,"Adriano",'Metas por Consultor'!D:D)
E2: =SUMIF('Metas por Consultor'!$A:$A,"Adriano",'Metas por Consultor'!F:F)
F2: =SUMIF('Metas por Consultor'!$A:$A,"Adriano",'Metas por Consultor'!G:G)
G2: =SUMIF('Metas por Consultor'!$A:$A,"Adriano",'Metas por Consultor'!I:I)
H2: =SUMIF('Metas por Consultor'!$A:$A,"Adriano",'Metas por Consultor'!J:J)
I2: (deixe vazio)
J2: (deixe vazio)
```

Linha 3 (Vinicius) e linha 4 (Gustavo): copie a linha 2 para baixo e troque apenas o nome
em `B` e em cada `SUMIF` (`"Adriano"` → `"Vinicius"` ou `"Gustavo"`). Se surgir um quarto
consultor, adicione uma nova linha seguindo o mesmo padrão — o painel numera o ranking
automaticamente, não há limite de consultores.

### 1.3. Fórmulas para a equipe (orçamentos e vendas)

A aba **Metas Diárias Equipe** tem uma linha por dia (coluna A = "Dia 1", "Dia 2"...) com
`Meta orçamento` na coluna B, `Orçamento realizado` na C, `Meta vendas` na E e
`Vendas realizado` na F. As fórmulas somam todas as linhas cujo nome começa com "Dia",
totalizando a semana automaticamente:

Linha 5 (Orçamentos):

```
A5: equipe
B5: Orçamentos
I5: =SUMIF('Metas Diárias Equipe'!$A:$A,"Dia*",'Metas Diárias Equipe'!B:B)
J5: =SUMIF('Metas Diárias Equipe'!$A:$A,"Dia*",'Metas Diárias Equipe'!C:C)
```

Linha 6 (Vendas):

```
A6: equipe
B6: Vendas
I6: =SUMIF('Metas Diárias Equipe'!$A:$A,"Dia*",'Metas Diárias Equipe'!E:E)
J6: =SUMIF('Metas Diárias Equipe'!$A:$A,"Dia*",'Metas Diárias Equipe'!F:F)
```

(As colunas I e J aqui correspondem a `Meta` e `Real` do cabeçalho — a 9ª e a 10ª coluna.)

> Se os nomes das abas de origem forem diferentes na sua cópia da planilha, ajuste o nome
> entre aspas simples nas fórmulas (`'Metas por Consultor'`, `'Metas Diárias Equipe'`) para
> o nome exato da sua aba.

## 2. Como publicar a aba `Painel_API` em CSV

1. Abra a planilha no Google Sheets.
2. Vá em **Arquivo → Compartilhar → Publicar na Web**.
3. No primeiro menu, troque "Documento inteiro" pela aba **Painel_API**.
4. No segundo menu, escolha **Valores separados por vírgula (.csv)**.
5. Clique em **Publicar** e confirme.
6. Copie o link gerado (algo como
   `https://docs.google.com/spreadsheets/d/e/SEU_ID/pub?gid=123&single=true&output=csv`).

O link publicado é somente leitura e público — não publique dados sensíveis nessa aba.

## 3. Como inserir o link no `config.js`

Abra `config.js` e substitua o valor de `sheetUrl` pelo link copiado no passo anterior:

```js
window.PAINEL_CONFIG = {
  sheetUrl: "https://docs.google.com/spreadsheets/d/e/SEU_ID/pub?gid=123&single=true&output=csv",
  refreshInterval: 15000,
  companyName: "Unctus Acabamentos",
  panelTitle: "Painel Comercial"
};
```

Enquanto `sheetUrl` não for preenchido, o painel exibe um aviso explicando que falta
configurar o link — ele não tenta buscar dados nesse estado.

## 4. Como testar localmente com Live Server

1. Abra a pasta do projeto no VS Code.
2. Instale a extensão **Live Server** (se ainda não tiver).
3. Clique com o botão direito em `index.html` → **Open with Live Server**.
4. O navegador abre em `http://127.0.0.1:5500` (ou porta semelhante) já consultando o CSV
   publicado.

## 5. Como publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `painel-unctus`).
2. Envie todos os arquivos do projeto para a raiz do repositório (`git add`, `git commit`,
   `git push` — veja o passo 6).
3. No repositório, vá em **Settings → Pages**.
4. Em **Build and deployment → Source**, selecione `Deploy from a branch`.
5. Em **Branch**, selecione `main` e a pasta `/root`, depois **Save**.
6. Após alguns minutos, o painel fica disponível em
   `https://SEU-USUARIO.github.io/painel-unctus/`.

## 6. Como atualizar o projeto com Git

```bash
git add .
git commit -m "Atualiza o painel"
git push
```

O GitHub Pages publica a nova versão automaticamente alguns instantes depois do push.

## 7. Como resolver problemas de cache

- O painel já busca o CSV com `fetch(url, { cache: "no-store" })` e acrescenta
  `?cache=<timestamp>` (ou `&cache=<timestamp>`) a cada requisição, então o navegador não
  deveria reaproveitar uma resposta antiga.
- O próprio Google Sheets pode levar alguns segundos para atualizar o CSV publicado depois
  de uma edição — nesse caso, aguarde o próximo ciclo de 15 segundos.
- Se estiver testando no navegador e algo parecer desatualizado, force um recarregamento
  completo da página (Ctrl/Cmd + Shift + R) para descartar qualquer cache do próprio
  navegador para o `index.html`, `app.js` ou `style.css`.
- No GitHub Pages, uma nova publicação pode demorar 1 a 2 minutos para propagar; o CSV do
  Google Sheets, porém, atualiza de forma independente do GitHub Pages.

## 8. Como validar o CSV diretamente no navegador

1. Cole o link publicado (o mesmo do `sheetUrl`) diretamente na barra de endereço do
   navegador e pressione Enter.
2. O navegador deve baixar ou exibir um texto separado por vírgulas começando pela linha
   `Tipo,Nome,ProspMeta,ProspReal,FollowMeta,FollowReal,LeadsMeta,LeadsReal,Meta,Real`.
3. Confira se cada linha `consultor` tem um nome e números nas colunas de prospecção,
   follow-up e leads, e se cada linha `equipe` tem `Meta` e `Real` preenchidos.
4. Se o cabeçalho estiver diferente ou faltar alguma coluna, o painel mostra um aviso de
   erro amigável explicando quais colunas estão ausentes — corrija a aba `Painel_API` e
   aguarde a próxima atualização automática.

## Comportamento em caso de falha

- Sem `sheetUrl` configurado: o painel exibe um aviso fixo pedindo para configurar
  `config.js` e não tenta buscar dados.
- Falha de rede ou CSV temporariamente indisponível: o painel mantém os últimos dados
  válidos na tela e mostra "Falha na atualização" / "Mantendo os últimos dados".
- CSV com colunas ausentes: o painel mostra a mensagem de erro específica listando as
  colunas que faltam, mantendo os últimos dados válidos (se houver).
