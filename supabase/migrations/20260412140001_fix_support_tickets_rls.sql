-- Corrige as policies de RLS da tabela support_tickets.
-- O erro "permission denied for table users" ocorre porque o role authenticated
-- não tem acesso direto a auth.users. Usar auth.jwt() ->> 'email' é o caminho correto.

drop policy if exists "partner_select_own_tickets" on public.support_tickets;
drop policy if exists "partner_insert_own_tickets" on public.support_tickets;

create policy "partner_select_own_tickets"
  on public.support_tickets for select
  using (
    store_id in (
      select id from public.stores
      where partner_email = (auth.jwt() ->> 'email')
    )
  );

create policy "partner_insert_own_tickets"
  on public.support_tickets for insert
  with check (
    store_id in (
      select id from public.stores
      where partner_email = (auth.jwt() ->> 'email')
    )
  );
