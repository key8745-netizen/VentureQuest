import test from 'node:test';
import assert from 'node:assert/strict';

import { modes, getCopy } from '../src/models/terminology.js';

test('switches key labels between professional and plain language', () => {
  for (const key of ['survivalLine', 'unitMargin', 'todayMicroTask']) {
    const pro = getCopy(key, modes.PRO);
    const plain = getCopy(key, modes.PLAIN);

    assert.equal(typeof pro, 'string');
    assert.equal(typeof plain, 'string');
    assert.notEqual(pro, plain, `key ${key} must differ between modes`);
  }
});

test('falls back to professional wording for unknown mode', () => {
  assert.equal(
    getCopy('survivalLine', 'street-poetry'),
    getCopy('survivalLine', modes.PRO),
  );

  // Unknown keys surface themselves instead of rendering blank UI.
  assert.equal(getCopy('doesNotExist', modes.PRO), 'doesNotExist');
});
