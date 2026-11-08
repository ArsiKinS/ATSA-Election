import { Pool } from 'pg';
const g = globalThis as unknown as { __pool?: Pool };
export const pool = g.__pool ?? (g.__pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 }));
export async function q<T = Record<string, any>>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}
