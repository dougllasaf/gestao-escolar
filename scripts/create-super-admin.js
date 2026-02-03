const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use provided keys or fallbacks (will be passed via env vars in terminal)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wxztllzgwmucqsbdnkfl.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createSuperAdmin() {
    const email = 'dougllasaf@gmail.com';
    const password = 'Vaisefude21@';
    const fullName = 'Douglas Super Admin';

    console.log(`Creating Super Admin: ${email}...`);

    // 1. Create Auth User
    const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    });

    if (authError) {
        console.error('Error creating auth user:', authError.message);
        return;
    }

    if (!user) {
        console.error('User creation failed unexpectedly.');
        return;
    }

    console.log('Auth user created. ID:', user.id);

    // 2. Create Profile (Role = super_admin)
    const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
            id: user.id,
            role: 'super_admin',
            full_name: fullName,
            city_id: null // Super Admin doesn't belong to a city (or belongs to all)
        });

    if (profileError) {
        console.error('Error creating profile:', profileError.message);
        // Optional: cleanup user
    } else {
        console.log('Successfully created Super Admin profile!');
        console.log('------------------------------------------------');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('------------------------------------------------');
    }
}

createSuperAdmin();
