import { Webhook } from 'npm:standardwebhooks@1.0.0'

// Only Supabase Auth's signed webhook may call this endpoint. Never log request,
// OTP, phone, provider payload or secrets. Auth owns OTP expiry and single use.
Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  const fail = (message: string, status: number) => json({ error: { http_code: status, message } }, status)

  if (req.method !== 'POST') return fail('POST required', 405)

  const secret = Deno.env.get('SEND_SMS_HOOK_SECRET')
  const token = Deno.env.get('AMOOT_SMS_TOKEN')?.trim()
  if (!secret || !token) return fail('SMS provider is not configured', 503)

  let payload: { user?: { phone?: string }; sms?: { otp?: string } }
  try {
    const body = await req.text()
    if (body.length > 100000) return fail('Payload too large', 413)
    const signingSecret = secret.replace(/^v1,whsec_/, '')
    payload = new Webhook(signingSecret).verify(body, Object.fromEntries(req.headers)) as typeof payload
  } catch {
    return fail('Invalid hook signature', 401)
  }

  const phone = payload.user?.phone?.replace(/^\+/, '')
  const otp = payload.sms?.otp
  if (!phone || !/^989\d{9}$/.test(phone) || !otp || !/^\d{4,8}$/.test(otp)) {
    return fail('Invalid SMS payload', 400)
  }

  try {
    // Amoot QuickOTP accepts a caller-supplied OTP via OptionalCode. This avoids
    // coupling Supabase Auth delivery to a numeric PatternCodeID while keeping
    // Supabase as the authority for OTP expiry and verification.
    const response = await fetch('https://portal.amootsms.com/rest/SendQuickOTP', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        Mobile: phone.slice(2),
        CodeLength: String(otp.length),
        OptionalCode: otp,
      }),
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.error(JSON.stringify({ event: 'sms_delivery', stage: 'http', status: response.status }))
      return fail('SMS delivery request failed', 502)
    }

    let result: any
    try {
      result = await response.json()
    } catch {
      console.error(JSON.stringify({ event: 'sms_delivery', stage: 'invalid_json' }))
      return fail('Invalid SMS provider response', 502)
    }

    const rawStatus = result?.Status
    const itemStatus = Array.isArray(result?.Data) ? result.Data[0]?.Status : undefined
    const topLevelSuccess = rawStatus === 1 || rawStatus === '1' || rawStatus === 'Success' || rawStatus === true
    const itemFailure = typeof itemStatus === 'string' && /(invalid|error|fail|reject)/i.test(itemStatus)

    const safeTopStatus =
      typeof rawStatus === 'string' && /^[A-Za-z_]{1,64}$/.test(rawStatus)
        ? rawStatus
        : typeof rawStatus === 'number' && Number.isFinite(rawStatus)
          ? rawStatus
          : typeof rawStatus === 'boolean'
            ? rawStatus
            : 'Unknown'
    const safeItemStatus =
      typeof itemStatus === 'string' && /^[A-Za-z_]{1,64}$/.test(itemStatus) ? itemStatus : 'Unknown'

    if (!topLevelSuccess || itemFailure) {
      console.error(
        JSON.stringify({ event: 'sms_delivery', stage: 'provider', status: safeTopStatus, item_status: safeItemStatus }),
      )
      return fail('SMS provider rejected request', 502)
    }

    console.info(JSON.stringify({ event: 'sms_delivery', stage: 'accepted' }))
    return json({})
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'sms_delivery',
        stage: error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'network',
      }),
    )
    return fail('SMS provider unavailable', 502)
  }
})
