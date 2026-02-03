
const postgres = require('postgres')

// Connection string from previous successful script
const connectionString = 'postgresql://postgres:Vaisefude21%40@db.wxztllzgwmucqsbdnkfl.supabase.co:5432/postgres'

const sql = postgres(connectionString)

async function migrate() {
    try {
        console.log('Adding created_by column...')

        await sql`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES user_profiles(id);
    `

        console.log('Column added successfully.')

        // Check if column exists
        const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'students' AND column_name = 'created_by';
    `

        console.log('Verification:', columns)

    } catch (err) {
        console.error('Migration failed:', err)
    } finally {
        await sql.end()
    }
}

migrate()
