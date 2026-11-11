# JARVIX NEW — Microsoft Store release path

Purpose: give Windows users a trusted JARVIX install **without bypassing Defender
SmartScreen or asking them to install a self-signed certificate**.

## Why GitHub / Cloudflare / ZIP are not the answer
GitHub Actions can generate binary files and Cloudflare can host them, but
neither makes Microsoft trust an unknown publisher. Recompressing, renaming,
moving the .exe to another domain or putting it in a ZIP doesn't certify the
executable and can conceal a real security problem.

The **Store MSIX** path is different: after certification, Microsoft signs
the distributed package with its trusted Store identity. This removes normal
SmartScreen download reputation prompts for Store-installed applications.
The Store can still reject malware, policy violations or malfunctioning apps.

## State of our repo
- Branch: `jarvis-new` only. No production deployment.
- Windows PyInstaller + Inno Setup test apps remain **unsigned** and must not
  be presented as trusted downloads.
- Original owner JARVIX sphere already used in Windows binary and Mac app.
- `scripts/jarvix_new_store_package.py` prepares a *submission-only*
  MSIX with native Windows desktop `runFullTrust` identity.
- `.github/workflows/jarvis-new-store-msix.yml` is MANUAL ONLY, since
  it requires verified Microsoft Partner Center identity.
- The unsigned Store submission package is NOT a user-installable release.

## One manual owner registration step (free, as of Nov 2026)
1. Open https://storedeveloper.microsoft.com and choose Get started for free.
2. Select Individual *only if publishing in a personal/non-commercial
   capacity*. For a commercial DEEPSYQ product, use a legally applicable
   Company developer account. Both have a free new onboarding path, though
   identity verification is mandatory.
3. Verify identity with Microsoft; don't send identity documents to GitHub
   or a chat.
4. In Microsoft Partner Center, reserve the application name JARVIX NEW
   if available, and start an MSIX app entry.
5. In Partner Center's **Product identity**, note the exact `Package Identity
   Name`, `Publisher` DN, and verified display name. These strings must
   be real; we do not invent them. There can be a difference between public
   product name and package identity.
6. Trigger `JARVIX NEW - prepare Microsoft Store MSIX (review only)`
   from GitHub Actions on `jarvis-new` using the exact above values.
7. Inspect the resulting unsigned MSIX and run Windows App Certification
   Kit tests before submission. Pass Microsoft's content and security review.
8. Only after Microsoft approves, link the official Microsoft Store listing
   as Download JARVIX on the test site. Do not point users to the unsigned
   GitHub build.

## Alternative for a disputed malware detection
If Edge/Defender specifically marks the unsigned installer as malicious,
don't merely assume it's a reputation problem. A software developer can
submit the **actual binary** to:
https://www.microsoft.com/en-us/wdsi/filesubmission
Select Microsoft Defender SmartScreen (or correct Defender product) and
`Incorrectly detected as malware/malicious` only if supported by clean
independent analysis. Microsoft reviews suspicious files independently.
The particular blocked build is a test, not a complete VoiceOS assistant.

## Actual product gaps before publication
- Main app is currently an offline coordinator / photo compressor prototype.
- Full voice, physical-device testing and AI model generation are not verified.
- Online cross-device task sync is not completed.
- Store quality, privacy and security certification are not yet performed.

Do not misrepresent a prototype as a finished fully functional AI assistant.

References:
- https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation
- https://learn.microsoft.com/en-us/windows/apps/distribute-through-store/how-to-distribute-your-win32-app-through-microsoft-store
- https://learn.microsoft.com/en-us/windows/apps/publish/partner-center/open-a-developer-account
- https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-manual-conversion

## Existing Partner Center registration — received 2026-11-11

Microsoft Store has already reserved this product. Use exactly the identity
reported in Partner Center, not a generated or guessed DN:

- Package/Identity/Name: `Deepsyq.JarixbyDeepsyq`
- Package/Identity/Publisher: `CN=7B5BC7EE-DA65-44E2-8CAC-D02C7C2CA333`
- Package/Properties/PublisherDisplayName: `Deepsyq`
- PFN (as displayed by Partner Center): `Deepsyq.JarixbyDeepsyq_mxysa39f97fgr`
- Store product ID: `9NWK3FR3G9BG`

**IMPORTANT:** `Jarix` (without v) appears in the official package identity,
while the visible application brand is `JARVIX by DEEPSYQ`. The internal
package identity is deliberately preserved because changing it locally could
break Microsoft Store association. If the owner wants a different internal
package identity, it must first be changed/reserved in Partner Center.

An MSIX prepared from these three Partner Center values may be uploaded to
the already-reserved product under its package submission section. It is NOT
itself signed or safe for sideloading on the user's PC.

GitHub Actions for creating an MSIX are under:
`https://github.com/mvryhan-web/video-variator-android/actions/workflows/jarvis-new-store-msix.yml`

The artifact's inner file is `JARVIX_NEW-STORE-UNSIGNED.msix`.
After Microsoft approves the app it re-signs the MSIX for trusted Store
installation; Microsoft does NOT similarly re-sign raw EXE/MSI installer
submissions. Store sign-off is not evidence that the voice/AI product is ready.

For now **leave the Store listing in draft**. Check Windows functionality,
mic/voice, product content, App Certification Kit and privacy information
before submitting to public Store certification.
