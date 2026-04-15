-- Permite que a loja leia e escreva nas sessões de chat vinculadas a ela
-- e envie mensagens com sender = 'store'

-- store pode ler sessões da própria loja
drop policy if exists "store_read_own_chat_sessions" on public.chat_sessions;
create policy "store_read_own_chat_sessions"
  on public.chat_sessions for select
  to authenticated
  using (public.is_store_owner(store_id));

-- store pode inserir sessões para a própria loja
drop policy if exists "store_insert_chat_sessions" on public.chat_sessions;
create policy "store_insert_chat_sessions"
  on public.chat_sessions for insert
  to authenticated
  with check (public.is_store_owner(store_id));

-- store pode ler mensagens das sessões da própria loja
drop policy if exists "store_read_own_chat_messages" on public.chat_messages;
create policy "store_read_own_chat_messages"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_sessions
      where public.chat_sessions.id = chat_messages.chat_id
        and public.is_store_owner(public.chat_sessions.store_id)
    )
  );

-- store pode enviar mensagens com sender = 'store'
drop policy if exists "store_insert_chat_messages" on public.chat_messages;
create policy "store_insert_chat_messages"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender = 'store'
    and exists (
      select 1 from public.chat_sessions
      where public.chat_sessions.id = chat_messages.chat_id
        and public.is_store_owner(public.chat_sessions.store_id)
    )
  );

NOTIFY pgrst, 'reload schema';
