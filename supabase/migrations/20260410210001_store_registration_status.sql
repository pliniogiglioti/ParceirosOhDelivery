alter table public.stores
  add column if not exists registration_status text not null default 'pendente'
    check (registration_status in ('pendente', 'aprovado', 'rejeitado')),
  add column if not exists rejection_reason text;

create index if not exists idx_stores_registration_status on public.stores(registration_status);
