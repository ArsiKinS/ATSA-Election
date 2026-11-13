import test from 'node:test';
import assert from 'node:assert/strict';
import { computeOutcome, type Cand } from '../src/lib/outcome';
const mk = (n: number): Cand[] => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: 'C' + (i + 1), photo: null, for_president: i < 2, for_board: i >= 2 }));
const c = (id: number, n: number) => ({ id, n });

test('winner is President, the other presidential candidate becomes Assistant Secretary', () => {
  const o = computeOutcome(mk(9), [c(1, 5), c(2, 8)], [c(3, 4), c(4, 3), c(5, 2), c(6, 1)], 3);
  assert.equal(o.president.winner, 2); assert.equal(o.assistant, 1);
});
test('board = top 3 by votes; President and Assistant Secretary are not counted for the board', () => {
  const o = computeOutcome(mk(9).map(x => ({ ...x, for_board: true })), [c(1, 5), c(2, 8)], [c(2, 99), c(1, 98), c(3, 4), c(4, 3), c(5, 2), c(6, 1)], 3);
  assert.deepEqual(o.board.members, [3, 4, 5]); assert.equal(o.board.status, 'complete');
});
test('a tie for the last board seat is reported, not decided', () => {
  const o = computeOutcome(mk(9), [c(1, 1), c(2, 2)], [c(3, 9), c(4, 5), c(5, 5), c(6, 5)], 3);
  assert.equal(o.board.status, 'tie'); assert.deepEqual(o.board.members, [3]); assert.deepEqual([...o.board.tied].sort(), [4, 5, 6]);
});
test('a President tie means no automatic Assistant Secretary', () => {
  const o = computeOutcome(mk(9), [c(1, 3), c(2, 3)], [], 3);
  assert.equal(o.president.status, 'tie'); assert.equal(o.assistant, undefined);
});
test('no votes gives no winners', () => {
  const o = computeOutcome(mk(9), [], [], 3);
  assert.equal(o.president.status, 'none'); assert.deepEqual(o.board.members, []); assert.equal(o.board.status, 'short');
});
