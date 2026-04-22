-- Cria webhook que dispara a Edge Function send-push-batch
-- quando o status de um pedido muda

-- Habilita a extensão pg_net se não estiver ativa
create extension if not exists pg_net schema extensions;

-- Função que chama a Edge Function send-push-batch via HTTP
create or replace function public.notify_order_status_push()
returns trigger
language plpgsql
security definer
as $$
declare
  trigger_type text;
  project_url text := 'https://emjnqqbsmigqswbfhpzi.supabase.co';
  service_key text := current_setting('app.service_role_key', true);
begin
  -- Mapeia status do pedido para trigger_type do template
  trigger_type := case new.status
    when 'preparo'    then 'order_confirmed'
    when 'confirmado' then 'order_ready'
    when 'a_caminho'  then 'order_on_the_way'
    when 'entregue'   then 'order_delivered'
    when 'cancelado'  then 'order_cancelled'
    else null
  end;

  -- Só dispara se tiver um trigger_type mapeado e o status mudou
  if trigger_type is null then
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  -- Chama a Edge Function de forma assíncrona via pg_net
  perform extensions.http_post(
    url := project_url || '/functions/v1/send-push-batch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(service_key, '')
    ),
    body := jsonb_build_object(
      'trigger_type', trigger_type,
      'target_type', 'user',
      'target_id', new.profile_id::text,
      'order_code', new.order_code,
      'store_name', new.store_name,
      'customer_name', new.customer_name
    )::text
  );

  return new;
exception when others then
  -- Nunca bloqueia a transação por falha no push
  return new;
end;
$$;

-- Trigger no UPDATE de orders
drop trigger if exists orders_push_notification on public.orders;
create trigger orders_push_notification
  after update of status on public.orders
  for each row
  execute function public.notify_order_status_push();
