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

## Gestor e novas regras (importante)

As regras do Firestore mudaram: o arquivo `firestore.rules` agora inclui a área do gestor, a tela de liberar e-mails, as configurações de cada consultor e o aviso de cliente repetido. **Cole o conteúdo novo em Firestore, aba Regras, e toque em Publicar.** Sem isso, as telas novas dão erro de permissão.

Para ser **gestor**: no Firestore crie a coleção `gestores` e, nela, um documento cujo ID é o seu e-mail em minúsculas (pode deixar sem campos). O e-mail também precisa estar em `autorizados`. A coleção `gestores` só se edita pelo console do Firebase, nunca pelo sistema.

O gestor ganha a aba **Equipe**:
- Números de cada consultor (clientes, em conversa, recuperados, perdidos, taxa, contatos de hoje e dos últimos 7 dias), sem ver nomes de clientes
- Motivos de saída mais comuns e o que trouxe os clientes de volta
- Lista de consultores liberados, com botão para liberar ou remover e-mails sem entrar no console

Se a aba Equipe mostrar erro pedindo um índice, abra o console do navegador (F12), toque no link da mensagem e crie o índice. Só acontece na primeira vez.

## O que o sistema faz

- **Busca e filtros:** por nome, telefone ou motivo da saída
- **Seleção em massa:** botão Selecionar; mudar etapa, marcar retorno ou excluir vários de uma vez
- **Baixar Excel:** toda a lista, para backup ou relatório
- **Mensagens próprias:** na aba Ajustes, cada consultor escreve seus textos de WhatsApp (variáveis {nome}, {consultor}, {negocio}, {motivo})
- **Meta diária:** barra de contatos feitos hoje
- **Avisos de retorno:** número de pendentes no título da página e, se o consultor ativar em Ajustes, uma notificação ao abrir o sistema. Aviso com o sistema fechado exige um servidor e não está ligado
- **Cliente repetido:** quando dois consultores cadastram o mesmo telefone, aparece "Também com (nome)". O sistema guarda só o número e o nome de quem cadastrou primeiro, nunca os dados do cliente
- **O que trouxe de volta:** ao marcar Recuperado, o consultor escolhe o motivo da volta, e isso aparece em Resultados e na aba Equipe

## Planilha para importar

Primeira linha com os títulos: Nome, Negócio, Telefone, Motivo, Origem. Só nome ou telefone já bastam. Clientes com telefone repetido são ignorados.

## Trocar as cores

No início do `index.html`, dentro de `<style>`, ficam as cores: `--primary` (amarelo da marca, #FFB71B), `--brand-dark` (cinza escuro, #484748), `--bg` e outras, uma versão para o tema claro e outra para o escuro.

## Observação

Os arquivos foram escritos sem testar com um projeto Firebase real. Se aparecer erro de login ou de gravação, abra o console do navegador (F12) e veja a mensagem. Os erros mais comuns são regras não publicadas, e-mail fora da lista `autorizados` e domínio não autorizado.
