import { generateKeyPairSync, randomBytes } from 'node:crypto';
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
console.log('SESSION_SECRET=' + randomBytes(32).toString('hex'));
console.log('BLIND_KEY_B64=' + Buffer.from(JSON.stringify(privateKey.export({ format: 'jwk' }))).toString('base64'));
