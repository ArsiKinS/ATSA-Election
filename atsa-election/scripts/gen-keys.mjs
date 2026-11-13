import { randomBytes } from 'node:crypto';
console.log('SESSION_SECRET=' + randomBytes(32).toString('hex'));
console.log('SETUP_TOKEN=' + randomBytes(16).toString('hex'));
