# Rabin Engineering — Flutter mobile source 0.1

Native Persian RTL client sharing the existing Supabase account, RLS, project data,
server calculation endpoint and subscription entitlement. Not a WebView wrapper.

## Status
Android test APK built successfully on 2026-10-01 using an isolated, read-only GitHub Actions runner with cloud metadata egress denied.
Build: https://github.com/omid0103/fire-smoke-engine/actions/runs/36908729586
Source commit: 4aad9384721b60bc9657ab07fc59a179919686d6.
All 3 Flutter tests passed. Analysis completed with no errors, one missing flutter_lints include warning and one deprecated anonKey info.
The APK is debug-signed for installation and testing, not a production release.
Real-device acceptance, production signing, iOS IPA signing, store approval and full release readiness remain pending.

Implemented in source:
- Email sign-in/sign-up and web email recovery; Iranian phone normalization and SMS OTP
  with resend cooldown. Existing SMS provider fault remains a server-side blocker.
- Session storage through flutter_secure_storage (Android Keystore / iOS Keychain).
- Create/edit projects, list/reopen last 100 server reports, user-triggered JSON copying.
- 13 calculation modules including multi-zone parking, ducts, pump, preliminary
  sprinkler sizing, Hazen-Williams, NPSH, atrium, pressure, alarm battery, voltage drop,
  preliminary detectors and editable hydraulic/airflow nodes/edges.
- Server validation/entitlement retained; reports show server warnings/trace/version.
- Existing subscription and historical orders visible. No mobile checkout, admin sales
  editor, store billing, PDF export or offline calculation in this initial release.
- Dates are explicitly Gregorian; Jalali formatting and final Persian typography pending.

## Prepare on a trusted Flutter development machine
Requires Flutter >=3.35 and Dart >=3.9. Dependencies are pinned directly in pubspec;
resolve and commit pubspec.lock after the first successful dependency resolution.

```
python prepare.py ../rabin-mobile-build
cd ../rabin-mobile-build
flutter pub get
flutter analyze
flutter test
flutter run
flutter build apk --debug
```

prepare.py creates Android and iOS native runners with the official Flutter generator,
copies these source files, enables Android internet access and disables Android backup
of app data. It refuses to overwrite any existing output directory. The Android
application ID is ir.rabinazar.rabin_engineering; review it before first distribution.

For Android release configure your own signing keystore in the generated runner,
then build AAB/APK. Never ship a release with a debug signing key. For iOS use macOS,
Xcode, a unique bundle identifier and your Apple signing team; review the current
flutter_secure_storage iOS Keychain entitlements instructions and test storage on-device.
Then build an archive with flutter build ipa. Developer/store fees are not purchased.

## Configuration and security
Only the existing public project URL/publishable key are embedded. Override with
--dart-define=SUPABASE_URL=... and --dart-define=SUPABASE_PUBLISHABLE_KEY=...
for staging. Never embed a service-role key, database password or signing keys.
Password recovery deliberately opens the deployed HTTPS web recovery flow; custom
mobile link ownership/allowlisting has not been provisioned. Do not print auth URLs.
No production data or subscription settings were changed by this source implementation.

## Acceptance before distribution
Resolve dependencies, analyze and run tests; test email signup/recovery, SMS delivery,
session expiry/sign-out, active/expired entitlements, cross-tenant access, create/edit,
calculate/save/reopen, poor-network errors, large font/RTL layouts, Android/iPhone
keyboard behavior and screen readers on real devices. Compare the submitted payloads
and saved outputs with the web app. A successful build alone does not validate fire
engineering methods. Existing web engineering/backup acceptance gates still apply.

Purchasing digital subscriptions inside store-distributed builds needs a separate,
current store-policy and billing implementation review. This source exposes existing
entitlements only and makes no App Store / Google Play approval claim.
