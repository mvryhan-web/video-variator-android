// Release preflight may run in CI with DATABASE_URL, Stripe and provider keys.
// Never log errors from external parsers/drivers verbatim: they can contain a
// connection string, authentication details or full provider response.
const SAFE_CODES=Object.freeze({
  ECONNREFUSED:'PREFLIGHT_DB_CONNECTION_REFUSED',
  ENOTFOUND:'PREFLIGHT_DB_HOST_UNRESOLVED',
  ETIMEDOUT:'PREFLIGHT_DB_TIMEOUT',
  ECONNRESET:'PREFLIGHT_DB_CONNECTION_LOST',
  '28P01':'PREFLIGHT_DB_AUTHENTICATION_FAILED',
  '3D000':'PREFLIGHT_DB_MISSING',
  '42501':'PREFLIGHT_DB_PERMISSION_DENIED',
  '08006':'PREFLIGHT_DB_CONNECTION_FAILED',
  '08001':'PREFLIGHT_DB_CONNECTION_FAILED',
  CERT_HAS_EXPIRED:'PREFLIGHT_TLS_CERTIFICATE_INVALID',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE:'PREFLIGHT_TLS_CERTIFICATE_INVALID',
  ERR_INVALID_URL:'PREFLIGHT_DB_URL_INVALID',
  ENOENT:'PREFLIGHT_MIGRATION_FILE_MISSING'
});

export function safeAiPreflightError(error){
  // Preserve actionable drift classification without leaking a ledger name or a raw database exception.
  if(typeof error?.message==='string'&&error.message.startsWith('MIGRATION_CHECKSUM_MISMATCH:'))
    return 'PREFLIGHT_MIGRATION_CHECKSUM_MISMATCH';
  // The code field itself is attacker-/driver-controlled. Never echo it:
  // return only constant, reviewed literals.
  const code=typeof error?.code==='string'?error.code:'';
  return Object.hasOwn(SAFE_CODES,code)
    ? SAFE_CODES[code]
    : 'PREFLIGHT_VALIDATION_FAILED';
}
