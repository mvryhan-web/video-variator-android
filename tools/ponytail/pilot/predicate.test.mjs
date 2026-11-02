import test from 'node:test';
import assert from 'node:assert/strict';
import { readyForDevMerge as before } from './before.mjs';
import { readyForDevMerge as after } from './after.mjs';

const SHA = '0123456789abcdef0123456789abcdef01234567';
const base = () => ({
  base: 'deepsyq-platform', state: 'open', draft: false,
  headSha: SHA, expectedHeadSha: SHA,
  checks: [{headSha: SHA, status: 'completed', conclusion: 'success'}],
  files: ['tests/safe.spec.mjs'], allowedFiles: ['tests/safe.spec.mjs'],
  requiresSecurityReview: true, securityPeerPass: true
});
const cases = [
  ['valid reviewed DEV PR', base(), true],
  ['absent PR', null, false],
  ['no production main merge', {...base(), base: 'main'}, false],
  ['no closed PR', {...base(), state: 'closed'}, false],
  ['no Draft PR', {...base(), draft: true}, false],
  ['no stale source SHA', {...base(), expectedHeadSha: 'old'}, false],
  ['no nonstring commit SHA', {...base(), headSha: 17, expectedHeadSha: 17, checks: [{headSha: 17, status: 'completed', conclusion: 'success'}]}, false],
  ['no checks', {...base(), checks: []}, false],
  ['no unfinished exact-head CI', {...base(), checks: [{headSha: SHA, status: 'queued'}]}, false],
  ['no failing checks', {...base(), checks: [{headSha: SHA, status: 'completed', conclusion: 'failure'}]}, false],
  ['no old-head check transfer', {...base(), checks: [{headSha: 'stale', status: 'completed', conclusion: 'success'}]}, false],
  ['no absent file scope', {...base(), files: []}, false],
  ['no unowned file', {...base(), files: ['server/generation-studio.js']}, false],
  ['no missing file allowlist', {...base(), allowedFiles: null}, false],
  ['no security bypass', {...base(), securityPeerPass: false}, false],
  ['non-security review not mandatory', {...base(), requiresSecurityReview: false, securityPeerPass: false}, true]
];
for (const [name, candidate, expected] of cases) {
  test(name, () => {
    assert.equal(before(candidate), expected, 'baseline');
    assert.equal(after(candidate), expected, 'Ponytail');
  });
}
