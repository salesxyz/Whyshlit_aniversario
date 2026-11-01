# Whylist

Sugestões de presentes de aniversário com Pix e painel administrativo. Os presentes são ideias opcionais: a lista não reserva nem marca itens como escolhidos.

## Executar localmente

Requer Node.js 20.6 ou superior. A instalação de dependências não é necessária.

```powershell
Copy-Item .env.example .env
# Edite .env e preencha ADMIN_PASSWORD antes de iniciar.
npm start
```

Abra `http://localhost:3000`. O arquivo `.env` é lido pelo comando de inicialização e está excluído do Git. Sem Supabase, o servidor local salva a lista em `data/state.json`; imagens e pagamentos Stripe exigem as configurações descritas abaixo. O modo local não deve ser usado como armazenamento de produção.

## Estrutura do projeto

```
server.js            servidor local (arquivos de public/ + API)
api/[...path].js     entrada da API na Vercel
src/server/          backend: config, http, auth, validation, routes, stores/, services/
public/              frontend (módulos ES nativos, sem build)
  index.html, default-state.json
  css/               tokens, base, components, page, admin
  js/lib/            utilitários: dom, pix, qr, imagens, formatação
  js/state/          store, ações, normalização, localStorage
  js/api/            cliente da API
  js/ui/             telas públicas (hero, Pix, presentes, pagamento)
  js/admin/          login, barra, checklist, edição de presentes e Pix
tests/               node --test (Pix, validação, estado, API)
```

Rode os testes com `npm test`. O frontend usa módulos ES: sem backend, sirva a pasta `public/` por HTTP (abrir o `index.html` direto via `file://` não funciona).

## Publicar na Vercel

1. Crie um projeto Supabase e execute [`supabase/schema.sql`](./supabase/schema.sql) no SQL Editor. Isso cria as tabelas de estado e de mensagens, além do bucket público de imagens `whylist-assets`. Se o Supabase já estava configurado, execute o script novamente para criar a tabela privada de mensagens. Se você executou uma versão anterior do esquema, o script também remove a antiga função que marcava presentes automaticamente.
2. Importe este projeto na Vercel. O arquivo `api/[...path].js` atende as rotas da API; o conteúdo estático da pasta `public/` (definida em `vercel.json`) é servido diretamente pela Vercel. Não envie nem versione o arquivo `.env`; configure os valores em **Settings > Environment Variables** no projeto Vercel.
3. Configure as variáveis de ambiente no projeto Vercel (ou preencha o `.env` apenas para execução local):
   - `ADMIN_PASSWORD`: senha de administrador com pelo menos 12 caracteres.
   - `SESSION_SECRET`: segredo aleatório longo para assinar cookies de sessão. Se omitido, é derivado da senha de administrador; prefira defini-lo.
   - `SUPABASE_URL`: URL HTTPS do projeto Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: chave `service_role`, somente no servidor. Nunca a coloque no frontend nem no controle de versão.
   - `SUPABASE_STORAGE_BUCKET`: opcional; por padrão `whylist-assets`. Se usar outro bucket, crie-o como público, limite uploads a JPEG de até 1 MB e mantenha a escrita restrita ao servidor.
   - `STRIPE_SECRET_KEY`: chave secreta Stripe. Comece com uma chave de teste (`sk_test_`) e mantenha-a somente no servidor.
4. Habilite cartão em **Settings > Payments > Payment methods** na Stripe. O Checkout aceita somente cartão de crédito à vista em BRL. O Pix é feito diretamente para a chave da conta cadastrada no site, fora da Stripe.
5. Teste o checkout em modo de teste antes de substituir a chave por uma chave de produção (`sk_live_`).

O painel administrativo usa um cookie assinado, compatível com funções serverless; não depende de sessões guardadas em memória. A lista e as imagens ficam no Supabase. O bucket é público somente para leitura das imagens; os uploads são feitos pela API autenticada do administrador.

## Sugestões e contribuições

- Os presentes são sugestões; não existe reserva, obrigação de compra nem indicação de que um item foi escolhido.
- Se a Stripe estiver configurada, **Pagar com cartão** abre o checkout hospedado do Stripe. O cartão é pago à vista. Em presentes com valor definido, o valor é uma sugestão de contribuição; o convidado pode editá-lo. A contribuição mínima no cartão é R$ 50,00.
- No Pix direto, o convidado pode digitar o valor que quiser; se deixar o campo em branco, escolhe o valor no app do banco.
- O retorno do checkout não confirma o pagamento. Confira a situação do cartão diretamente na Stripe; pagamentos Pix diretos não são detectados pelo site.
- A página não registra o pagamento como status do presente. A lista permanece igual depois do checkout, inclusive se várias pessoas escolherem a mesma sugestão.
- O botão **Contribuir com Pix** gera QR code e Pix copia e cola para a chave cadastrada, independentemente da configuração do Stripe. Transferências diretas não são confirmadas pelo site.
- Visitantes podem enviar uma mensagem privada para o aniversariante; o administrador consulta as 100 mais recentes no botão **Mensagens** da barra administrativa. Em produção, as mensagens ficam na tabela `whylist_messages` do Supabase; no modo local, em `data/messages.jsonl`.

## Editar a lista

- Na página inicial, escolha **Entrar como aniversariante**, informe `ADMIN_PASSWORD` e escolha **Editar lista**. Patrocinadores podem acessar a lista sem login.
- Preencha nome, data, mensagem e dados Pix; adicione, edite ou remova presentes e salve. Com Supabase, as alterações ficam disponíveis aos visitantes.
- Fotos podem ser escolhidas, arrastadas ou coladas no editor; são reduzidas no navegador e enviadas como JPEG ao bucket Supabase, com limite de 1 MB por imagem. Ícones continuam disponíveis.
- O painel mostra um checklist do que falta publicar, permite reordenar presentes, visualizar como visitante e salvar com Ctrl+S; avisa se houver alterações não salvas.
- Sem backend, as alterações ficam apenas no navegador. **Baixar configuração** exporta o JSON; é necessário publicá-lo novamente para atualizar um site estático.

`public/default-state.json` contém os dados iniciais usados na primeira inicialização. Remova os itens de exemplo e substitua os dados de demonstração antes de divulgar a lista. A página não armazena dados de cartão, não confirma pagamentos diretos à chave Pix e não substitui a conferência financeira no painel Stripe.

## API

- `GET /api/status`: verifica configuração do backend, sessão e recursos disponíveis.
- `GET /api/state`: retorna a lista pública.
- `POST /api/admin/login` e `POST /api/admin/logout`: sessão administrativa.
- `PUT /api/admin/state`: salva a lista, protegido por sessão.
- `POST /api/images` e `GET /api/images/:id`: upload autenticado e leitura pública de imagens.
- `POST /api/payments/checkout`: cria um checkout Stripe somente para cartão de crédito para um presente ou contribuição.
- `POST /api/messages`: recebe uma mensagem de convidado.
- `GET /api/admin/messages`: lista as mensagens recentes; exige sessão administrativa.
