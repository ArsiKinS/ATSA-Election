import { createHash, randomBytes } from 'node:crypto';
// One-time online voting codes: 10 characters, no look-alike letters (no 0/O/1/I/L). Only the hash is stored.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newCode() { let s = ''; for (const b of randomBytes(10)) s += ALPHABET[b % ALPHABET.length]; return s.slice(0, 5) + '-' + s.slice(5); }
export const hashCode = (c: string) => createHash('sha256').update(c.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
