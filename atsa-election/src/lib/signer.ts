// Server-side signing key. Raw RSA (no padding) is required for blind signatures; inputs are range-checked.
import { constants, createPrivateKey, privateDecrypt } from 'node:crypto';
import { big, toHex } from './blind';

let cache: { key: ReturnType<typeof createPrivateKey>; n: bigint; e: bigint; size: number } | null = null;
function load() {
  if (cache) return cache;
  const raw = process.env.BLIND_KEY_B64;
  if (!raw) throw new Error('BLIND_KEY_B64 is not set (run npm run keys)');
  const jwk = JSON.parse(Buffer.from(raw, 'base64').toString());
  const nb = Buffer.from(jwk.n, 'base64url'), eb = Buffer.from(jwk.e, 'base64url');
  return (cache = { key: createPrivateKey({ key: jwk, format: 'jwk' }), n: big(nb.toString('hex')), e: big(eb.toString('hex')), size: nb.length });
}
export function pubKey() { const c = load(); return { n: toHex(c.n), e: toHex(c.e), nBig: c.n, eBig: c.e }; }
export function signBlinded(blindedHex: string) {
  const c = load(), m = big(blindedHex);
  if (m <= 1n || m >= c.n) throw new Error('value out of range');
  const buf = Buffer.from(m.toString(16).padStart(c.size * 2, '0'), 'hex');
  return privateDecrypt({ key: c.key, padding: constants.RSA_NO_PADDING }, buf).toString('hex').replace(/^0+(?=.)/, '');
}
