insert into public.store_categories (id, name, icon, sort_order, active)
values
  ('11111111-1111-1111-1111-111111111111', 'Lanches', 'LN', 1, true)
on conflict (id) do nothing;

insert into public.stores (
  id,
  category_id,
  category_name,
  name,
  slug,
  tagline,
  description,
  description_long,
  cover_image_url,
  logo_image_url,
  accent_color,
  delivery_fee,
  eta_min,
  eta_max,
  min_order_amount,
  rating,
  review_count,
  is_featured,
  is_open,
  active,
  sort_order,
  tags
)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Lanches',
  'Oh Burger House',
  'oh-burger-house',
  'Hamburguer artesanal e operacao rapida para pedidos do jantar.',
  'Loja demo para o painel de parceiros.',
  'Exemplo de base para testar o Parceiros Oh Delivery sem depender de banco real do projeto principal.',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=300&q=80',
  '#ea1d2c',
  6.90,
  20,
  35,
  25.00,
  4.80,
  328,
  true,
  true,
  true,
  1,
  array['combo', 'smash', 'delivery rapido']
)
on conflict (id) do nothing;

insert into public.store_hours (id, store_id, week_day, opens_at, closes_at, is_closed)
values
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222', 0, '18:00', '23:00', false),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 1, '18:00', '23:30', false),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 2, '18:00', '23:30', false),
  ('33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222', 3, '18:00', '23:30', false),
  ('33333333-3333-3333-3333-333333333335', '22222222-2222-2222-2222-222222222222', 4, '18:00', '00:00', false),
  ('33333333-3333-3333-3333-333333333336', '22222222-2222-2222-2222-222222222222', 5, '18:00', '00:30', false),
  ('33333333-3333-3333-3333-333333333337', '22222222-2222-2222-2222-222222222222', 6, '18:00', '22:30', false)
on conflict (id) do nothing;

insert into public.product_categories (id, store_id, name, icon, sort_order, active)
values
  ('44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222222', 'Combos', 'CB', 1, true),
  ('44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222222', 'Entradas', 'ET', 2, true),
  ('44444444-4444-4444-4444-444444444443', '22222222-2222-2222-2222-222222222222', 'Bebidas', 'BB', 3, true)
on conflict (id) do nothing;

insert into public.products (
  id,
  store_id,
  category_id,
  name,
  description,
  price,
  prep_time_label,
  badge,
  featured,
  active,
  sort_order
)
values
  (
    '55555555-5555-5555-5555-555555555551',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444441',
    'Combo Oh Bacon',
    'Hamburguer, fritas crocantes e refrigerante.',
    34.90,
    '15-20 min',
    'Mais vendido',
    true,
    true,
    1
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444442',
    'Batata da Casa',
    'Porcao media com molho especial.',
    17.90,
    '10-12 min',
    null,
    false,
    true,
    2
  ),
  (
    '55555555-5555-5555-5555-555555555553',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444443',
    'Pink Lemonade',
    'Bebida autoral gelada.',
    11.50,
    '5 min',
    null,
    false,
    true,
    3
  )
on conflict (id) do nothing;

insert into public.orders (
  id,
  order_code,
  store_id,
  store_name,
  store_slug,
  customer_name,
  customer_email,
  customer_phone,
  status,
  fulfillment_type,
  payment_method,
  payment_status,
  eta_max_minutes,
  subtotal_amount,
  delivery_fee,
  service_fee,
  total_amount,
  address_label,
  created_at
)
values
  (
    '66666666-6666-6666-6666-666666666661',
    '#1042',
    '22222222-2222-2222-2222-222222222222',
    'Oh Burger House',
    'oh-burger-house',
    'Marina Souza',
    'marina@example.com',
    '11999990001',
    'aguardando',
    'delivery',
    'Pix',
    'pendente',
    30,
    55.50,
    6.90,
    0.00,
    62.40,
    'Centro',
    '2026-04-08T18:20:00Z'
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '#1041',
    '22222222-2222-2222-2222-222222222222',
    'Oh Burger House',
    'oh-burger-house',
    'Rafael Lima',
    'rafael@example.com',
    '11999990002',
    'preparo',
    'pickup',
    'Cartao',
    'confirmado',
    20,
    41.90,
    0.00,
    0.00,
    41.90,
    'Retirada na loja',
    '2026-04-08T18:02:00Z'
  ),
  (
    '66666666-6666-6666-6666-666666666663',
    '#1040',
    '22222222-2222-2222-2222-222222222222',
    'Oh Burger House',
    'oh-burger-house',
    'Camila Rocha',
    'camila@example.com',
    '11999990003',
    'confirmado',
    'delivery',
    'Pix',
    'confirmado',
    35,
    71.60,
    6.90,
    0.00,
    78.50,
    'Vila Nova',
    '2026-04-08T17:51:00Z'
  )
on conflict (id) do nothing;

insert into public.order_items (
  id,
  order_id,
  product_id,
  product_name,
  quantity,
  unit_price,
  total_price
)
values
  ('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666661', '55555555-5555-5555-5555-555555555551', 'Combo Oh Bacon', 1, 34.90, 34.90),
  ('77777777-7777-7777-7777-777777777772', '66666666-6666-6666-6666-666666666661', '55555555-5555-5555-5555-555555555552', 'Batata da Casa', 1, 17.90, 17.90),
  ('77777777-7777-7777-7777-777777777773', '66666666-6666-6666-6666-666666666661', '55555555-5555-5555-5555-555555555553', 'Pink Lemonade', 1, 11.50, 11.50),
  ('77777777-7777-7777-7777-777777777774', '66666666-6666-6666-6666-666666666662', '55555555-5555-5555-5555-555555555551', 'Combo Oh Bacon', 1, 34.90, 34.90),
  ('77777777-7777-7777-7777-777777777775', '66666666-6666-6666-6666-666666666662', '55555555-5555-5555-5555-555555555553', 'Pink Lemonade', 1, 7.00, 7.00),
  ('77777777-7777-7777-7777-777777777776', '66666666-6666-6666-6666-666666666663', '55555555-5555-5555-5555-555555555551', 'Combo Oh Bacon', 2, 34.90, 69.80),
  ('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666663', '55555555-5555-5555-5555-555555555553', 'Pink Lemonade', 1, 8.70, 8.70)
on conflict (id) do nothing;

insert into public.chat_sessions (
  id,
  order_id,
  order_code,
  store_id,
  store_name,
  created_at,
  updated_at
)
values
  (
    '88888888-8888-8888-8888-888888888881',
    '66666666-6666-6666-6666-666666666661',
    '#1042',
    '22222222-2222-2222-2222-222222222222',
    'Oh Burger House',
    '2026-04-08T18:22:00Z',
    '2026-04-08T18:24:00Z'
  ),
  (
    '88888888-8888-8888-8888-888888888882',
    '66666666-6666-6666-6666-666666666663',
    '#1040',
    '22222222-2222-2222-2222-222222222222',
    'Oh Burger House',
    '2026-04-08T17:55:00Z',
    '2026-04-08T18:00:00Z'
  )
on conflict (id) do nothing;

insert into public.chat_messages (id, chat_id, sender, body, created_at)
values
  ('99999999-9999-9999-9999-999999999991', '88888888-8888-8888-8888-888888888881', 'user', 'Oi, meu pedido ja saiu para entrega?', '2026-04-08T18:23:00Z'),
  ('99999999-9999-9999-9999-999999999992', '88888888-8888-8888-8888-888888888881', 'store', 'Estamos finalizando e sai em poucos minutos.', '2026-04-08T18:24:00Z'),
  ('99999999-9999-9999-9999-999999999993', '88888888-8888-8888-8888-888888888882', 'user', 'Pode mandar sem cebola?', '2026-04-08T17:58:00Z')
on conflict (id) do nothing;
