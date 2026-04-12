-- ─── Bucket público para imagens das lojas ────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-images',
  'store-images',
  true,
  5242880,                                             -- 5 MB por arquivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ─── RLS: dono da loja pode fazer upload na pasta {store_id}/ ─────────────────
DROP POLICY IF EXISTS "store_images_insert_owner" ON storage.objects;
CREATE POLICY "store_images_insert_owner"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'store-images'
    AND public.is_store_owner((storage.foldername(name))[1]::uuid)
  );

-- ─── RLS: dono da loja pode substituir (UPDATE) arquivos próprios ──────────────
DROP POLICY IF EXISTS "store_images_update_owner" ON storage.objects;
CREATE POLICY "store_images_update_owner"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'store-images'
    AND public.is_store_owner((storage.foldername(name))[1]::uuid)
  );

-- ─── RLS: dono da loja pode deletar arquivos próprios ─────────────────────────
DROP POLICY IF EXISTS "store_images_delete_owner" ON storage.objects;
CREATE POLICY "store_images_delete_owner"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'store-images'
    AND public.is_store_owner((storage.foldername(name))[1]::uuid)
  );

-- ─── RLS: qualquer pessoa (incluindo anônimos) pode visualizar ─────────────────
DROP POLICY IF EXISTS "store_images_select_public" ON storage.objects;
CREATE POLICY "store_images_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'store-images');
