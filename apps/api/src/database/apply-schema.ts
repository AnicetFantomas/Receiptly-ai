// Applies db/schema.sql to the database. Stands in for Vidya's psql-based
// `db:schema` script because psql isn't installed on this machine — we already
// depend on `pg`, so a tiny Node runner keeps setup to `npm install` + Docker.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env.');

  const sql = readFileSync(join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf-8');
  const pool = new Pool({ connectionString: url });
  try {
    await pool.query(sql);
    console.log('Schema applied.');
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
