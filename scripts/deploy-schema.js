const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string format: postgres://postgres:[password]@db.[ref].supabase.co:5432/postgres
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL environment variable is missing.');
    process.exit(1);
}

const client = new Client({
    connectionString,
});

async function deploy() {
    try {
        console.log('Connecting to database...');
        await client.connect();

        console.log('Reading schema.sql...');
        const schemaPath = path.join(__dirname, '../schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema...');
        // Split by statement if needed, but client.query usually handles blocks unless there are specific transaction commands that fail in blocks.
        // Supabase SQL Editor runs it as a block. user_role enum might duplicate if not careful, but IF NOT EXISTS is good.
        // Our schema has types.

        await client.query(sql);

        console.log('Schema deployed successfully!');
    } catch (err) {
        console.error('Deployment failed:', err);
    } finally {
        await client.end();
    }
}

deploy();
