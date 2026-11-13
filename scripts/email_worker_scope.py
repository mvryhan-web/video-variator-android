"""Verify that an Email Worker release changes no Google OAuth code or other backend behavior.

Reverse only four explicitly-approved Email integrations and require byte-for-byte
equality to the canonical LIVE Worker source. Used before any Cloudflare upload.
"""
from __future__ import annotations

def once(source: str, before: str, after: str, name: str) -> str:
    if source.count(before) != 1:
        raise ValueError(f"Email worker scope mismatch ({name}): expected exactly one anchor")
    return source.replace(before, after, 1)

NEW_IMPORT = "import {emailStorageReady,performEmailAuth} from '../../../../server/edge-email-auth.js';\n"
NEW_OWNER = """\n\nfunction isVerifiedOwnerAccount(user, env) {
  // Email address alone is unverified; Google owner privileges remain unchanged.
  return Boolean(user && user.provider === 'google' && isOwnerEmail(user.email, env));
}"""
OLD_STATUS = """    if (pathname === '/api/auth/email/status') {
      return json({ configured: false });
    }"""
NEW_STATUS = """    if (pathname === '/api/auth/email/status' && request.method === 'GET') {
      return json({ supported: true, configured: await emailStorageReady(env) });
    }
    if ((pathname === '/api/auth/email/register' || pathname === '/api/auth/email/login') &&
        request.method === 'POST') {
      const kind = pathname.endsWith('/register') ? 'register' : 'login';
      const result = await performEmailAuth(request, env, kind);
      if (result.error) return json({ error: result.error }, result.status);
      const user = result.user;
      edgeUsers.set(user.id, user);
      const token = await signJwt({
        sub: user.id, email: user.email, name: user.name || '', provider: 'email',
        plan: user.plan, plan_limit: user.plan_limit,
        subscription_status: user.subscription_status
      }, env);
      return json({ token, user: buildPublicUser(user, env), newAccount: result.newAccount }, result.status);
    }"""

def verify_email_worker_only(live_bytes: bytes, candidate_bytes: bytes) -> None:
    """Raise ValueError unless the candidate is exactly the canonical Worker plus Email changes."""
    try:
        old=live_bytes.decode("utf-8")
        new=candidate_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("Worker must be UTF-8") from exc
    restored=once(new,NEW_IMPORT,"","Email import")
    restored=once(restored,NEW_OWNER,"","Email owner guard")
    restored=once(restored,NEW_STATUS,OLD_STATUS,"Email-only endpoints")
    replacements=(
        ("isVerifiedOwnerAccount(u, env)","isOwnerEmail(u.email, env)"),
        ("isVerifiedOwnerAccount(user, env)","isOwnerEmail(user.email, env)"),
        ("isVerifiedOwnerAccount(user,env)","isOwnerEmail(user.email,env)"),
    )
    for left,right in replacements:
        if left in restored:
            restored=restored.replace(left,right)
    if restored!=old:
        raise ValueError("Worker candidate changes code beyond exact authorized Email scope")
    google_begin="    if (pathname === '/api/auth/google' && request.method === 'POST') {"
    google_end="    if (pathname === '/api/me' && request.method === 'GET') {"
    old_google=old.split(google_begin,1)[-1].split(google_end,1)[0]
    new_google=new.split(google_begin,1)[-1].split(google_end,1)[0]
    if old_google!=new_google:
        raise ValueError("Existing Google authentication route must remain byte-identical")
