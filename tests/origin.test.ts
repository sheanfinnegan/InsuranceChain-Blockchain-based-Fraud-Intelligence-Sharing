import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin } from '../lib/request-origin';
test('accepts browser origin against actual Host even when internal hostname differs', () => {
  assert.equal(isAllowedOrigin('http://127.0.0.1:3000', '127.0.0.1:3000', 'http:'), true);
  assert.equal(isAllowedOrigin('http://localhost:3000', 'localhost:3000', 'http:'), true);
});
test('rejects cross-origin, wrong-port, null and malformed requests', () => {
  for (const origin of [
    'https://evil.test',
    'http://localhost:4000',
    'null',
    'http://localhost:3000.evil.test',
    'file://localhost:3000',
    'http://localhost:3000/path',
  ])
    assert.equal(isAllowedOrigin(origin, 'localhost:3000', 'http:'), false, origin);
});
test('explicit deployment origins are exact, not wildcards', () => {
  assert.equal(
    isAllowedOrigin('https://insurance.test', 'internal:3000', 'http:', 'https://insurance.test'),
    true,
  );
  assert.equal(
    isAllowedOrigin(
      'https://insurance.test.evil.test',
      'internal:3000',
      'http:',
      'https://insurance.test',
    ),
    false,
  );
});
