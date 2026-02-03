
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
    try {
        await client.connect();
        console.log('Connected to database...');

        // 1. Add new columns to routes table
        console.log('Adding new columns to routes table...');
        await client.query(`
      ALTER TABLE routes
      ADD COLUMN IF NOT EXISTS vehicle_type TEXT CHECK (vehicle_type IN ('Micro', 'Ônibus', 'Kombi')),
      ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
      ADD COLUMN IF NOT EXISTS max_capacity INTEGER,
      ADD COLUMN IF NOT EXISTS vehicle_document_url TEXT,
      ADD COLUMN IF NOT EXISTS driver_document_url TEXT;
    `);
        console.log('Columns added successfully.');

        // 2. Insert storage bucket if not exists
        console.log('Ensuring storage bucket "route-documents" exists...');
        // We check if it exists first to avoid errors, or use ON CONFLICT if supported for this table structure in supabase
        // For safety, we'll try to insert and handle conflict or just check first.
        // The previous script used ON CONFLICT DO NOTHING which is good.
        await client.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('route-documents', 'route-documents', true, null, null)
      ON CONFLICT (id) DO UPDATE SET public = true; 
    `);

        // 3. Storage Policies
        console.log('Setting up storage policies for route-documents...');

        await client.query(`
      -- Drop existing policies to avoid conflicts
      DROP POLICY IF EXISTS "Public View Routes" ON storage.objects;
      DROP POLICY IF EXISTS "Auth Upload Routes" ON storage.objects;

      -- Policy: Public View
      CREATE POLICY "Public View Routes"
      ON storage.objects FOR SELECT
      USING ( bucket_id = 'route-documents' );

      -- Policy: Authenticated Upload (City Admit/Monitor)
      CREATE POLICY "Auth Upload Routes"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK ( bucket_id = 'route-documents' );
    `);

        console.log('Storage bucket and policies configured.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
