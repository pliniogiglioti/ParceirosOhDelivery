-- Gera slug a partir do nome para lojas que não têm slug
-- Ex: "Brasa Burgers" -> "brasa-burgers"
create or replace function public.slugify(text_input text)
returns text
language sql
immutable
as $$
  select lower(
    regexp_replace(
      regexp_replace(
        translate(
          text_input,
          'áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ',
          'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
        ),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
$$;

-- Popula slug para lojas que não têm
update public.stores
set slug = public.slugify(name)
where slug is null or slug = '';

-- Garante unicidade: se slug já existe, adiciona sufixo com id curto
update public.stores s
set slug = public.slugify(s.name) || '-' || substring(s.id::text, 1, 6)
where exists (
  select 1 from public.stores s2
  where s2.slug = public.slugify(s.name)
    and s2.id <> s.id
)
and (s.slug is null or s.slug = '');
