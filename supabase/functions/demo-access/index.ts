import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const ORIGIN = "https://engin.rabinazar.ir";
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomSecret(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`عدد باید بین ${min} و ${max} باشد.`);
  return n;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "POST required" }, 405);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!url || !serviceKey || !anonKey) return json({ ok: false, error: "Demo service unavailable" }, 503);

  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const publicClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const body = await req.json();
    const action = String(body?.action || "redeem");

    async function requireAdmin() {
      const authorization = req.headers.get("Authorization") || "";
      if (!authorization.startsWith("Bearer ")) throw new Error("ورود مدیریت لازم است.");
      const token = authorization.slice(7);
      const { data: authData, error: authError } = await service.auth.getUser(token);
      if (authError || !authData.user) throw new Error("نشست مدیریت معتبر نیست.");
      const { data: org } = await service.from("organizations").select("id").eq("slug", "rabin-azar-vira").maybeSingle();
      if (!org?.id) throw new Error("سازمان مدیریت یافت نشد.");
      const { data: member } = await service.from("organization_members").select("role").eq("organization_id", org.id).eq("user_id", authData.user.id).in("role", ["owner", "admin"]).maybeSingle();
      if (!member) throw new Error("دسترسی مدیریت دمو ندارید.");
      return authData.user;
    }

    if (action === "create") {
      const admin = await requireAdmin();
      const clientName = String(body?.client_name || "").trim();
      if (clientName.length < 2 || clientName.length > 120) throw new Error("نام مشتری معتبر نیست.");
      const validHours = clampInt(body?.valid_hours, 48, 1, 168);
      const maxRedemptions = clampInt(body?.max_redemptions, 3, 1, 20);
      const maxProjects = clampInt(body?.max_projects, 10, 1, 50);
      const maxRuns = clampInt(body?.max_runs, 60, 1, 500);
      const token = randomSecret(32);
      const tokenHash = await sha256(token);
      const expiresAt = new Date(Date.now() + validHours * 3600_000).toISOString();
      const { data, error } = await service.from("demo_access_links").insert({ token_hash: tokenHash, client_name: clientName, expires_at: expiresAt, max_redemptions: maxRedemptions, max_projects: maxProjects, max_runs: maxRuns, created_by: admin.id }).select("id,client_name,expires_at,max_redemptions,redemption_count,max_projects,max_runs,created_at").single();
      if (error) throw error;
      return json({ ok: true, link: { ...data, url: `${ORIGIN}/demo/${token}` } });
    }

    if (action === "list") {
      await requireAdmin();
      const { data, error } = await service.from("demo_access_links").select("id,client_name,expires_at,max_redemptions,redemption_count,max_projects,max_runs,revoked_at,created_at").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return json({ ok: true, links: data || [] });
    }

    if (action === "revoke") {
      await requireAdmin();
      const id = String(body?.id || "");
      if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("شناسه لینک نامعتبر است.");
      const { error } = await service.from("demo_access_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action !== "redeem") return json({ ok: false, error: "Unknown action" }, 400);
    const token = String(body?.token || "").trim();
    if (token.length < 30 || token.length > 200) return json({ ok: false, error: "لینک دمو نامعتبر است." }, 403);
    const tokenHash = await sha256(token);
    const { data: claims, error: claimError } = await service.rpc("claim_demo_link", { p_token_hash: tokenHash });
    if (claimError) throw claimError;
    const claim = Array.isArray(claims) ? claims[0] : claims;
    if (!claim?.link_id) return json({ ok: false, error: "لینک دمو منقضی، لغوشده یا به سقف استفاده رسیده است." }, 403);

    const userId = crypto.randomUUID();
    const email = `demo-${userId}@demo.rabinazar.invalid`;
    const password = `${randomSecret(34)}!9aA`;
    const orgId = crypto.randomUUID();
    let userCreated = false;

    try {
      const { data: created, error: createError } = await service.auth.admin.createUser({ id: userId, email, password, email_confirm: true, app_metadata: { demo: true, demo_client: claim.client_name, demo_expires_at: claim.expires_at, demo_link_id: claim.link_id } });
      if (createError || !created.user) throw createError || new Error("Demo user creation failed");
      userCreated = true;
      const slug = `demo-${userId.slice(0, 12)}`;
      const { error: orgError } = await service.from("organizations").insert({ id: orgId, name: `دمو — ${claim.client_name}`, slug, settings: { demo: true, expires_at: claim.expires_at, client_name: claim.client_name }, created_by: userId });
      if (orgError) throw orgError;
      const { error: memberError } = await service.from("organization_members").insert({ organization_id: orgId, user_id: userId, role: "engineer" });
      if (memberError) throw memberError;
      const { error: sessionError } = await service.from("demo_sessions").insert({ user_id: userId, link_id: claim.link_id, organization_id: orgId, expires_at: claim.expires_at, max_projects: claim.max_projects, max_runs: claim.max_runs });
      if (sessionError) throw sessionError;
      const seed = [
        { project_code: "DEMO-SMOKE-01", name: "پارکینگ تجاری نمونه", client_name: claim.client_name, building_use: "تجاری / پارکینگ", city: "نمونه", floors_above: 6, floors_below: 2, total_area_m2: 4200, status: "design", project_data: { demo: true, systems: ["smoke_control"] } },
        { project_code: "DEMO-FIRE-02", name: "ساختمان اداری نمونه", client_name: claim.client_name, building_use: "اداری", city: "نمونه", floors_above: 8, floors_below: 1, total_area_m2: 6100, status: "design", project_data: { demo: true, systems: ["suppression", "fire_alarm"] } },
        { project_code: "DEMO-RES-03", name: "مجتمع مسکونی نمونه", client_name: claim.client_name, building_use: "مسکونی", city: "نمونه", floors_above: 5, floors_below: 1, total_area_m2: 3900, status: "review", project_data: { demo: true, systems: ["fire_alarm", "pressurization"] } },
      ].map((p) => ({ ...p, id: crypto.randomUUID(), organization_id: orgId, created_by: userId }));
      const { error: seedError } = await service.from("engineering_projects").insert(seed);
      if (seedError) throw seedError;
      const { data: signIn, error: signInError } = await publicClient.auth.signInWithPassword({ email, password });
      if (signInError || !signIn.session) throw signInError || new Error("Demo session creation failed");
      const sampleRuns = [
        { module: "duct_velocity", input: { flow_cfm: 12000, width_mm: 1000, height_mm: 500 }, project_id: seed[0].id },
        { module: "fire_alarm_battery", input: { standby_current_a: 0.5, standby_hours: 24, alarm_current_a: 2, alarm_hours: 0.5, margin_percent: 25 }, project_id: seed[2].id },
      ];
      for (const sample of sampleRuns) {
        try { await fetch(`${url}/functions/v1/calculate`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${signIn.session.access_token}`, apikey: anonKey }, body: JSON.stringify(sample) }); } catch { /* non-critical */ }
      }
      return json({ ok: true, session: { access_token: signIn.session.access_token, refresh_token: signIn.session.refresh_token }, demo: { client_name: claim.client_name, expires_at: claim.expires_at, max_projects: claim.max_projects, max_runs: claim.max_runs } });
    } catch (error) {
      if (userCreated) { try { await service.auth.admin.deleteUser(userId); } catch { /* cleanup best effort */ } }
      try {
        const { data: current } = await service.from("demo_access_links").select("redemption_count").eq("id", claim.link_id).maybeSingle();
        const next = Math.max(0, Number(current?.redemption_count || 1) - 1);
        await service.from("demo_access_links").update({ redemption_count: next }).eq("id", claim.link_id);
      } catch { /* cleanup best effort */ }
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطای سرویس دمو";
    return json({ ok: false, error: message }, 400);
  }
});
