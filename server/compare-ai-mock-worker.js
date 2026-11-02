/**
 * Safe bounded mock compare worker for Compare AI execution simulation.
 * Pure injected-adapter simulation without network, API, billing or real provider dispatch.
 */

const executedPlanIds = new WeakSet();
const executedPlanTokens = new Set();

/**
 * Validates the preflight plan and options before execution.
 */
function validatePreflightPlan(plan) {
  if (!plan || typeof plan !== 'object') {
    const err = new Error('INVALID_PREFLIGHT_PLAN');
    err.code = 'INVALID_PREFLIGHT_PLAN';
    throw err;
  }

  if (plan.valid !== true || plan.disabled === true || plan.forged === true || plan.ambiguous === true) {
    const err = new Error('INVALID_PREFLIGHT_PLAN');
    err.code = 'INVALID_PREFLIGHT_PLAN';
    throw err;
  }

  // Idempotency / repeated submission check
  if (executedPlanIds.has(plan) || (plan.id && executedPlanTokens.has(plan.id))) {
    const err = new Error('REPEATED_SUBMISSION_DISALLOWED');
    err.code = 'REPEATED_SUBMISSION_DISALLOWED';
    throw err;
  }

  const rawCandidates = plan.candidates || plan.candidateIds || plan.models;
  if (!Array.isArray(rawCandidates)) {
    const err = new Error('COMPARE_AI_CANDIDATE_COUNT_INVALID');
    err.code = 'COMPARE_AI_CANDIDATE_COUNT_INVALID';
    throw err;
  }

  if (rawCandidates.length < 2 || rawCandidates.length > 4) {
    const err = new Error('COMPARE_AI_CANDIDATE_COUNT_INVALID');
    err.code = 'COMPARE_AI_CANDIDATE_COUNT_INVALID';
    throw err;
  }

  const candidateIds = rawCandidates.map(c => {
    if (typeof c === 'string') return c;
    if (c && typeof c === 'object') return c.id || c.modelId || c.model;
    return null;
  });

  if (candidateIds.some(id => !id)) {
    const err = new Error('INVALID_CANDIDATE_FORMAT');
    err.code = 'INVALID_CANDIDATE_FORMAT';
    throw err;
  }

  const uniqueIds = new Set(candidateIds);
  if (uniqueIds.size !== candidateIds.length) {
    const err = new Error('COMPARE_AI_DUPLICATE_CANDIDATE');
    err.code = 'COMPARE_AI_DUPLICATE_CANDIDATE';
    throw err;
  }

  return {
    rawCandidates,
    candidateIds
  };
}

/**
 * Validates adapter output format to guard against malformed data.
 */
function isValidAdapterResult(res) {
  if (res === null || res === undefined) return false;
  if (typeof res !== 'object') return false;
  if (res.malformed === true) return false;
  return true;
}

/**
 * Runs the mock worker with bounded parallel execution and cancellation support.
 */
export async function executeCompareAiMock(plan, options = {}) {
  // Validate preflight plan
  const { rawCandidates, candidateIds } = validatePreflightPlan(plan);

  // Mark plan as executed for repeated submission prevention
  executedPlanIds.add(plan);
  if (plan.id) executedPlanTokens.add(plan.id);

  const signal = options.signal || options.abortSignal;
  const concurrencyLimit = Math.max(1, Math.min(4, Number(options.concurrency || plan.executionPolicy?.boundedConcurrencyLimit || 2)));
  const adapterResolver = options.adapters || options.adapter || (typeof options === 'function' ? options : null);

  // Check abort-before-start
  if (signal && signal.aborted) {
    const cancelledResults = rawCandidates.map((cand, idx) => {
      const candidateId = candidateIds[idx];
      const modelId = typeof cand === 'object' ? (cand.id || cand.modelId || candidateId) : candidateId;
      const provider = typeof cand === 'object' ? (cand.provider || 'mock') : 'mock';
      return {
        candidateId,
        modelId,
        provider,
        status: 'cancelled',
        result: null,
        error: 'EXECUTION_CANCELLED',
        durationMs: 0
      };
    });

    return {
      success: false,
      status: 'cancelled',
      candidates: cancelledResults,
      summary: {
        total: rawCandidates.length,
        fulfilled: 0,
        failed: 0,
        cancelled: rawCandidates.length
      }
    };
  }

  // Per-candidate state tracking
  const candidateStates = rawCandidates.map((cand, idx) => {
    const candidateId = candidateIds[idx];
    const modelId = typeof cand === 'object' ? (cand.id || cand.modelId || candidateId) : candidateId;
    const provider = typeof cand === 'object' ? (cand.provider || 'mock') : 'mock';
    return {
      index: idx,
      candidate: cand,
      candidateId,
      modelId,
      provider,
      status: 'queued',
      result: null,
      error: null,
      durationMs: 0
    };
  });

  let activeCount = 0;
  let isCancelled = false;
  const queue = [...candidateStates];

  const notifyStatus = (state) => {
    if (typeof options.onStatusChange === 'function') {
      try {
        options.onStatusChange({
          candidateId: state.candidateId,
          modelId: state.modelId,
          provider: state.provider,
          status: state.status,
          result: state.result,
          error: state.error
        });
      } catch (_) {}
    }
  };

  return new Promise((resolve) => {
    const checkCompletion = () => {
      const allFinished = candidateStates.every(s => ['fulfilled', 'failed', 'cancelled'].includes(s.status));
      if (allFinished && activeCount === 0) {
        const fulfilledCount = candidateStates.filter(s => s.status === 'fulfilled').length;
        const failedCount = candidateStates.filter(s => s.status === 'failed').length;
        const cancelledCount = candidateStates.filter(s => s.status === 'cancelled').length;

        let overallStatus = 'completed';
        if (cancelledCount === candidateStates.length) {
          overallStatus = 'cancelled';
        } else if (fulfilledCount === 0) {
          overallStatus = 'failed';
        } else if (failedCount > 0 || cancelledCount > 0) {
          overallStatus = 'partial_success';
        }

        resolve({
          success: fulfilledCount > 0,
          status: overallStatus,
          candidates: candidateStates.map(s => ({
            candidateId: s.candidateId,
            modelId: s.modelId,
            provider: s.provider,
            status: s.status,
            result: s.result,
            error: s.error,
            durationMs: s.durationMs
          })),
          summary: {
            total: candidateStates.length,
            fulfilled: fulfilledCount,
            failed: failedCount,
            cancelled: cancelledCount
          }
        });
      }
    };

    const processQueue = () => {
      if (isCancelled || (signal && signal.aborted)) {
        isCancelled = true;
        // Drain remaining queued items without starting new work
        while (queue.length > 0) {
          const item = queue.shift();
          item.status = 'cancelled';
          item.error = 'EXECUTION_CANCELLED';
          notifyStatus(item);
        }
        checkCompletion();
        return;
      }

      while (activeCount < concurrencyLimit && queue.length > 0 && !isCancelled && !(signal && signal.aborted)) {
        const item = queue.shift();
        item.status = 'running';
        activeCount++;
        notifyStatus(item);

        if (typeof options.onActiveCountChange === 'function') {
          try { options.onActiveCountChange(activeCount); } catch (_) {}
        }

        const startTime = Date.now();

        // Determine candidate adapter
        let adapterFn = null;
        if (typeof adapterResolver === 'function') {
          adapterFn = adapterResolver;
        } else if (adapterResolver && typeof adapterResolver === 'object') {
          adapterFn = adapterResolver[item.modelId] || adapterResolver[item.candidateId] || adapterResolver[item.provider] || adapterResolver.default;
        }

        if (!adapterFn) {
          item.status = 'failed';
          item.error = 'ADAPTER_NOT_PROVIDED';
          item.durationMs = Date.now() - startTime;
          activeCount--;
          notifyStatus(item);
          processQueue();
          continue;
        }

        // Execute adapter asynchronously
        Promise.resolve()
          .then(() => adapterFn(item.candidate, { signal, modelId: item.modelId, provider: item.provider }))
          .then((res) => {
            item.durationMs = Date.now() - startTime;
            if (signal && signal.aborted) {
              item.status = 'cancelled';
              item.result = null;
              item.error = 'EXECUTION_CANCELLED';
            } else if (!isValidAdapterResult(res)) {
              item.status = 'failed';
              item.result = null;
              item.error = 'MALFORMED_ADAPTER_RESPONSE';
            } else {
              item.status = 'fulfilled';
              item.result = res;
              item.error = null;
            }
          })
          .catch((err) => {
            item.durationMs = Date.now() - startTime;
            if (signal && signal.aborted) {
              item.status = 'cancelled';
              item.result = null;
              item.error = 'EXECUTION_CANCELLED';
            } else {
              item.status = 'failed';
              item.result = null;
              item.error = (err && err.message) ? err.message : 'ADAPTER_EXECUTION_ERROR';
            }
          })
          .finally(() => {
            activeCount--;
            notifyStatus(item);
            if (typeof options.onActiveCountChange === 'function') {
              try { options.onActiveCountChange(activeCount); } catch (_) {}
            }
            processQueue();
            checkCompletion();
          });
      }

      checkCompletion();
    };

    if (signal) {
      signal.addEventListener('abort', () => {
        isCancelled = true;
        processQueue();
      }, { once: true });
    }

    processQueue();
  });
}

/**
 * Convenient alias matching both runCompareAiMockWorker and executeCompareAiMock calls.
 */
export function runCompareAiMockWorker(plan, adaptersOrOptions, optionsOverride = {}) {
  let opts = {};
  if (typeof adaptersOrOptions === 'function' || (adaptersOrOptions && typeof adaptersOrOptions === 'object' && !adaptersOrOptions.concurrency && !adaptersOrOptions.signal && !adaptersOrOptions.adapters && (typeof adaptersOrOptions['openai-gpt4o'] === 'function' || typeof Object.values(adaptersOrOptions)[0] === 'function'))) {
    opts = { ...optionsOverride, adapters: adaptersOrOptions };
  } else {
    opts = { ...adaptersOrOptions, ...optionsOverride };
  }
  return executeCompareAiMock(plan, opts);
}
