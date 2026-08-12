-- AT Odontologia Especializada — sistema de avaliações
create extension if not exists pgcrypto;

create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  profissional text not null check (profissional in ('thércia', 'alexia')),
  nome_cliente text not null check (char_length(trim(nome_cliente)) between 2 and 120),
  nome_publico text not null check (char_length(trim(nome_publico)) between 1 and 80),
  modo_nome text not null check (modo_nome in ('completo', 'primeiro_inicial', 'iniciais')),
  nota smallint not null check (nota between 1 and 5),
  comentario text not null check (char_length(trim(comentario)) between 10 and 1000),
  consentimento_publicacao boolean not null default false,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada')),
  data_criacao timestamptz not null default now(),
  data_atualizacao timestamptz not null default now()
);

create index if not exists avaliacoes_publicadas_idx
  on public.avaliacoes (profissional, status, consentimento_publicacao, data_criacao desc);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table if not exists public.avaliacoes_rate_limit (
  client_token text primary key,
  ultimo_envio timestamptz not null default now()
);

alter table public.avaliacoes enable row level security;
alter table public.admin_users enable row level security;
alter table public.avaliacoes_rate_limit enable row level security;

-- Função segura para checar administradores sem expor a tabela.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Público: somente avaliações aprovadas e autorizadas.
drop policy if exists "public_read_approved_reviews" on public.avaliacoes;
create policy "public_read_approved_reviews"
on public.avaliacoes for select
to anon, authenticated
using (status = 'aprovada' and consentimento_publicacao = true);

-- Administração: leitura e gerenciamento completo.
drop policy if exists "admin_read_all_reviews" on public.avaliacoes;
create policy "admin_read_all_reviews"
on public.avaliacoes for select
to authenticated
using (public.is_admin());

drop policy if exists "admin_update_reviews" on public.avaliacoes;
create policy "admin_update_reviews"
on public.avaliacoes for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_delete_reviews" on public.avaliacoes;
create policy "admin_delete_reviews"
on public.avaliacoes for delete
to authenticated
using (public.is_admin());

-- O envio público é feito exclusivamente pela função abaixo.
drop policy if exists "no_direct_public_insert" on public.avaliacoes;

create or replace function public.enviar_avaliacao(
  p_profissional text,
  p_nome_cliente text,
  p_nome_publico text,
  p_modo_nome text,
  p_nota integer,
  p_comentario text,
  p_consentimento boolean,
  p_client_token text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_ultimo timestamptz;
begin
  if p_profissional not in ('thércia', 'alexia') then
    raise exception 'Profissional inválida';
  end if;
  if p_nota < 1 or p_nota > 5 then
    raise exception 'Nota inválida';
  end if;
  if p_modo_nome not in ('completo', 'primeiro_inicial', 'iniciais') then
    raise exception 'Modo de nome inválido';
  end if;
  if char_length(trim(p_nome_cliente)) not between 2 and 120 then
    raise exception 'Nome inválido';
  end if;
  if char_length(trim(p_nome_publico)) not between 1 and 80 then
    raise exception 'Nome público inválido';
  end if;
  if char_length(trim(p_comentario)) not between 10 and 1000 then
    raise exception 'Comentário inválido';
  end if;
  if p_client_token is null or char_length(trim(p_client_token)) < 20 then
    raise exception 'Identificador inválido';
  end if;

  select ultimo_envio into v_ultimo
  from public.avaliacoes_rate_limit
  where client_token = p_client_token;

  if v_ultimo is not null and v_ultimo > now() - interval '30 minutes' then
    raise exception 'Aguarde alguns minutos antes de enviar outra avaliação.';
  end if;

  insert into public.avaliacoes (
    profissional, nome_cliente, nome_publico, modo_nome, nota,
    comentario, consentimento_publicacao, status
  ) values (
    lower(trim(p_profissional)), trim(p_nome_cliente), trim(p_nome_publico),
    p_modo_nome, p_nota, trim(p_comentario), coalesce(p_consentimento, false), 'pendente'
  ) returning id into v_id;

  insert into public.avaliacoes_rate_limit (client_token, ultimo_envio)
  values (p_client_token, now())
  on conflict (client_token) do update
    set ultimo_envio = excluded.ultimo_envio;

  return v_id;
end;
$$;

revoke all on function public.enviar_avaliacao(text,text,text,text,integer,text,boolean,text) from public;
grant execute on function public.enviar_avaliacao(text,text,text,text,integer,text,boolean,text) to anon, authenticated;

-- Atualização automática de data.
create or replace function public.atualizar_data_avaliacao()
returns trigger language plpgsql as $$
begin
  new.data_atualizacao = now();
  return new;
end;
$$;

drop trigger if exists trg_avaliacoes_atualizacao on public.avaliacoes;
create trigger trg_avaliacoes_atualizacao
before update on public.avaliacoes
for each row execute function public.atualizar_data_avaliacao();

-- Exemplo de criação de administrador (execute DEPOIS de criar o usuário no Auth):
-- insert into public.admin_users (user_id) values ('UUID_DO_USUARIO_AUTH');
