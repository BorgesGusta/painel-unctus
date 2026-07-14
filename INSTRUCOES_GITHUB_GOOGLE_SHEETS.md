# Painel Unctus conectado ao Google Sheets

## Arquivos

- `index.html`: painel pronto para hospedar no GitHub Pages.
- `Metas_Diarias_Unctus_com_Painel_Web.xlsx`: planilha com a aba `Painel Web` já criada.

## 1. Levar a planilha para o Google Sheets

1. Abra o Google Drive.
2. Envie o arquivo `Metas_Diarias_Unctus_com_Painel_Web.xlsx`.
3. Abra-o com o Google Sheets.
4. Confira a aba `Painel Web`.
5. Não altere os nomes das colunas:
   - Consultor
   - ProspMeta
   - ProspReal
   - OrcMeta
   - OrcReal
   - FechMeta
   - FechReal

As colunas de realizado já puxam os números das abas existentes. As metas de orçamento e fechamento podem ser alteradas diretamente na aba `Painel Web`.

## 2. Publicar somente a aba Painel Web

1. No Google Sheets, acesse **Arquivo → Compartilhar → Publicar na Web**.
2. Em vez de “Documento inteiro”, selecione **Painel Web**.
3. Escolha o formato **Valores separados por vírgulas (.csv)**.
4. Clique em **Publicar**.
5. Copie o link gerado.

> O link publicado permite leitura pública somente dos dados da aba escolhida. Não publique dados confidenciais nessa aba.

## 3. Publicar o painel gratuitamente no GitHub Pages

1. Entre no GitHub e crie um repositório, por exemplo: `painel-unctus`.
2. Envie o arquivo `index.html` para a raiz do repositório.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, selecione:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Pasta: `/root`
5. Salve.
6. O endereço ficará parecido com:
   `https://SEU-USUARIO.github.io/painel-unctus/`

## 4. Conectar o painel

1. Abra o endereço do GitHub Pages.
2. Clique na engrenagem no canto superior direito.
3. Cole o link CSV publicado pelo Google Sheets.
4. Clique em **Salvar e atualizar**.

O link fica salvo no navegador e o painel busca os dados novamente a cada 15 segundos.

## Atualização em “tempo real”

O Google Sheets pode levar alguns segundos para atualizar o CSV publicado. O painel consulta a planilha a cada 15 segundos e ignora cache. Na prática, uma alteração normalmente aparece logo após a próxima consulta.

## Exibir em uma TV

Abra o endereço do GitHub Pages no navegador da TV ou em um computador conectado à TV e ative tela cheia. O painel se ajusta automaticamente à resolução.
