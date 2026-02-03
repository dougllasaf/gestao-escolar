
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function fixBucket() {
    try {
        await client.connect();
        console.log('Connected to database...');

        // 1. Check if bucket exists
        const res = await client.query(`SELECT * FROM storage.buckets WHERE id = 'student-documents'`);
        if (res.rows.length > 0) {
            console.log('Bucket "student-documents" found. Details:', res.rows[0]);

            // Update to public if not public
            if (!res.rows[0].public) {
                console.log('Bucket is not public. Setting to public...');
                await client.query(`UPDATE storage.buckets SET public = true WHERE id = 'student-documents'`);
                console.log('Bucket updated to public.');
            }
        } else {
            console.log('Bucket "student-documents" NOT found. Creating...');
            // Insert with public = true
            await client.query(`
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('student-documents', 'student-documents', true, null, null);
      `);
            console.log('Bucket created successfully.');
        }

        // 2. Ensure Policies exists (Checking blindly is hard, just drop and recreate is safer for script)
        console.log('Refreshing storage policies...');
        await client.query(`
      DROP POLICY IF EXISTS "Public View" ON storage.objects;
      DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
      
      -- Allow public read access to this bucket
      CREATE POLICY "Public View"
      ON storage.objects FOR SELECT
      USING ( bucket_id = 'student-documents' );

      -- Allow authenticated uploads
      CREATE POLICY "Auth Upload"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK ( bucket_id = 'student-documents' );
    `);
        console.log('Policies refreshed.');

    } catch (err) {
        console.error('Error fixing bucket:', err);
    } finally {
        await client.end();
    }
}

fixBucket();
