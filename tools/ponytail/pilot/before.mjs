// Baseline: verbose but complete, pure DEV-only PR readiness predicate.
// This is a fixture for comparison, not a GitHub merge function.
export function readyForDevMerge(pr) {
  if (!pr || typeof pr !== 'object') {
    return false;
  }
  if (pr.base !== 'deepsyq-platform') {
    return false;
  }
  if (pr.state !== 'open') {
    return false;
  }
  if (pr.draft !== false) {
    return false;
  }
  if (typeof pr.headSha !== 'string' || !pr.headSha) {
    return false;
  }
  if (pr.headSha !== pr.expectedHeadSha) {
    return false;
  }
  if (!Array.isArray(pr.checks) || pr.checks.length === 0) {
    return false;
  }
  for (const check of pr.checks) {
    if (!check || check.headSha !== pr.headSha) {
      return false;
    }
    if (check.status !== 'completed' || check.conclusion !== 'success') {
      return false;
    }
  }
  if (!Array.isArray(pr.files) || pr.files.length === 0) {
    return false;
  }
  if (!Array.isArray(pr.allowedFiles)) {
    return false;
  }
  for (const file of pr.files) {
    if (typeof file !== 'string' || !pr.allowedFiles.includes(file)) {
      return false;
    }
  }
  if (pr.requiresSecurityReview && pr.securityPeerPass !== true) {
    return false;
  }
  return true;
}
