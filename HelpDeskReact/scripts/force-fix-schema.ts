
import { Client } from 'pg';

async function main() {
    // Default Supabase Local DB credentials
    const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

    console.log('Connecting to database...');
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected successfully.');

        console.log('Adding updated_at column...');
        await client.query(`
            ALTER TABLE public.requests 
            ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
        `);
        console.log('Column added.');

        console.log('forcing schema cache reload...');
        await client.query(`NOTIFY pgrst, 'reload schema';`);

        console.log('Done.');
    } catch (err) {
        console.error('Migration failed:', err);
        console.log('\nTIP: If authentication failed, your local DB password might not be "postgres".');
    } finally {
        await client.end();
    }
}

main();
