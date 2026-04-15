-- Política de preço para categorias pizza
-- maior: usa o maior preço entre os sabores selecionados
-- media: usa a média dos preços
-- menor: usa o menor preço entre os sabores selecionados
alter table public.product_categories
  add column if not exists price_policy text not null default 'maior'
    check (price_policy in ('maior', 'media', 'menor'));
