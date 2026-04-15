-- Tabela de membros da loja (operadores convidados pelo dono)
create table if not exists public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'operador' check (role in ('operador', 'gerente')),
  status text not null default 'pendente' check (status in ('pendente', 'ativo', 'inativo')),
  invited_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (store_id, email)
);

create index if not exists idx_store_members_store on public.store_members(store_id);
create index if not exists idx_store_members_email on public.store_members(email);

alter table public.store_members enable row level security;

-- Dono da loja pode ver, inserir, atualizar e deletar membros
drop policy if exists "store_owner_manage_members" on public.store_members;
create policy "store_owner_manage_members" on public.store_members
  for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

-- Membro pode ver sua própria entrada
drop policy if exists "member_read_own" on public.store_members;
create policy "member_read_own" on public.store_members
  for select to authenticated
  using (email = (auth.jwt() ->> 'email'));

NOTIFY pgrst, 'reload schema';
