// Stage 1 contract only. Intentionally not imported by any application page.
export const MONTAGE_STATUS = 'not-implemented';
const MODES = new Set(['gentle', 'balanced', 'dynamic']);

export function createMontageRequest({enabled = false, mode = 'gentle', width, height} = {}) {
  if (typeof enabled !== 'boolean') throw new TypeError('enabled must be a boolean');
  if (!MODES.has(mode)) throw new TypeError('Unknown uniquification mode');
  if (![width, height].every(n => Number.isSafeInteger(n) && n > 0 && n % 2 === 0)) {
    throw new TypeError('Output dimensions must be positive even integers');
  }
  return Object.freeze({
    version: 1, enabled, mode,
    output: Object.freeze({width, height}),
    // Relative to the standard mode output, not the unprocessed source.
    invariants: Object.freeze({preserveGeometry: true, preserveAudio: true, preserveTimeline: true}),
  });
}

// No renderer, pretend analysis, or silently enabled option in this stage.
export function prepareMontage(request) {
  const validated = createMontageRequest({
    enabled: request?.enabled, mode: request?.mode,
    width: request?.output?.width, height: request?.output?.height,
  });
  if (validated.enabled) {
    const error = new Error('WOW Montage is not implemented; do not expose an active control.');
    error.code = 'WOW_MONTAGE_NOT_READY';
    throw error;
  }
  return Object.freeze({status: 'disabled', request: validated, effects: Object.freeze([])});
}
