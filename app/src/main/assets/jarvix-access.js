// Verify paid JARVIX AI access with the authenticated DEEPSYQ account.
// Never trust localStorage.vv_plan or a client-supplied plan as payment proof.
let cached = null;
export async function hasVerifiedJarvixSubscription() {
  const token = localStorage.getItem('vv_token') || '';
  if (!token) return false;
  if (cached && cached.token === token && Date.now() - cached.checkedAt < 30000)
    return cached.allowed;
  try {
    const reply = await fetch('/api/me', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
    if (!reply.ok) return false;
    const user = (await reply.json()).user;
    const usage = user?.usage;
    const allowed = user?.isAdmin === true || (
      usage?.active === true &&
      ['basic', 'pro', 'business', 'lifetime'].includes(usage.plan) &&
      ['active', 'lifetime'].includes(usage.status)
    );
    cached = {token, allowed, checkedAt:Date.now()};
    return allowed;
  } catch (_) { return false; }
}
