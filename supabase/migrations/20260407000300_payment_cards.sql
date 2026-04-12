create table if not exists public.payment_cards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  brand text not null,
  holder_name text not null,
  last_four text not null,
  expiry_month text not null,
  expiry_year text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_payment_cards_profile on public.payment_cards(profile_id);

drop trigger if exists payment_cards_set_updated_at on public.payment_cards;
create trigger payment_cards_set_updated_at
before update on public.payment_cards
for each row execute function public.set_updated_at();

alter table public.payment_cards enable row level security;

drop policy if exists "users read own payment cards" on public.payment_cards;
create policy "users read own payment cards"
on public.payment_cards
for select
using (auth.uid() = profile_id);

drop policy if exists "users manage own payment cards" on public.payment_cards;
create policy "users manage own payment cards"
on public.payment_cards
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);
