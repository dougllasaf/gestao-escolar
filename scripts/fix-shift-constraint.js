
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function fixConstraint() {
    try {
        await client.connect();
        console.log('Connected to database...');

        console.log('Dropping old constraint if exists...');
        // We try to drop the constraint. The name might be 'students_shift_check' based on the error.
        await client.query(`
      ALTER TABLE students 
      DROP CONSTRAINT IF EXISTS students_shift_check;
    `);

        console.log('Adding corrected constraint that allows NULLs...');
        // Explicitly allow NULL in the check, though standard SQL says CHECK(expr) passes if expr is NULL.
        // However, some setups might behave differently or we want to be explicit.
        // The standard behavior: CHECK (shift IN (...)) -> if shift is NULL, result is UNKNOWN (which passes).
        // But let's be super explicit: CHECK (shift IS NULL OR shift IN (...))
        await client.query(`
      ALTER TABLE students
      ADD CONSTRAINT students_shift_check 
      CHECK (shift IS NULL OR shift IN ('morning', 'afternoon', 'night', 'full_time'));
    `);

        console.log('Constraint fixed.');

    } catch (err) {
        console.error('Fix failed:', err);
    } finally {
        await client.end();
    }
}

fixConstraint();
