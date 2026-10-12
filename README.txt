JD NEWS — VERSÃO PROFISSIONAL 2.0
=================================

O QUE ESTA VERSÃO INCLUI
- Layout editorial renovado, adaptado para celular, tablet e computador.
- Página inicial com destaque principal, cards de notícias, busca e filtro por editoria.
- Leitura de matéria em janela acessível, com suporte a teclado/Esc.
- Painel administrativo com login no servidor.
- Criar, editar, excluir e destacar notícias.
- Upload de imagens JPG, PNG, WEBP ou GIF de até 5 MB.
- Banco de dados SQLite para matérias, mantido entre reinicializações.
- Sessões administrativas armazenadas em SQLite, cookies HttpOnly e SameSite, limite de tentativas de login e cabeçalhos de segurança.
- Conteúdo demonstrativo inicial, para substituir por matérias apuradas.

REQUISITOS
- Node.js 20 ou superior.
- npm.

COMO INSTALAR NO WINDOWS
1. Extraia a pasta JD_News_Pro para um local no computador.
2. Instale Node.js 20+ a partir do site oficial: https://nodejs.org/
3. Abra o Prompt de Comando ou PowerShell dentro da pasta JD_News_Pro.
4. Instale as dependências executando: npm install
5. Copie o arquivo .env.example para um novo arquivo chamado .env.
   No PowerShell: Copy-Item .env.example .env
   No Prompt de Comando: copy .env.example .env
6. Abra o arquivo .env e configure:
   - SESSION_SECRET: uma chave aleatória longa com pelo menos 32 caracteres.
   - ADMIN_USERNAME: o usuário desejado para entrar no painel.
   - ADMIN_PASSWORD: uma senha forte com pelo menos 12 caracteres.
   Não publique nem compartilhe o arquivo .env.
7. Inicie o site: npm start
8. Abra no navegador: http://localhost:3000
9. Painel editorial: http://localhost:3000/admin.html

EXEMPLO DE .env PARA DESENVOLVIMENTO
PORT=3000
NODE_ENV=development
SESSION_SECRET=troque-por-uma-chave-aleatoria-longa-com-no-minimo-32-caracteres
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ColoqueUmaSenhaForteAqui123!
TRUST_PROXY=false
Troque os valores de exemplo por valores seus. Não use a senha do exemplo.

ONDE OS DADOS FICAM
- jdnews.sqlite: banco SQLite com as matérias.
- sessions.sqlite: sessões administrativas.
- public/uploads/: imagens enviadas pelo painel.
- .env: credenciais e configuração privada.
Faça backup desses arquivos/pastas de forma segura. Não apague o banco se quiser manter as notícias.

ANTES DE COLOCAR NA INTERNET
Esta pasta contém o código da aplicação; ela não foi publicada automaticamente na internet.
Para produção, hospede em um servidor compatível com Node.js, configure domínio e HTTPS, use uma SESSION_SECRET única, defina NODE_ENV=production, configure TRUST_PROXY=true apenas se estiver atrás de um proxy confiável e mantenha dependências/servidor atualizados. Em produção, a aplicação se recusa a iniciar com credenciais ausentes ou fracas. Restrinja acesso aos arquivos .env, bancos e backups. Considere armazenamento de imagens persistente se usar hospedagem com disco efêmero.

SEGURANÇA E LIMITES
- Não há cadastro público de administradores; o usuário e a senha são configurados no .env do servidor.
- A senha não é inserida no HTML ou no JavaScript do navegador, mas é mantida no ambiente do servidor; proteja o servidor e o .env.
- O limite de tentativas de login é aplicado por IP.
- A newsletter é apenas demonstrativa; precisa de integração com um provedor de e-mail para enviar mensagens.
- Os arquivos de imagem enviados ficam no disco do servidor. Configure limites e backups no ambiente de hospedagem.
- Para sites jornalísticos públicos, mantenha revisão editorial, fontes identificadas, correções e política de privacidade adequadas.

DADOS DEMONSTRATIVOS
As notícias iniciais são exemplos ilustrativos, não notícias atuais verificadas. Edite ou exclua essas matérias antes de abrir o portal ao público.
