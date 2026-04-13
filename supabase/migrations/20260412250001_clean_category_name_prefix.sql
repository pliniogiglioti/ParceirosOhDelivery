-- Remove prefixo "CT " ou "CT_" do category_name das lojas
update public.stores
set category_name = trim(regexp_replace(category_name, '^CT[\s_\-]+', '', 'i'))
where category_name ~* '^CT[\s_\-]+';
