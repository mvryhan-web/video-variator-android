import { estimateGenerationPricing } from './generation-pricing.js';

function isCompatible(model, request) {
  if (!model || !model.enabled || model.maintenance) return false;
  if (model.kind !== request.kind) return false;

  const caps = model.capabilities || {};
  const ratios = Array.isArray(caps.ratios) ? caps.ratios : (model.ratios || []);
  const maxReferences = Number(caps.maxReferences ?? model.references ?? 0);

  if (request.ratio && ratios.length > 0 && !ratios.includes(request.ratio)) {
    return false;
  }

  const refs = Array.isArray(request.references)
    ? request.references.length
    : (Number.isInteger(request.referenceCount) ? request.referenceCount : 0);

  if (refs < 0 || refs > maxReferences) {
    return false;
  }

  if (request.kind === 'video') {
    const mode = request.videoInputMode || (refs ? 'first_frame' : 'text');
    const modes = caps.videoInputModes;
    if (Array.isArray(modes) && !modes.includes(mode)) return false;

    const resolution = request.videoResolution ?? model.quality ?? caps.quality;
    const duration = request.videoDuration ?? caps.durationSeconds;

    if (Array.isArray(caps.resolutions) && caps.resolutions.length > 0 && resolution && !caps.resolutions.includes(resolution)) {
      return false;
    }
    if (Array.isArray(caps.durations) && caps.durations.length > 0 && duration && !caps.durations.includes(duration)) {
      return false;
    }
  }

  return true;
}

export function validateCompareAiPolicy(request, context = {}) {
  const env = context.env || process.env || {};

  if (env.COMPARE_AI_ENABLED === 'false') {
    const err = new Error('COMPARE_AI_DISABLED');
    err.status = 403;
    throw err;
  }

  if (!request || !request.kind || typeof request.kind !== 'string') {
    const err = new Error('INVALID_MODALITY');
    err.status = 400;
    throw err;
  }

  const rawCandidates = request.candidates || request.models;
  if (!Array.isArray(rawCandidates) || rawCandidates.length < 2 || rawCandidates.length > 4) {
    const err = new Error('COMPARE_AI_CANDIDATE_COUNT_INVALID');
    err.status = 400;
    throw err;
  }

  const catalog = context.catalog || [];
  const candidateIds = rawCandidates.map(c => (typeof c === 'string' ? c : c?.id || c?.model)).filter(Boolean);

  if (candidateIds.length !== rawCandidates.length) {
    const err = new Error('INVALID_CANDIDATE_FORMAT');
    err.status = 400;
    throw err;
  }

  const uniqueIds = new Set(candidateIds);
  if (uniqueIds.size !== candidateIds.length) {
    const err = new Error('COMPARE_AI_DUPLICATE_CANDIDATE');
    err.status = 400;
    throw err;
  }

  const validatedCandidates = [];
  const candidateQuotes = [];

  for (const modelId of candidateIds) {
    const matches = catalog.filter(m => m.id === modelId && m.kind === request.kind);
    if (matches.length === 0) {
      const anyKind = catalog.find(m => m.id === modelId);
      const err = new Error(anyKind ? 'MODEL_MODALITY_MISMATCH' : 'MODEL_NOT_FOUND');
      err.status = 400;
      throw err;
    }
    if (matches.length > 1) {
      const err = new Error('MODEL_AMBIGUOUS');
      err.status = 400;
      throw err;
    }

    const model = matches[0];
    if (model.maintenance) {
      const err = new Error('MODEL_MAINTENANCE');
      err.status = 503;
      throw err;
    }
    if (!model.enabled) {
      const err = new Error('MODEL_NOT_ENABLED');
      err.status = 400;
      throw err;
    }

    if (!isCompatible(model, request)) {
      const err = new Error('MODEL_MODALITY_MISMATCH');
      err.status = 400;
      throw err;
    }

    // Explicit server quote calculation
    let quote = context.quotes?.[model.id];
    if (!quote && typeof context.estimatePricing === 'function') {
      quote = context.estimatePricing({ ...request, model: model.id }, model, env);
    } else if (!quote && context.pricingCatalog) {
      quote = estimateGenerationPricing({ ...request, model: model.id }, model, env);
    } else if (!quote) {
      quote = estimateGenerationPricing({ ...request, model: model.id }, model, env);
    }

    if (!quote || typeof quote.credits !== 'number' || quote.credits <= 0) {
      const err = new Error('PRICING_NOT_CONFIGURED');
      err.status = 402;
      throw err;
    }

    validatedCandidates.push(model);
    candidateQuotes.push({
      modelId: model.id,
      provider: model.provider,
      credits: quote.credits,
      providerCostMicros: quote.providerCostMicros ?? null
    });
  }

  // Combine synthesis check
  let combineQuote = null;
  let combineModel = null;
  const combineRequested = Boolean(request.combine || request.combineRequested);

  if (combineRequested) {
    if (request.combineApproval !== true && request.combineConsented !== true) {
      const err = new Error('COMBINE_APPROVAL_REQUIRED');
      err.status = 400;
      throw err;
    }

    const combineModelId = request.combineModel || request.synthesisModel || candidateIds[0];
    const combineMatches = catalog.filter(m => m.id === combineModelId && m.kind === request.kind);
    if (!combineMatches.length) {
      const err = new Error('COMBINE_MODEL_NOT_FOUND');
      err.status = 400;
      throw err;
    }
    combineModel = combineMatches[0];

    if (!combineModel.enabled || combineModel.maintenance || !isCompatible(combineModel, request)) {
      const err = new Error('COMBINE_MODEL_UNAVAILABLE');
      err.status = 400;
      throw err;
    }

    let cQuote = context.quotes?.[`combine:${combineModel.id}`] || context.quotes?.[combineModel.id];
    if (!cQuote && typeof context.estimatePricing === 'function') {
      cQuote = context.estimatePricing({ ...request, model: combineModel.id }, combineModel, env);
    } else if (!cQuote) {
      cQuote = estimateGenerationPricing({ ...request, model: combineModel.id }, combineModel, env);
    }

    if (!cQuote || typeof cQuote.credits !== 'number' || cQuote.credits <= 0) {
      const err = new Error('COMBINE_PRICING_NOT_CONFIGURED');
      err.status = 402;
      throw err;
    }

    combineQuote = {
      modelId: combineModel.id,
      provider: combineModel.provider,
      credits: cQuote.credits,
      providerCostMicros: cQuote.providerCostMicros ?? null
    };
  }

  // User consent verification
  if (request.userConsent !== true) {
    const err = new Error('USER_CONSENT_REQUIRED');
    err.status = 400;
    throw err;
  }

  // Credit calculation & reserve status check
  const user = context.user || {};
  if (user.reserveStatus === 'unsettled' || user.hasUnpaidReserve === true || user.reserveAmbiguous === true) {
    const err = new Error('UNPAID_RESERVE_AMBIGUOUS');
    err.status = 402;
    throw err;
  }

  const compareCreditsRequired = candidateQuotes.reduce((sum, q) => sum + q.credits, 0);
  const combineCreditsRequired = combineQuote ? combineQuote.credits : 0;
  const totalCreditsRequired = compareCreditsRequired + combineCreditsRequired;

  if (typeof user.credits === 'number' && user.credits < totalCreditsRequired) {
    const err = new Error('INSUFFICIENT_CREDITS');
    err.status = 402;
    throw err;
  }

  // Concurrency check
  const maxConcurrent = Number(env.AI_STUDIO_MAX_CONCURRENT_PER_USER || context.policy?.maxConcurrentPerUser || 10);
  const activeConcurrent = Number(context.activeConcurrency ?? user.activeConcurrency ?? 0);

  if (activeConcurrent + candidateIds.length > maxConcurrent) {
    const err = new Error('AI_CONCURRENCY_LIMIT');
    err.status = 429;
    throw err;
  }

  return {
    valid: true,
    kind: request.kind,
    candidateCount: candidateIds.length,
    candidateIds,
    candidates: validatedCandidates.map(m => ({ id: m.id, provider: m.provider })),
    quotes: {
      candidates: candidateQuotes,
      compareCreditsRequired,
      combineCreditsRequired,
      totalCreditsRequired
    },
    combine: combineRequested
      ? {
          approved: true,
          modelId: combineModel.id,
          provider: combineModel.provider,
          credits: combineQuote.credits
        }
      : null,
    executionPolicy: {
      allowPartialFailure: true,
      allowPaidReplay: false,
      boundedConcurrencyLimit: maxConcurrent,
      activeConcurrency: activeConcurrent
    }
  };
}
