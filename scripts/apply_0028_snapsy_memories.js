const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DIRECT_URL or DATABASE_URL not found in .env.local");
  process.exit(1);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/0028_snapsy_memories.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  try {
    await client.connect();
    console.log("Connected.");
    await client.query(sql);
    console.log("Migration 0028_snapsy_memories.sql applied successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
