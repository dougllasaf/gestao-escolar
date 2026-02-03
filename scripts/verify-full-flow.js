const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 1. Service Client (for setup)
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

// 2. Client generator (for actors)
const createActor = (token) => createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false }
});

async function runVerification() {
    console.log('🚀 Starting End-to-End Verification Flow...\n');

    const timestamp = Date.now();
    const cityData = { name: `Test City ${timestamp}`, state: 'TS' };

    // --- STEP 1: SUPER ADMIN SETUP ---
    console.log('1️⃣  [Super Admin] Creating City...');
    const { data: city, error: cityError } = await supabaseAdmin.from('cities').insert(cityData).select().single();
    if (cityError) throw cityError;
    console.log(`   ✅ City created: ${city.name} (ID: ${city.id})`);

    // Create City Admin User
    const adminEmail = `admin_${timestamp}@test.com`;
    const adminPass = 'password123';
    console.log(`\n2️⃣  [Super Admin] Creating City Admin (${adminEmail})...`);

    const { data: adminUser, error: adminCreateError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPass,
        email_confirm: true,
        user_metadata: { full_name: 'City Admin User' }
    });
    if (adminCreateError) throw adminCreateError;

    const { error: adminProfileError } = await supabaseAdmin.from('user_profiles').insert({
        id: adminUser.user.id,
        role: 'city_admin',
        city_id: city.id,
        full_name: 'City Admin User'
    });
    if (adminProfileError) throw adminProfileError;
    console.log('   ✅ City Admin created and linked to city.');

    // --- STEP 2: ACT AS CITY ADMIN ---
    console.log('\n🔐 [City Admin] Logging in...');
    // We sign in using the anon client logic
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: adminAuth, error: loginError } = await authClient.auth.signInWithPassword({
        email: adminEmail,
        password: adminPass
    });
    if (loginError) throw loginError;

    const adminClient = createActor(adminAuth.session.access_token);

    console.log('   ✅ Logged in. Attempting to create Route...');
    const { data: route, error: routeError } = await adminClient.from('routes').insert({
        route_number: 'R-101',
        driver_name: 'John Driver',
        city_id: city.id // RLS requires this to match user's city
    }).select().single();

    if (routeError) throw new Error(`RLS Failed: City Admin could not create route: ${routeError.message}`);
    console.log(`   ✅ Route created: ${route.route_number} (ID: ${route.id})`);

    // Create Monitor User (Simulating what the API does, but direct DB insert to test permissions)
    // Note: City Admin normally calls API. Direct insert to auth.users is NOT possible for City Admin. 
    // BUT direct insert to 'user_profiles' IS possible if ID exists.
    // So we must use Service Role to create the Auth User first (simulating the API's backend part), 
    // then use City Admin to create the Profile (testing RLS).

    console.log('\n3️⃣  [System] Creating Monitor Auth User (simulating API auth step)...');
    const monitorEmail = `monitor_${timestamp}@test.com`;
    const monitorPass = 'password123';
    const { data: monitorUser } = await supabaseAdmin.auth.admin.createUser({
        email: monitorEmail,
        password: monitorPass,
        email_confirm: true,
        user_metadata: { full_name: 'Monitor User' }
    });

    console.log('   [City Admin] Inserting Monitor Profile (Testing RLS)...');
    const { error: monitorProfileError } = await adminClient.from('user_profiles').insert({
        id: monitorUser.user.id,
        role: 'monitor',
        city_id: city.id,
        assigned_route_id: route.id, // Assigning to the route we just created
        full_name: 'Monitor User'
    });

    if (monitorProfileError) throw new Error(`RLS Failed: City Admin could not create monitor profile: ${monitorProfileError.message}`);
    console.log('   ✅ Monitor Profile created successfully by City Admin.');

    // --- STEP 3: ACT AS MONITOR ---
    console.log('\n🔐 [Monitor] Logging in...');
    const { data: monitorAuth, error: monitorLoginError } = await authClient.auth.signInWithPassword({
        email: monitorEmail,
        password: monitorPass
    });
    if (monitorLoginError) throw monitorLoginError;

    const monitorClient = createActor(monitorAuth.session.access_token);

    console.log('   ✅ Logged in. Attempting to create Student...');
    const { data: student, error: studentError } = await monitorClient.from('students').insert({
        full_name: 'Student One',
        city_id: city.id,
        route_id: route.id,
        date_of_birth: '2015-01-01',
        shift: 'Morning'
    }).select().single();

    if (studentError) throw new Error(`RLS Failed: Monitor could not create student: ${studentError.message}`);
    console.log(`   ✅ Student created: ${student.full_name} on Route ${route.route_number}`);

    // --- STEP 4: VERIFY ISOLATION ---
    console.log('\n🛡️  [Verification] Testing Isolation...');

    // Create a dummy "Other City" and Student using Service Role
    const { data: otherCity } = await supabaseAdmin.from('cities').insert({ name: 'Other City', state: 'OT' }).select().single();
    await supabaseAdmin.from('students').insert({
        full_name: 'Secret Student',
        city_id: otherCity.id
    });

    // Monitor tries to read ALL students
    const { data: allStudents } = await monitorClient.from('students').select('*');
    const seesSecret = allStudents.find(s => s.full_name === 'Secret Student');

    if (seesSecret) {
        throw new Error('❌ SECURITY FAIL: Monitor saw a student from another city!');
    } else {
        console.log('   ✅ Isolation Confirmed: Monitor on City A cannot see students from City B.');
    }

    console.log('\n🎉 SUCCESS! Full End-to-End Flow & Security Verified.');
    process.exit(0);
}

runVerification().catch(err => {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
});
