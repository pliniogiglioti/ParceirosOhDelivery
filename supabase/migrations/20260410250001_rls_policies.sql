-- ─── Helper: verifica se o usuário autenticado é dono da loja ─────────────────
CREATE OR REPLACE FUNCTION public.is_store_owner(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = p_store_id AND partner_email = auth.email()
  );
$$;

-- ─── profiles ─────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ─── stores ───────────────────────────────────────────────────────────────────
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stores_select_own"  ON public.stores;
DROP POLICY IF EXISTS "stores_insert_own"  ON public.stores;
DROP POLICY IF EXISTS "stores_update_own"  ON public.stores;

CREATE POLICY "stores_select_own" ON public.stores
  FOR SELECT TO authenticated USING (partner_email = auth.email());

CREATE POLICY "stores_insert_own" ON public.stores
  FOR INSERT TO authenticated WITH CHECK (partner_email = auth.email());

CREATE POLICY "stores_update_own" ON public.stores
  FOR UPDATE TO authenticated
  USING (partner_email = auth.email()) WITH CHECK (partner_email = auth.email());

-- ─── store_categories (leitura pública autenticada) ───────────────────────────
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_categories_select" ON public.store_categories;

CREATE POLICY "store_categories_select" ON public.store_categories
  FOR SELECT TO authenticated USING (true);

-- ─── product_categories ───────────────────────────────────────────────────────
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_categories_all" ON public.product_categories;

CREATE POLICY "product_categories_all" ON public.product_categories
  FOR ALL TO authenticated
  USING (public.is_store_owner(store_id))
  WITH CHECK (public.is_store_owner(store_id));

-- ─── products ─────────────────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_all" ON public.products;

CREATE POLICY "products_all" ON public.products
  FOR ALL TO authenticated
  USING (public.is_store_owner(store_id))
  WITH CHECK (public.is_store_owner(store_id));

-- ─── orders ───────────────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_store_owner" ON public.orders;

CREATE POLICY "orders_store_owner" ON public.orders
  FOR ALL TO authenticated
  USING (public.is_store_owner(store_id))
  WITH CHECK (public.is_store_owner(store_id));

-- ─── order_items ──────────────────────────────────────────────────────────────
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_store_owner" ON public.order_items;

CREATE POLICY "order_items_store_owner" ON public.order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.is_store_owner(o.store_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.is_store_owner(o.store_id)
    )
  );

-- ─── store_hours ──────────────────────────────────────────────────────────────
ALTER TABLE public.store_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_hours_all" ON public.store_hours;

CREATE POLICY "store_hours_all" ON public.store_hours
  FOR ALL TO authenticated
  USING (public.is_store_owner(store_id))
  WITH CHECK (public.is_store_owner(store_id));

-- ─── delivery_areas ───────────────────────────────────────────────────────────
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_areas_all" ON public.delivery_areas;

CREATE POLICY "delivery_areas_all" ON public.delivery_areas
  FOR ALL TO authenticated
  USING (public.is_store_owner(store_id))
  WITH CHECK (public.is_store_owner(store_id));

-- ─── store_reviews ────────────────────────────────────────────────────────────
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_reviews_store_owner" ON public.store_reviews;

CREATE POLICY "store_reviews_store_owner" ON public.store_reviews
  FOR SELECT TO authenticated
  USING (public.is_store_owner(store_id));

-- ─── chat_sessions ────────────────────────────────────────────────────────────
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_sessions_store_owner" ON public.chat_sessions;

CREATE POLICY "chat_sessions_store_owner" ON public.chat_sessions
  FOR ALL TO authenticated
  USING (public.is_store_owner(store_id))
  WITH CHECK (public.is_store_owner(store_id));

-- ─── chat_messages ────────────────────────────────────────────────────────────
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_store_owner" ON public.chat_messages;

CREATE POLICY "chat_messages_store_owner" ON public.chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = chat_id AND public.is_store_owner(cs.store_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = chat_id AND public.is_store_owner(cs.store_id)
    )
  );

NOTIFY pgrst, 'reload schema';
