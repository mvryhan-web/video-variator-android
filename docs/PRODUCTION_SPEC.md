# Video Variator — Production Authentication & Deployment Specification

This document describes the production configuration required for Google Sign-In and Sign in with Apple. It is specification only. Do not activate or change the current application build until the production domain, credentials, and deployment environment are approved.

## 1. Production domain and HTTPS

- Production web/PWA traffic must use a verified HTTPS domain, for example `https://app.example.com`.
- Set `APP_URL` and `CORS_ORIGIN` to the exact production HTTPS origin.
- Keep HTTP-to-HTTPS redirect enabled in production.
- Keep HSTS, CSP, Referrer-Policy, X-Content-Type-Options, frame restrictions, and no-store API caching enabled.
- Do not place OAuth private keys, Stripe secrets, or database credentials in browser JavaScript, Android assets, or the Git repository.

## 2. Google production credentials

Create a production OAuth client in Google Cloud / Google Auth Platform with application type **Web application**.

Required production settings:

- Authorized JavaScript origin: the exact production HTTPS origin, for example `https://app.example.com`.
- Use a dedicated production Google client ID, separate from localhost/staging where practical.
- Store the production client ID as `GOOGLE_CLIENT_ID` in the server environment.
- The frontend may receive the public client ID from `/api/config`; no Google client secret is required in browser code for the current Google Identity Services ID-token flow.
- Keep server-side ID-token verification enabled and verify the expected audience and Google issuer.
- Complete Google OAuth/brand verification when required before public launch.
- Maintain a public privacy policy and application home page on the verified production domain.

## 3. Sign in with Apple production credentials

Configure Sign in with Apple in the Apple Developer account.

Required production settings:

- Enable Sign in with Apple for the related primary App ID.
- Create a dedicated **Services ID** for the web service.
- Associate the Services ID with the primary App ID.
- Register the production domain and exact HTTPS return URL.
- Example return URL: `https://app.example.com/auth/apple/callback`.
- Set the Services ID as `APPLE_CLIENT_ID`.
- Set the exact HTTPS return URL as `APPLE_REDIRECT_URI`.
- Create and securely store the Apple private key and related Team ID / Key ID if the production server later exchanges authorization codes or refresh tokens.
- Never embed the Apple private key or generated client secret in the PWA or Android package.
- Keep server-side Apple ID-token verification enabled against Apple public keys, expected issuer, and expected audience.

## 4. Current-version freeze rule

Production Google and Apple credentials must **not** be enabled in the current build simply by editing bundled assets. Activation happens only in the production hosting environment through server environment variables after the domain and provider consoles are configured.

The current application version may continue to display the sign-in UI, but production authentication is considered enabled only after all provider configuration, HTTPS hosting, environment variables, and end-to-end tests are complete.

## 5. Required production environment values

- `NODE_ENV=production`
- `APP_URL=https://<production-domain>`
- `CORS_ORIGIN=https://<production-domain>`
- `APP_JWT_SECRET=<strong-random-secret>`
- `GOOGLE_CLIENT_ID=<production-google-web-client-id>`
- `APPLE_CLIENT_ID=<production-apple-services-id>`
- `APPLE_REDIRECT_URI=https://<production-domain>/<apple-callback-path>`
- `DATABASE_URL=<production-postgresql-url>`
- `STRIPE_SECRET_KEY=<production-stripe-secret>`
- `STRIPE_WEBHOOK_SECRET=<production-webhook-secret>`
- `STRIPE_PRICE_BASIC=<production-price-id>`
- `STRIPE_PRICE_PRO=<production-price-id>`
- `STRIPE_PRICE_BUSINESS=<production-price-id>`

## 6. Acceptance tests before activation

- Google sign-in works on supported desktop and mobile browsers from the production HTTPS origin.
- Apple sign-in returns only to the exact registered HTTPS return URL.
- Invalid or wrong-audience identity tokens are rejected by the server.
- Sign-in failure produces a clear user-facing error and does not create a partial account.
- Session tokens are not written into logs.
- Logout removes the local app session.
- CORS rejects unapproved origins.
- HTTPS redirect and HSTS are active in production.
- Billing and raw video files remain separate from authentication data.

## 7. Mobile authentication note

For production Android and iOS distribution, provider-specific native authentication or a secure system-browser flow should be used where a provider does not support embedded WebView authentication. The PWA browser flow remains available over HTTPS.