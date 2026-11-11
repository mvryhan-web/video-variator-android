# JARVIX NEW — Trusted Windows signing (2026-11-11)

This document distinguishes product branding from a **verified publisher identity**.

## Already prepared in `jarvis-new`
- `scripts/build_jarvix_new_icons.py` takes the exact owner-approved original
  PNG from `jarvix-approved-orb.js` and creates native PNG/ICO/ICNS files.
  It refuses altered/different-size source files instead of replacing the icon
  with AI artwork. Windows and Mac build steps require this verified source.
- The Windows installer and `JARVIX_NEW.exe` use the original orb icon,
  descriptive Windows version metadata, and the existing DEEPSYQ product brand.
- `.github/workflows/jarvis-new-installers.yml` includes two separate
  Microsoft Artifact Signing steps (app executable, then installer) and
  `Get-AuthenticodeSignature` verification after each.
- **Publication is disabled unless genuine trusted signing is enabled.**
  No self-signed test certificates or invented publishers can pass this gate.
- Existing GitHub releases from before this change remain **unsigned**. They
  are not retroactively signed. Do not disable SmartScreen to install them.

## Prerequisite: verified legal identity, not an invented certificate
To acquire a *publicly trusted* certificate, the account owner must personally
pass an identity check at Microsoft / a recognized code-signing CA. No script
can produce a trusted public CA-issued publisher identity on its own.

The current Microsoft Artifact Signing service accepts organizations in the EU.
Its public-trust **individual** enrollment is currently limited to USA/Canada;
an individual developer living in France may instead need an eligible legal
business entity or a traditional CA that serves individual developers.
Azure Artifact Signing requires a **paid** Azure subscription, not a trial
or free subscription. The service starts at about USD 9.99/month.

After verification, set up in GitHub repository Actions variables:
- `JARVIX_NEW_TRUSTED_SIGNING_ENABLED` = `true`
- `JARVIX_SIGNING_ENDPOINT` = provider-given endpoint
  (for a West Europe account, typically `https://weu.codesigning.azure.net`)
- `JARVIX_SIGNING_ACCOUNT_NAME` = validated account
- `JARVIX_SIGNING_CERT_PROFILE_NAME` = Public Trust certificate profile

Store only in GitHub Actions *Secrets*, never in the repository or this chat:
- `JARVIX_SIGNING_TENANT_ID`
- `JARVIX_SIGNING_CLIENT_ID`
- `JARVIX_SIGNING_CLIENT_SECRET`

The identity must have the certificate-profile signing role; check Azure IAM.
Rotate/revoke these credentials according to organization policy.

The workflow is configured for the official `azure/trusted-signing-action@v0`.
After successful signing, `Get-AuthenticodeSignature` must report `Valid`
for both `JARVIX_NEW.exe` and `Jarvix-New-Windows-Setup.exe`.
Only then is a Windows installer eligible for the GitHub pre-release stage.

**SmartScreen:** A correctly signed, newly published file may still show
a reputation warning until Microsoft sees enough clean downloads.
Do not claim a guaranteed SmartScreen bypass.

**Mac:** Separate Apple Developer ID code signing and notarization are needed
for ordinary trust on macOS. Windows Artifact Signing does NOT sign macOS.

## Verification on Windows after a valid signed release
```powershell
Get-AuthenticodeSignature "$env:USERPROFILE\Downloads\Jarvix-New-Windows-Setup.exe" |
  Format-List Status,StatusMessage,SignerCertificate
```

Microsoft official reference:
- https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation
- https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart
- https://learn.microsoft.com/en-us/azure/artifact-signing/how-to-signing-integrations
