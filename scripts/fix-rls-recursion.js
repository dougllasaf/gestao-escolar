const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Use the standard Postgres connection string from .env.local
// If DATABASE_URL is not set directly but we have Supabase keys, we might need to construct it, 
// BUT the user used deploy-schema.js which relied on DATABASE_URL. 
// Assuming DATABASE_URL is in .env or .env.local (it wasn't in the .env.local I viewed earlier, but deploy-schema.js used it).
// Wait, I saw .env.local earlier and it had keys. Did it have DATABASE_URL?
// I will check .env.local first to be sure, otherwise I'll need to ask for the password again or use the one provided in previous turns if visible (I don't have history easily).
// However, the user successfully ran verification scripts. 
// Ah, the user provided the password earlier for the schema deployment. I might need to ask for it again if I can't find the connection string.
// Let's assume for a moment the user added it or I can reuse the previous context?
// Actually, in step 299 summary it says "database schema script ... was accomplished by providing the database password."
// It implies I might not have it saved in a file.
// Let's check .env.local first.

const connectionString = process.env.DATABASE_URL;

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase usually
});

const sql = `
-- 1. Create secure function to check admin status without triggering recursion
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- 2. Drop the problematic recursive policies
DROP POLICY IF EXISTS "Super admin full access profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super Admin sees all cities" ON cities;
DROP POLICY IF EXISTS "Super admin routes" ON routes;
DROP POLICY IF EXISTS "Super admin schools" ON schools;
DROP POLICY IF EXISTS "Super admin students" ON students;

-- 3. Re-create the policies using the secure function
CREATE POLICY "Super admin full access profiles" ON user_profiles FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admin sees all cities" ON cities FOR ALL USING (is_super_admin());
CREATE POLICY "Super admin routes" ON routes FOR ALL USING (is_super_admin());
CREATE POLICY "Super admin schools" ON schools FOR ALL USING (is_super_admin());
CREATE POLICY "Super admin students" ON students FOR ALL USING (is_super_admin());
`;

async function applyFix() {
    if (!connectionString) {
        console.error('ERROR: DATABASE_URL is missing from environment. Please add it to .env.local');
        process.exit(1);
    }

    try {
        console.log('Connecting to database...');
        await client.connect();

        console.log('Applying RLS fix...');
        await client.query(sql);

        console.log('RLS Recursion Fixed Successfully!');
    } catch (err) {
        console.error('Fix failed:', err);
    } finally {
        await client.end();
    }
}

applyFix();
