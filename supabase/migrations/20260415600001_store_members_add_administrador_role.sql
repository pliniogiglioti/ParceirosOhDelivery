-- Adiciona o role 'administrador' ao check constraint de store_members
alter table public.store_members
  drop constraint if exists store_members_role_check;

alter table public.store_members
  add constraint store_members_role_check
  check (role in ('operador', 'gerente', 'financeiro', 'administrador'));
