
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
    try {
        await client.connect();
        console.log('Connected to database...');

        // 1. Add new columns to students table
        console.log('Adding new columns to students table...');
        await client.query(`
      ALTER TABLE students
      ADD COLUMN IF NOT EXISTS guardian_name TEXT,
      ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
      ADD COLUMN IF NOT EXISTS shift TEXT CHECK (shift IN ('morning', 'afternoon', 'night', 'full_time')),
      ADD COLUMN IF NOT EXISTS grade TEXT,
      ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id),
      ADD COLUMN IF NOT EXISTS has_special_condition BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS special_condition_details TEXT,
      ADD COLUMN IF NOT EXISTS medical_report_url TEXT;
    `);
        console.log('Columns added successfully.');

        // 2. Insert storage bucket if not exists
        // Note: Creating buckets via SQL in Supabase usually requires inserting into storage.buckets
        console.log('Ensuring storage bucket "student-documents" exists...');
        await client.query(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('student-documents', 'student-documents', false)
      ON CONFLICT (id) DO NOTHING;
    `);

        // 3. Storage Policies
        // Allow authenticated users to upload (we restrict via app logic, but RLS is good)
        // For simplicity in this script, we'll allow all authenticated users to read/write for now
        // In a real prod env, we'd strictly limit this to City Admins and Monitors.
        console.log('Setting up storage policies...');

        await client.query(`
      -- Drop existing policies to avoid conflicts
      DROP POLICY IF EXISTS "City Admins can upload documents" ON storage.objects;
      DROP POLICY IF EXISTS "City Admins can view documents" ON storage.objects;

      -- Policy: City Admins and Monitors can upload
      CREATE POLICY "Authenticated users can upload documents"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK ( bucket_id = 'student-documents' );

      -- Policy: Users can view documents (refine this later for strict privacy)
      CREATE POLICY "Authenticated users can view documents"
      ON storage.objects FOR SELECT
      TO authenticated
      USING ( bucket_id = 'student-documents' );
    `);

        console.log('Storage bucket and policies configured.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
