
const postgres = require('postgres')

// Connection string from .env.local
const connectionString = 'postgresql://postgres:Vaisefude21%40@db.wxztllzgwmucqsbdnkfl.supabase.co:5432/postgres'

const sql = postgres(connectionString)

async function migrate() {
    try {
        console.log('Adding school_year column...')

        await sql`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS school_year INTEGER DEFAULT 2026;
    `

        console.log('Column added successfully.')

        // Check if column exists
        const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'students' AND column_name = 'school_year';
    `

        console.log('Verification:', columns)

    } catch (err) {
        console.error('Migration failed:', err)
    } finally {
        await sql.end()
    }
}

migrate()
