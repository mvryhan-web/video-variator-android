// Storage entitlements consume verified payment periods, never browser plan claims.
const DAY = 86_400_000;
const GRACE_DAYS = 30;
export const CREATION_STORAGE_LIMITS = Object.freeze({
  trial: 500_000_000,
  basic: 2_000_000_000,
  pro: 10_000_000_000,
  business: 50_000_000_000,
  lifetime: 1_000_000_000_000
});

function addUtcYear(timestamp) {
  const date = new Date(timestamp);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime();
}

export function creationStorageAccess(grant, now = Date.now()) {
  const unavailable = {state: 'unavailable', limitBytes: 0, canWrite: false, canDownload: false};
  if (!grant || !Object.hasOwn(CREATION_STORAGE_LIMITS, grant.plan) || !Number.isFinite(now)) return unavailable;
  const start = grant.paidAt;
  if (!Number.isSafeInteger(start) || start <= 0 || now < start) return unavailable;

  // Recurring plans keep access through their last verified paid period.
  const end = grant.plan === 'trial' ? start + 3 * DAY
    : grant.plan === 'lifetime' ? addUtcYear(start)
    : grant.paidThrough;
  if (!Number.isSafeInteger(end) || end <= start) return unavailable;

  const downloadUntil = end + GRACE_DAYS * DAY;
  const active = now < end;
  const canDownload = now < downloadUntil;
  return {
    state: active ? 'active' : canDownload ? 'download-only' : 'expired',
    limitBytes: CREATION_STORAGE_LIMITS[grant.plan],
    canWrite: active,
    canDownload,
    expiresAt: end,
    downloadUntil
  };
}

// Caller must reserve bytes atomically with the account's current usage.
export function fitsCreationStorage(access, usedBytes, incomingBytes) {
  return access.canWrite === true && Number.isSafeInteger(usedBytes) && usedBytes >= 0
    && Number.isSafeInteger(incomingBytes) && incomingBytes > 0
    && incomingBytes <= access.limitBytes - usedBytes;
}
