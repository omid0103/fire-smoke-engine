# Phone OTP activation

UI uses native Supabase signInWithOtp (shouldCreateUser=true) and verifyOtp(type=sms). Iranian mobile normalization supports Persian/Arabic digits, 09…, +989…, 989…, 00989…. Server owns code generation, expiry, verification, session and single use; never auto-confirm phones.

Deployment prerequisites:
1. AMOOT approved OTP pattern with exactly one placeholder (OTP). Service/pattern sending must work for the intended Iranian numbers.
2. In this Supabase project's Edge Function secrets, set AMOOT_SMS_TOKEN and AMOOT_OTP_PATTERN_ID. No VITE_ prefix, no secrets in source/client.
3. Configure Send SMS Auth Hook for the deployed send-sms function; copy the hook signing secret securely to SEND_SMS_HOOK_SECRET. Function verifies Standard Webhooks signature/time before sending. Deploy this signed webhook with verify_jwt=false; JWT gateway is not the webhook authenticator.
4. Enable Phone provider. Keep phone auto-confirm OFF. Configure OTP expiry (e.g. 120 seconds), length (6), resend interval (>=60 seconds), server SMS rate limits, and CAPTCHA appropriate to public signup. A client countdown is only UX, not abuse protection.
5. Confirm production phone settings and test actual delivery, invalid/expired/reused code rejection, new-account signup, existing-account login and project access isolation. Never put OTPs in logs or public responses.

Phone signup creates its own identity. Do not automatically merge by claimed email or grant existing organization membership. Users may need verified account linking or an authorized invitation.

Current activation status: provider observed disabled on 2026-09-27. Management dashboard sign-in and SMS secrets/pattern configuration are required. UI/code availability does not establish working SMS delivery.

References: https://supabase.com/docs/guides/auth/phone-login ; https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook ; https://github.com/AmootSoft/AmootSMS
