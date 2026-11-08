import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

// Same key generation as keygen.html (WebCrypto), to prove the browser-made key works with the server signer.
async function makeKey() {
  const k = await webcrypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
  process.env.BLIND_KEY_B64 = Buffer.from(JSON.stringify(await webcrypto.subtle.exportKey('jwk', k.privateKey))).toString('base64');
}

test('blind signature round trip: sign blinded, unblind, verify', async () => {
  await makeKey();
  const { pubKey, signBlinded } = await import('../src/lib/signer');
  const { blind, unblind, verifySig, big } = await import('../src/lib/blind');
  const k = pubKey(), b = await blind(k.nBig, k.eBig);
  assert.ok(big(b.blinded) < k.nBig);
  const sig = await unblind(signBlinded(b.blinded), b, k.nBig, k.eBig);
  assert.equal(await verifySig(b.token, sig, k.nBig, k.eBig), true);
  assert.equal(await verifySig(b.token.replace(/^./, c => (c === 'a' ? 'b' : 'a')), sig, k.nBig, k.eBig), false, 'another token must not verify');
});

test('the signer never sees the final token or signature (blinded value differs)', async () => {
  await makeKey();
  const { pubKey, signBlinded } = await import('../src/lib/signer');
  const { blind, unblind } = await import('../src/lib/blind');
  const k = pubKey(), b = await blind(k.nBig, k.eBig), blindSig = signBlinded(b.blinded), sig = await unblind(blindSig, b, k.nBig, k.eBig);
  assert.notEqual(blindSig, sig);
  assert.notEqual(b.blinded, b.token);
});

test('signer rejects out-of-range values', async () => {
  await makeKey();
  const { pubKey, signBlinded } = await import('../src/lib/signer');
  assert.throws(() => signBlinded('1'));
  assert.throws(() => signBlinded(pubKey().n));
});
