import pg from 'pg';
import { readFileSync } from 'node:fs';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
await c.end();
console.log('Schema is up to date.');
