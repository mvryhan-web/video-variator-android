// Ponytail pilot: same complete security and CI contract, fewer moving parts.
export function readyForDevMerge(pr) {
  if (!pr || pr.base !== 'deepsyq-platform' || pr.state !== 'open' || pr.draft !== false) return false;
  if (typeof pr.headSha !== 'string' || !pr.headSha || pr.headSha !== pr.expectedHeadSha) return false;
  if (!Array.isArray(pr.checks) || !pr.checks.length || !pr.checks.every(
    c => c?.headSha === pr.headSha && c.status === 'completed' && c.conclusion === 'success'
  )) return false;
  if (!Array.isArray(pr.files) || !pr.files.length || !Array.isArray(pr.allowedFiles) ||
      !pr.files.every(f => typeof f === 'string' && pr.allowedFiles.includes(f))) return false;
  return !pr.requiresSecurityReview || pr.securityPeerPass === true;
}
