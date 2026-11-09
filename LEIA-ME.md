# Recupera Clientes (versão com login)

Sistema para consultores recuperarem clientes que saíram. Cada consultor entra com o próprio e-mail e senha e vê só os próprios clientes.

Esta é uma ferramenta feita por consultores, não um sistema oficial da FaturePag. Antes de usar a logo e o nome da empresa, confirme com a empresa.

## O que tem

- Login com e-mail e senha (com confirmação de e-mail) e opção de entrar com Google
- Lista de e-mails liberados: só quem você liberar consegue usar
- Funil, mensagens prontas de WhatsApp, lembretes, roteiro de objeções e resultados
- Cadastro manual e importação de planilha (Excel ou CSV)

## Passo a passo

1. **Criar o projeto.** Em console.firebase.google.com, crie um projeto (pode desligar o Google Analytics).
2. **Ativar o login.** Authentication, Método de login, ative **E-mail/senha**. Se quiser o botão do Google, ative **Google** também.
3. **Criar o banco.** Firestore Database, Criar banco de dados, modo produção, região `southamerica-east1` (São Paulo).
4. **Colar as regras.** Em Firestore, aba Regras, apague o que estiver lá, cole o conteúdo do arquivo `firestore.rules` e toque em Publicar. Sem esse passo os dados ficam desprotegidos ou o sistema não grava.
5. **Pegar as chaves.** Configurações do projeto, Seus apps, ícone Web (`</>`), registre o app e copie o `firebaseConfig`. Cole os valores no arquivo `firebase-config.js`.
6. **Liberar os consultores.** Firestore, Iniciar coleção, nome da coleção `autorizados`. O **ID do documento é o e-mail em letras minúsculas** (exemplo: `maria@gmail.com`). Crie um campo qualquer, como `nome` com o nome da pessoa. Faça isso para o seu e-mail e para o de cada consultor.
7. **Logo.** Já vai uma `assets/logo.png` recortada de um print do site, com pouca resolução. Se tiver a logo original, troque o arquivo mantendo o nome. Sem ela, aparece o nome em texto.
8. **Publicar o site.** O sistema não abre com duplo clique no arquivo, precisa estar hospedado. A forma mais simples é o Firebase Hosting: instale o Firebase CLI e, na pasta do projeto, rode `firebase login`, `firebase use SEU_PROJETO` e `firebase deploy`. GitHub Pages ou Netlify também servem.
9. **Autorizar o endereço.** Authentication, Configurações, Domínios autorizados: confira se o endereço do site está na lista (necessário para o login com Google).

## Como cada consultor usa

1. Abre o endereço do site e toca em **Criar conta**.
2. Usa o e-mail que você liberou no passo 6.
3. Abre o e-mail de confirmação, toca no link e volta ao site.
4. Pronto: cadastra clientes ou importa a planilha.

Para tirar o acesso de alguém, apague o documento dele na coleção `autorizados`.

## Instalar como app no celular

O sistema já é um app instalável (PWA). Depois de hospedado (passo 8):

- **Android (Chrome):** abra o endereço, toque em **Instalar app** no topo, ou no menu do Chrome em **Instalar app** / **Adicionar à tela inicial**. O ícone aparece na tela e abre sem a barra do navegador.
- **iPhone (Safari):** abra o endereço, toque em Compartilhar e depois em **Adicionar à Tela de Início**.

Para gerar um **APK** a partir do site já hospedado, use o PWABuilder (pwabuilder.com): cole o endereço do site e baixe o pacote Android. Para publicar na Play Store é preciso conta de desenvolvedor.

O login com Google pode não funcionar dentro de um APK do tipo WebView. O login com e-mail e senha funciona normalmente.

## Importar por foto

Em **Importar planilha** há a opção **Foto da lista**: o app lê nomes e telefones de uma foto, mostra o texto reconhecido numa caixa e você corrige antes de importar. A leitura roda no navegador (Tesseract.js) e precisa de internet na primeira vez. Dá melhor resultado com foto reta, bem iluminada e letra legível. Letra cursiva e fotos tortas costumam errar, por isso sempre confira os telefones.

## Planilha para importar

Primeira linha com os títulos: Nome, Negócio, Telefone, Motivo, Origem. Só nome ou telefone já bastam. Clientes com telefone repetido são ignorados.

## Trocar as cores

No início do `index.html`, dentro de `<style>`, ficam as cores: `--primary` (amarelo da marca, #FFB71B), `--brand-dark` (cinza escuro, #484748), `--bg` e outras, uma versão para o tema claro e outra para o escuro.

## Observação

Os arquivos foram escritos sem testar com um projeto Firebase real. Se aparecer erro de login ou de gravação, abra o console do navegador (F12) e veja a mensagem. Os erros mais comuns são regras não publicadas, e-mail fora da lista `autorizados` e domínio não autorizado.
