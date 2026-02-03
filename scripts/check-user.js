const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkUser() {
    const email = 'dougllasaf@gmail.com';
    console.log(`Checking user: ${email}...`);

    // 1. Get Auth User
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('List users error:', authError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('Auth User NOT FOUND.');
        return;
    }

    console.log('Auth User Found:', user.id);

    // 2. Get Profile
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('Profile fetch error:', profileError);
    } else if (!profile) {
        console.error('Profile NOT FOUND (null result).');
    } else {
        console.log('Profile Found:', profile);
    }
}

checkUser();
