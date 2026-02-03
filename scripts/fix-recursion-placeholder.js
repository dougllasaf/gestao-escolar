const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sql = `
-- 1. Create secure function to check admin status without triggering recursion
-- SECURITY DEFINER allows this function to bypass RLS on user_profiles
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

-- 2. Drop the problematic recursive policy
DROP POLICY IF EXISTS "Super admin full access profiles" ON user_profiles;

-- 3. Re-create the policy using the secure function
CREATE POLICY "Super admin full access profiles" ON user_profiles
    FOR ALL
    USING (is_super_admin());

-- 4. Optimizing other policies to use the function (Optional but good for performance)
DROP POLICY IF EXISTS "Super Admin sees all cities" ON cities;
CREATE POLICY "Super Admin sees all cities" ON cities
    FOR ALL
    USING (is_super_admin());
    
-- We can leave others for now, the recursion happened because we were querying user_profiles inside a user_profiles policy.
`;

async function applyFix() {
    console.log('Applying RLS recursion fix...');
    // Supabase JS client doesn't run raw SQL directly easily without the specific SQL endpoint or postgres connection.
    // HOWEVER, we have the 'rpc' method if we had a function, but we are creating functions.
    // Since we don't have a direct 'query' method exposed in the helper, we use the postgres connection string if available?
    // User provided specific create-super-admin.js which uses supabase client.
    // Wait, I don't have a way to run raw SQL via supabase-js client unless I use the REST API 'sql' extension (which might not be enabled) or 'rpc'.

    // Actually, 'scripts/deploy-schema.js' used 'pg' library. Let's check that file.
    console.log('Checking how to run SQL...');
}

// I will use the 'pg' library pattern seen in deploy-schema.js instead of this file content.
