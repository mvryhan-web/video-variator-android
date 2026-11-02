import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCompareAiPolicy } from '../server/compare-ai-policy.js';

const mockCatalog = [
  {
    id: 'openai-gpt4o',
    provider: 'OpenAI',
    kind: 'text',
    enabled: true,
    maintenance: false,
    capabilities: {}
  },
  {
    id: 'gemini-15-pro',
    provider: 'Google',
    kind: 'text',
    enabled: true,
    maintenance: false,
    capabilities: {}
  },
  {
    id: 'claude-35-sonnet',
    provider: 'Anthropic',
    kind: 'text',
    enabled: true,
    maintenance: false,
    capabilities: {}
  },
  {
    id: 'mistral-large',
    provider: 'Mistral',
    kind: 'text',
    enabled: true,
    maintenance: false,
    capabilities: {}
  },
  {
    id: 'disabled-text-model',
    provider: 'ProviderX',
    kind: 'text',
    enabled: false,
    maintenance: false,
    capabilities: {}
  },
  {
    id: 'maintenance-text-model',
    provider: 'ProviderY',
    kind: 'text',
    enabled: true,
    maintenance: true,
    capabilities: {}
  },
  {
    id: 'veo-video',
    provider: 'Google',
    kind: 'video',
    enabled: true,
    maintenance: false,
    capabilities: {
      ratios: ['16:9'],
      resolutions: ['720p', '1080p'],
      durations: [8],
      videoInputModes: ['text', 'first_frame'],
      maxReferences: 1
    }
  },
  {
    id: 'seedance-video',
    provider: 'BytePlus',
    kind: 'video',
    enabled: true,
    maintenance: false,
    capabilities: {
      ratios: ['16:9', '9:16'],
      resolutions: ['720p', '1080p'],
      durations: [5, 8, 15],
      videoInputModes: ['text', 'first_frame', 'first_last', 'reference_image'],
      maxReferences: 3
    }
  }
];

const mockQuotes = {
  'openai-gpt4o': { credits: 10, providerCostMicros: 5000 },
  'gemini-15-pro': { credits: 8, providerCostMicros: 4000 },
  'claude-35-sonnet': { credits: 12, providerCostMicros: 6000 },
  'mistral-large': { credits: 6, providerCostMicros: 3000 },
  'veo-video': { credits: 50, providerCostMicros: 25000 },
  'seedance-video': { credits: 40, providerCostMicros: 20000 }
};

const baseContext = {
  catalog: mockCatalog,
  quotes: mockQuotes,
  user: { credits: 1000, plan: 'pro' },
  env: { COMPARE_AI_ENABLED: 'true' }
};

test('COMPARE AI: throws if feature is explicitly disabled in env', () => {
  const req = {
    kind: 'text',
    candidates: ['openai-gpt4o', 'gemini-15-pro'],
    userConsent: true
  };
  const ctx = { ...baseContext, env: { COMPARE_AI_ENABLED: 'false' } };
  assert.throws(() => validateCompareAiPolicy(req, ctx), /COMPARE_AI_DISABLED/);
});

test('COMPARE AI: rejects invalid candidate count (< 2 or > 4)', () => {
  const req1 = {
    kind: 'text',
    candidates: ['openai-gpt4o'],
    userConsent: true
  };
  assert.throws(() => validateCompareAiPolicy(req1, baseContext), /COMPARE_AI_CANDIDATE_COUNT_INVALID/);

  const req5 = {
    kind: 'text',
    candidates: ['openai-gpt4o', 'gemini-15-pro', 'claude-35-sonnet', 'mistral-large', 'veo-video'],
    userConsent: true
  };
  assert.throws(() => validateCompareAiPolicy(req5, baseContext), /COMPARE_AI_CANDIDATE_COUNT_INVALID/);
});

test('COMPARE AI: rejects duplicate candidates', () => {
  const req = {
    kind: 'text',
    candidates: ['openai-gpt4o', 'openai-gpt4o'],
    userConsent: true
  };
  assert.throws(() => validateCompareAiPolicy(req, baseContext), /COMPARE_AI_DUPLICATE_CANDIDATE/);
});

test('COMPARE AI: rejects disabled, maintenance, or non-existent models', () => {
  const missingReq = {
    kind: 'text',
    candidates: ['openai-gpt4o', 'unknown-model'],
    userConsent: true
  };
  assert.throws(() => validateCompareAiPolicy(missingReq, baseContext), /MODEL_NOT_FOUND/);

  const disabledReq = {
    kind: 'text',
    candidates: ['openai-gpt4o', 'disabled-text-model'],
    userConsent: true
  };
  assert.throws(() => validateCompareAiPolicy(disabledReq, baseContext), /MODEL_NOT_ENABLED/);

  const maintenanceReq = {
    kind: 'text',
    candidates: ['openai-gpt4o', 'maintenance-text-model'],
    userConsent: true
  };
  assert.throws(() => validateCompareAiPolicy(maintenanceReq, baseContext), /MODEL_MAINTENANCE/);
});

test('COMPARE AI: rejects modality or capability mismatch', () => {
  const modalityReq = {
    kind: 'text',
    candidates: ['openai-gpt4o', 'veo-video'],
    userConsent: true
  };
  assert.throws(() => validateCompareAiPolicy(modalityReq, baseContext), /MODEL_MODALITY_MISMATCH/);

  const capabilityReq = {
    kind: 'video',
    candidates: ['veo-video', 'seedance-video'],
    ratio: '9:16', // veo-video does NOT support 9:16
    userConsent: true
  };
  assert.throws(() => validateCompareAiPolicy(capabilityReq, baseContext), /MODEL_MODALITY_MISMATCH/);
});

test('COMPARE AI: rejects missing or invalid server quotes', () => {
  const req = {
    kind: 'text',
    candidates: ['openai-gpt4o', 'gemini-15-pro'],
    userConsent: true
  };
  const ctx = {
    ...baseContext,
    quotes: { 'openai-gpt4o': { credits: 10 } } // gemini-15-pro quote missing
  };
  assert.throws(() => validateCompareAiPolicy(req, ctx), /PRICING_NOT_CONFIGURED/);
});

test('COMPARE AI: requires explicit user consent', () => {
  const req = {
    kind: 'text',
    candidates: ['openai-gpt4o', 'gemini-15-pro'],
    userConsent: false
  };
  assert.throws(() => validateCompareAiPolicy(req, baseContext), /USER_CONSENT_REQUIRED/);
});

test('COMPARE AI: enforces separate approval for Combine synthesis', () => {
  const reqNoApproval = {
    kind: 'text',
    candidates: ['openai-gpt4o', 'gemini-15-pro'],
    userConsent: true,
    combine: true,
    combineApproval: false
  };
  assert.throws(() => validateCompareAiPolicy(reqNoApproval, baseContext), /COMBINE_APPROVAL_REQUIRED/);

  const reqApproved = {
    kind: 'text',
    candidates: ['openai-gpt4o', 'gemini-15-pro'],
    userConsent: true,
    combine: true,
    combineApproval: true
  };
  const res = validateCompareAiPolicy(reqApproved, baseContext);
  assert.equal(res.valid, true);
  assert.equal(res.combine.approved, true);
  assert.equal(res.quotes.combineCreditsRequired, 10);
  assert.equal(res.quotes.totalCreditsRequired, 10 + 8 + 10); // 10 (openai) + 8 (gemini) + 10 (combine on candidate 0)
});

test('COMPARE AI: rejects unpaid or ambiguous reserve state and insufficient credits', () => {
  const req = {
    kind: 'text',
    candidates: ['openai-gpt4o', 'gemini-15-pro'],
    userConsent: true
  };

  const reserveCtx = {
    ...baseContext,
    user: { credits: 1000, reserveStatus: 'unsettled' }
  };
  assert.throws(() => validateCompareAiPolicy(req, reserveCtx), /UNPAID_RESERVE_AMBIGUOUS/);

  const lowCreditCtx = {
    ...baseContext,
    user: { credits: 5 } // 10 + 8 = 18 required
  };
  assert.throws(() => validateCompareAiPolicy(req, lowCreditCtx), /INSUFFICIENT_CREDITS/);
});

test('COMPARE AI: enforces bounded concurrency limits', () => {
  const req = {
    kind: 'text',
    candidates: ['openai-gpt4o', 'gemini-15-pro', 'claude-35-sonnet'],
    userConsent: true
  };
  const highConcurrencyCtx = {
    ...baseContext,
    activeConcurrency: 9,
    env: { COMPARE_AI_ENABLED: 'true', AI_STUDIO_MAX_CONCURRENT_PER_USER: '10' }
  };
  // 9 active + 3 new candidates = 12 > 10
  assert.throws(() => validateCompareAiPolicy(req, highConcurrencyCtx), /AI_CONCURRENCY_LIMIT/);
});

test('COMPARE AI: validates valid 2, 3, and 4 candidate runs with partial failure policy', () => {
  for (const count of [2, 3, 4]) {
    const candidates = ['openai-gpt4o', 'gemini-15-pro', 'claude-35-sonnet', 'mistral-large'].slice(0, count);
    const req = {
      kind: 'text',
      candidates,
      userConsent: true
    };
    const res = validateCompareAiPolicy(req, baseContext);
    assert.equal(res.valid, true);
    assert.equal(res.candidateCount, count);
    assert.equal(res.executionPolicy.allowPartialFailure, true);
    assert.equal(res.executionPolicy.allowPaidReplay, false);
  }
});
