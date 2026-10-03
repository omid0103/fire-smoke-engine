import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const demo = await readFile('src/pages/DemoPage.tsx','utf8')
const app = await readFile('src/App.tsx','utf8')
const shell = await readFile('src/components/AppShell.tsx','utf8')
const settings = await readFile('src/pages/SettingsPage.tsx','utf8')
const gateway = await readFile('supabase/functions/demo-access/index.ts','utf8')
let checks = 0

function has(text, needle, message) { assert.ok(text.includes(needle), message); checks++ }
function lacks(text, needle, message) { assert.ok(!text.includes(needle), message); checks++ }

has(app, 'path="/demo/:token" element={<DemoPage/>}', 'tokenized demo route is missing')
has(app, '<DemoRestrictedRoute><SubscriptionPage/></DemoRestrictedRoute>', 'billing route must be blocked for demo users')
has(app, '<DemoRestrictedRoute><SettingsPage/></DemoRestrictedRoute>', 'settings route must be blocked for demo users')
has(demo, 'noindex,nofollow,noarchive', 'demo entry must stay out of search indexes')
has(demo, "supabase.functions.invoke('demo-access'", 'demo link must redeem through the server gateway')
has(demo, 'supabase.auth.setSession', 'demo gateway session must become a real authenticated session')
has(shell, "to!=='/subscription'&&to!=='/settings'", 'sensitive navigation must be hidden in demo mode')
has(shell, 'نسخه دمو کامل', 'active demo workspace must be clearly labeled')
has(settings, "demoApi('create'", 'admin must be able to create customer demo links')
has(settings, "demoApi('revoke'", 'admin must be able to revoke customer demo links')
has(gateway, 'token_hash: tokenHash', 'plaintext demo token must not be stored')
has(gateway, 'auth.admin.createUser', 'demo redemption must create an isolated temporary auth user')
has(gateway, 'demo_sessions', 'demo redemption must register a server-enforced demo session')
has(gateway, 'organization_members', 'demo user must be bound to an isolated organization')
has(gateway, '/functions/v1/calculate', 'demo workspace should seed a real server calculation')
lacks(gateway, 'service_role`', 'service role must never be embedded as a literal credential')

console.log(`${checks} full-demo access assertions passed`)
