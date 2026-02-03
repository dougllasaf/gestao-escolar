const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function checkPolicies() {
    try {
        await client.connect();

        console.log('Checking policies on user_profiles...');
        const res = await client.query(`
            SELECT policyname, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'user_profiles';
        `);

        console.table(res.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkPolicies();
