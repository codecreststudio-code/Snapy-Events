// scripts/apply_migration.js
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
  try {
    await client.connect();
    console.log("Connected.");

    // Add resend_id column if not already present
    const patchSql = `
      ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS resend_id TEXT;
    `;
    await client.query(patchSql);
    console.log("email_logs.resend_id column ensured.");
  } catch (error) {
    console.error("Patch failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
