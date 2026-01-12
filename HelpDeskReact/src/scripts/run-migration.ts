
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Try to get connection string from various common names
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error("❌ No database connection string found in .env.local (checked POSTGRES_URL, DATABASE_URL, SUPABASE_DB_URL)");
    process.exit(1);
}

const migrationFile = 'supabase/migrations/20251213000001_add_permission_role_type.sql';
const sqlPath = path.resolve(process.cwd(), migrationFile);

if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Migration file not found: ${sqlPath}`);
    process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

async function runMigration() {
    console.log(`🔌 Connecting to database...`);
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase in many envs
    });

    try {
        await client.connect();
        console.log(`🚀 Executing migration: ${migrationFile}`);
        await client.query(sql);
        console.log(`✅ Migration applied successfully!`);
    } catch (err) {
        console.error(`❌ Migration failed:`, err);
    } finally {
        await client.end();
    }
}

runMigration();
