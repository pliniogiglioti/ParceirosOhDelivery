alter table public.stores
  add column if not exists razao_social text,
  add column if not exists nome_fantasia text,
  add column if not exists responsavel_nome text,
  add column if not exists responsavel_cpf text;
