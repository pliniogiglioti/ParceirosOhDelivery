-- Tabela de perfis de usuario (vinculada ao Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  phone text,
  avatar_url text,
  roles text[] not null default '{customer}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_email on public.profiles(email);

-- Trigger: cria perfil automaticamente ao registrar novo usuario no Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, roles)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    '{customer}'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Categorias de loja no estilo iFood
insert into public.store_categories (name, icon, sort_order, active) values
  ('Restaurantes',   'UtensilsCrossed', 1,  true),
  ('Pizza',          'Pizza',           2,  true),
  ('Hamburguer',     'Beef',            3,  true),
  ('Japonesa',       'Fish',            4,  true),
  ('Brasileira',     'ChefHat',         5,  true),
  ('Italiana',       'ChefHat',         6,  true),
  ('Arabe',          'Sandwich',        7,  true),
  ('Mexicana',       'Flame',           8,  true),
  ('Chinesa',        'ChefHat',         9,  true),
  ('Churrasco',      'Flame',           10, true),
  ('Frango',         'UtensilsCrossed', 11, true),
  ('Lanche',         'Sandwich',        12, true),
  ('Marmita',        'Box',             13, true),
  ('Pastel',         'UtensilsCrossed', 14, true),
  ('Acai',           'GlassWater',      15, true),
  ('Sorveteria',     'IceCream2',       16, true),
  ('Padaria',        'Wheat',           17, true),
  ('Doceria',        'Cake',            18, true),
  ('Saudavel',       'Leaf',            19, true),
  ('Vegetariana',    'Leaf',            20, true),
  ('Bebidas',        'Wine',            21, true),
  ('Mercado',        'ShoppingCart',    22, true),
  ('Farmacia',       'Pill',            23, true),
  ('Pet Shop',       'PawPrint',        24, true),
  ('Conveniencia',   'Store',           25, true),
  ('Frutos do Mar',  'Fish',            26, true),
  ('Carnes',         'Beef',            27, true),
  ('Sopas',          'UtensilsCrossed', 28, true),
  ('Crepes',         'UtensilsCrossed', 29, true),
  ('Tapioca',        'UtensilsCrossed', 30, true)
on conflict (name) do nothing;
