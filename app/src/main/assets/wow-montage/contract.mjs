// Versioned contract. The classic runtime supplies analysis and visual rendering.
export const MONTAGE_STATUS = 'visual-v1';
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

// An enabled request still needs measured analysis before any effects are selected.
export function prepareMontage(request) {
  const validated = createMontageRequest({
    enabled: request?.enabled, mode: request?.mode,
    width: request?.output?.width, height: request?.output?.height,
  });
  return Object.freeze({status: validated.enabled ? 'requires-analysis' : 'disabled', request: validated, effects: Object.freeze([])});
}
