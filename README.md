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

## Publicar na Vercel

1. Crie um projeto Supabase e execute [`supabase/schema.sql`](./supabase/schema.sql) no SQL Editor. Isso cria a tabela de estado e o bucket público de imagens `whylist-assets`. Se você executou uma versão anterior do esquema, o script também remove a antiga função que marcava presentes automaticamente.
2. Importe este projeto na Vercel. O arquivo `api/[...path].js` atende as rotas da API; o conteúdo estático é servido diretamente pela Vercel. Não envie nem versione o arquivo `.env`; configure os valores em **Settings > Environment Variables** no projeto Vercel.
3. Configure as variáveis de ambiente no projeto Vercel (ou preencha o `.env` apenas para execução local):
   - `ADMIN_PASSWORD`: senha de administrador com pelo menos 12 caracteres.
   - `SESSION_SECRET`: segredo aleatório longo para assinar cookies de sessão. Se omitido, é derivado da senha de administrador; prefira defini-lo.
   - `SUPABASE_URL`: URL HTTPS do projeto Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: chave `service_role`, somente no servidor. Nunca a coloque no frontend nem no controle de versão.
   - `SUPABASE_STORAGE_BUCKET`: opcional; por padrão `whylist-assets`. Se usar outro bucket, crie-o como público, limite uploads a JPEG de até 1 MB e mantenha a escrita restrita ao servidor.
   - `STRIPE_SECRET_KEY`: chave secreta Stripe do ambiente desejado (`sk_test_...` para testes).
4. No Stripe, habilite Pix em **Configurações > Formas de pagamento**.
5. Faça o deploy e teste primeiro com uma chave de teste Stripe. A conta Stripe precisa ser elegível para aceitar Pix em BRL.

O painel administrativo usa um cookie assinado, compatível com funções serverless; não depende de sessões guardadas em memória. A lista e as imagens ficam no Supabase. O bucket é público somente para leitura das imagens; os uploads são feitos pela API autenticada do administrador.

## Sugestões e contribuições

- Os presentes são sugestões; não existe reserva, obrigação de compra nem indicação de que um item foi escolhido.
- Se a Stripe estiver configurada, **Contribuir com Pix** abre o checkout hospedado. Em presentes com valor definido, o valor é uma sugestão de contribuição; o convidado pode editá-lo. Para itens de valor livre, a contribuição mínima é R$ 0,50.
- A página não registra o pagamento como status do presente. A lista permanece igual depois do checkout, inclusive se várias pessoas escolherem a mesma sugestão.
- Sem Stripe configurada, o botão permite gerar um Pix direto para a chave cadastrada ou copiar os dados de pagamento. Transferências diretas não são confirmadas pelo site.

## Editar a lista

- Clique em **Entrar como administrador**, informe `ADMIN_PASSWORD` e escolha **Editar lista**.
- Preencha nome, data, mensagem e dados Pix; adicione, edite ou remova presentes e salve. Com Supabase, as alterações ficam disponíveis aos visitantes.
- Fotos são reduzidas no navegador e enviadas como JPEG ao bucket Supabase; o limite é 1 MB por imagem. Ícones continuam disponíveis.
- Sem backend, as alterações ficam apenas no navegador. **Baixar configuração** exporta o JSON; é necessário publicá-lo novamente para atualizar um site estático.

`index.html` contém os dados iniciais usados na primeira inicialização. Remova os itens de exemplo e substitua os dados de demonstração antes de divulgar a lista. A página não armazena dados de cartão, não confirma pagamentos diretos à chave Pix e não substitui a conferência financeira no painel Stripe.

## API

- `GET /api/status`: verifica configuração do backend, sessão e recursos disponíveis.
- `GET /api/state`: retorna a lista pública.
- `POST /api/admin/login` e `POST /api/admin/logout`: sessão administrativa.
- `PUT /api/admin/state`: salva a lista, protegido por sessão.
- `POST /api/images` e `GET /api/images/:id`: upload autenticado e leitura pública de imagens.
- `POST /api/payments/checkout`: cria uma sessão Stripe Pix para um presente ou contribuição.
