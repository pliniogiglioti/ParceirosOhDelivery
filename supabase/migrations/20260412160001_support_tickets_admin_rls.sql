-- Políticas RLS para admin visualizar e atualizar todos os chamados de suporte.
-- O admin é identificado pelo papel 'admin' no array de roles do perfil.

create policy "admin_select_all_tickets"
  on public.support_tickets for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and roles @> array['admin']::text[]
    )
  );

create policy "admin_update_all_tickets"
  on public.support_tickets for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and roles @> array['admin']::text[]
    )
  );
