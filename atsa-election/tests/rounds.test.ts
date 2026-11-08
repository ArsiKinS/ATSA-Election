import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRounds } from '../src/lib/rounds';
const pos = [1, 2, 3].map(i => ({ id: i, name_en: 'P' + i, name_th: '' }));
const cands = ['A', 'B', 'C'].map((n, i) => ({ id: i + 1, name: n, photo: null }));
const c = (position_id: number, candidate_id: number, n: number) => ({ position_id, candidate_id, n });

test('winner of an earlier position is excluded from later ones', () => {
  const r = computeRounds(pos, cands, [c(1, 1, 5), c(1, 2, 2), c(2, 1, 9), c(2, 2, 4), c(2, 3, 3), c(3, 3, 1), c(3, 2, 1)]);
  assert.equal(r[0].winner, 1);
  assert.equal(r[1].winner, 2); // A had the most votes for position 2 but already won position 1
  assert.ok(!r[1].rows.some(x => x.id === 1));
});
test('a tie stops counting and later positions stay pending', () => {
  const r = computeRounds(pos, cands, [c(1, 1, 3), c(1, 2, 3)]);
  assert.equal(r[0].status, 'tie'); assert.deepEqual(r[0].tied, [1, 2]); assert.equal(r[1].status, 'pending');
});
test('no votes is reported, not guessed', () => assert.equal(computeRounds(pos, cands, [])[0].status, 'noVotes'));
