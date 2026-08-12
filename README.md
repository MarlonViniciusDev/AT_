# AT Odontologia Especializada — Avaliações

Implementação do sistema de avaliações das Dra. Thércia e Dra. Alexia integrada ao site existente.

## Arquitetura encontrada
- Site: HTML5 + CSS3 + JavaScript puro.
- Hospedagem compatível: GitHub Pages/static hosting.
- Não havia backend/banco configurado no projeto enviado.
- Foi adotado Supabase + PostgreSQL + Supabase Auth.

## Arquivos novos
- `css/avaliacoes.css`
- `js/avaliacoes.js`
- `js/supabase-config.js`
- `supabase/schema.sql`
- `supabase/functions/submit-review/index.ts`
- `adm/login.html`
- `adm/dashboard.html`
- `adm/admin.css`
- `adm/admin.js`

## Configuração obrigatória antes de produção
1. Crie um projeto no Supabase.
2. Abra SQL Editor e execute `supabase/schema.sql`.
3. Em Authentication > Users, crie o usuário administrativo.
4. Copie o UUID desse usuário e execute no SQL Editor:
   `insert into public.admin_users (user_id) values ('UUID_DO_USUARIO');`
5. Em `js/supabase-config.js`, informe a Project URL e a chave pública anon/publishable.
6. Nunca coloque `service_role` no frontend.
7. Se usar a Edge Function anti-spam, configure as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente da função e faça o deploy.

## Fluxo
Paciente: doutora -> estrelas -> comentário -> nome público -> consentimento -> envio.

Toda avaliação começa como `pendente`. Apenas `aprovada` + `consentimento_publicacao = true` aparece no site.

## Painel
Acesse `/adm/login.html` e entre com o usuário criado no Supabase Auth. O painel permite visualizar, filtrar, pesquisar, aprovar, rejeitar e excluir avaliações.

## Segurança
- RLS habilitado.
- Leitura pública limitada a avaliações aprovadas/autorizadas.
- Envio público somente pela função SQL com validações server-side.
- Dados públicos não expõem telefone, e-mail, CPF ou endereço.
- Proteção XSS na renderização administrativa/pública.
- Honeypot + limite por identificador de cliente no banco.
- Chave secreta não é usada no frontend.
