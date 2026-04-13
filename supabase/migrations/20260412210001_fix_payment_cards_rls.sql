-- Garante que todas as operações de cartão funcionam para o usuário dono
alter table public.payment_cards enable row level security;

drop policy if exists "users read own payment cards" on public.payment_cards;
drop policy if exists "users manage own payment cards" on public.payment_cards;
drop policy if exists "users insert own payment cards" on public.payment_cards;
drop policy if exists "users update own payment cards" on public.payment_cards;
drop policy if exists "users delete own payment cards" on public.payment_cards;

create policy "users read own payment cards"
  on public.payment_cards for select
  to authenticated
  using (auth.uid() = profile_id);

create policy "users insert own payment cards"
  on public.payment_cards for insert
  to authenticated
  with check (auth.uid() = profile_id);

create policy "users update own payment cards"
  on public.payment_cards for update
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "users delete own payment cards"
  on public.payment_cards for delete
  to authenticated
  using (auth.uid() = profile_id);
