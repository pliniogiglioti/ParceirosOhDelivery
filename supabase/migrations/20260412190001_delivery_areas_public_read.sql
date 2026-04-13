-- Cliente pode ler as áreas de entrega ativas (para calcular raio)
drop policy if exists "public_read_delivery_areas" on public.delivery_areas;
create policy "public_read_delivery_areas"
  on public.delivery_areas for select
  using (active = true);
