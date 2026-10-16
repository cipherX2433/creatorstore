-- Optional: enable published-only anonymous reads for storefront tables.
-- The public Next.js route uses Prisma / the service role (bypasses RLS).
-- Do NOT run this until owner policies for every dashboard write path are verified.
-- RLS is currently OFF on these tables in production.

-- ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE store_sections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Public can view published stores"
-- ON stores FOR SELECT TO anon, authenticated
-- USING (published = true);

-- CREATE POLICY "Creators can manage own store"
-- ON stores FOR ALL TO authenticated
-- USING (creator_id = auth.uid())
-- WITH CHECK (creator_id = auth.uid());

-- CREATE POLICY "Public can view sections of published stores"
-- ON store_sections FOR SELECT TO anon, authenticated
-- USING (EXISTS (
--   SELECT 1 FROM stores s WHERE s.creator_id = store_sections.creator_id AND s.published = true
-- ));

-- CREATE POLICY "Creators can manage own sections"
-- ON store_sections FOR ALL TO authenticated
-- USING (creator_id = auth.uid())
-- WITH CHECK (creator_id = auth.uid());

-- CREATE POLICY "Public can view published products on live stores"
-- ON products FOR SELECT TO anon, authenticated
-- USING (
--   status = 'PUBLISHED'
--   AND store_published IS DISTINCT FROM FALSE
--   AND EXISTS (
--     SELECT 1 FROM stores s WHERE s.creator_id = products.creator_id AND s.published = true
--   )
-- );

-- CREATE POLICY "Creators can manage own products"
-- ON products FOR ALL TO authenticated
-- USING (creator_id = auth.uid())
-- WITH CHECK (creator_id = auth.uid());

-- CREATE POLICY "Public can view profiles of published stores"
-- ON creator_profiles FOR SELECT TO anon, authenticated
-- USING (EXISTS (
--   SELECT 1 FROM stores s WHERE s.creator_id = creator_profiles.creator_id AND s.published = true
-- ));

-- CREATE POLICY "Creators can manage own profile"
-- ON creator_profiles FOR ALL TO authenticated
-- USING (creator_id = auth.uid())
-- WITH CHECK (creator_id = auth.uid());
