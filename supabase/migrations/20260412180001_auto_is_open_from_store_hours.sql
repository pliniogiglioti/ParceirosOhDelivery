-- Função que calcula se a loja está aberta agora com base nos store_hours
-- Usa fuso America/Sao_Paulo
create or replace function public.calc_store_is_open(p_store_id uuid)
returns boolean
language plpgsql
stable
as $$
declare
  v_now        timestamptz := now() at time zone 'America/Sao_Paulo';
  v_week_day   smallint    := extract(dow from v_now)::smallint; -- 0=dom, 6=sab
  v_time       time        := v_now::time;
  v_is_open    boolean     := false;
begin
  select true into v_is_open
  from public.store_hours
  where store_id   = p_store_id
    and week_day   = v_week_day
    and is_closed  = false
    and opens_at  <= v_time
    and closes_at  > v_time
  limit 1;

  return coalesce(v_is_open, false);
end;
$$;

-- Trigger: recalcula is_open da loja sempre que store_hours for alterado
create or replace function public.sync_store_is_open()
returns trigger
language plpgsql
as $$
begin
  update public.stores
  set is_open = public.calc_store_is_open(
    case tg_op when 'DELETE' then old.store_id else new.store_id end
  )
  where id = case tg_op when 'DELETE' then old.store_id else new.store_id end;

  return null;
end;
$$;

drop trigger if exists store_hours_sync_is_open on public.store_hours;
create trigger store_hours_sync_is_open
after insert or update or delete on public.store_hours
for each row execute function public.sync_store_is_open();

-- Atualiza is_open de todas as lojas agora com base nos horários cadastrados
-- Lojas sem store_hours ficam com is_open = false (parceiro precisa cadastrar horário)
update public.stores s
set is_open = public.calc_store_is_open(s.id)
where exists (
  select 1 from public.store_hours sh where sh.store_id = s.id
);

-- Lojas sem nenhum horário cadastrado: mantém is_open como está (não altera)
