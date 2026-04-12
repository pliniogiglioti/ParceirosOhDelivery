create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  order_code text not null,
  store_id uuid not null references public.stores(id) on delete restrict,
  store_name text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chat_sessions(id) on delete cascade,
  sender text not null check (sender in ('user', 'store')),
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_chat_sessions_profile_updated on public.chat_sessions(profile_id, updated_at desc);
create index if not exists idx_chat_sessions_order on public.chat_sessions(order_id);
create index if not exists idx_chat_messages_chat_created on public.chat_messages(chat_id, created_at asc);

drop trigger if exists chat_sessions_set_updated_at on public.chat_sessions;
create trigger chat_sessions_set_updated_at
before update on public.chat_sessions
for each row execute function public.set_updated_at();

create or replace function public.touch_chat_session_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.chat_sessions
  set updated_at = coalesce(new.created_at, timezone('utc', now()))
  where id = new.chat_id;

  return new;
end;
$$;

drop trigger if exists chat_messages_touch_session_updated_at on public.chat_messages;
create trigger chat_messages_touch_session_updated_at
after insert on public.chat_messages
for each row execute function public.touch_chat_session_updated_at();

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "users read own chat sessions" on public.chat_sessions;
create policy "users read own chat sessions"
on public.chat_sessions
for select
using (auth.uid() = profile_id);

drop policy if exists "users create own chat sessions" on public.chat_sessions;
create policy "users create own chat sessions"
on public.chat_sessions
for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "users update own chat sessions" on public.chat_sessions;
create policy "users update own chat sessions"
on public.chat_sessions
for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "users read own chat messages" on public.chat_messages;
create policy "users read own chat messages"
on public.chat_messages
for select
using (
  exists (
    select 1
    from public.chat_sessions
    where public.chat_sessions.id = chat_messages.chat_id
      and public.chat_sessions.profile_id = auth.uid()
  )
);

drop policy if exists "users create own chat messages" on public.chat_messages;
create policy "users create own chat messages"
on public.chat_messages
for insert
to authenticated
with check (
  sender = 'user'
  and exists (
    select 1
    from public.chat_sessions
    where public.chat_sessions.id = chat_messages.chat_id
      and public.chat_sessions.profile_id = auth.uid()
  )
);
