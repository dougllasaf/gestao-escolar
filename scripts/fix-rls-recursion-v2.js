const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

const sql = `
-- 1. Create secure helper functions (bypasses RLS recursion)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_city()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT city_id FROM user_profiles WHERE id = auth.uid();
$$;

-- 2. Fix "City Admin manage city users" Policy
DROP POLICY IF EXISTS "City Admin manage city users" ON user_profiles;

CREATE POLICY "City Admin manage city users" ON user_profiles
    FOR ALL
    USING (
        get_my_role() = 'city_admin' 
        AND 
        city_id = get_my_city()
    );

-- 3. Just in case, ensuring Super Admin fix is still there
-- (Already ran in previous script, but harmless to ensure)
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
`;

async function applyFix() {
    if (!connectionString) {
        console.error('ERROR: DATABASE_URL is missing. Please check .env.local');
        process.exit(1);
    }
    try {
        console.log('Connecting to database...');
        await client.connect();

        console.log('Applying Expanded RLS Fix (City Admin & Helpers)...');
        await client.query(sql);

        console.log('Expanded RLS Fix Applied Successfully!');
    } catch (err) {
        console.error('Fix failed:', err);
    } finally {
        await client.end();
    }
}

applyFix();
