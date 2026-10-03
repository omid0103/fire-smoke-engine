import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const demo = await readFile('src/pages/DemoPage.tsx','utf8')
const app = await readFile('src/App.tsx','utf8')
let checks = 0

function has(text, needle, message) { assert.ok(text.includes(needle), message); checks++ }
function lacks(text, needle, message) { assert.ok(!text.includes(needle), message); checks++ }

has(app, 'path="/demo" element={<DemoPage/>}', 'public demo route is missing')
has(demo, 'noindex,nofollow,noarchive', 'demo must stay out of search indexes')
has(demo, 'بدون اتصال به داده‌های واقعی', 'demo isolation disclosure is missing')
has(demo, 'خروجی رسمی', 'demo must disclose that official outputs are disabled')
has(demo, 'DEMO-NOT-PERSISTED', 'demo report must be visibly non-persisted')
has(demo, 'ذخیره Run در نسخه کامل', 'persistence must remain disabled in demo')
lacks(demo, "from '../lib/supabase'", 'demo must not import Supabase')
lacks(demo, 'supabase.', 'demo must not query production data')
lacks(demo, 'fetch(', 'demo must not call remote APIs')
lacks(demo, 'localStorage', 'demo must not persist customer-entered values')
lacks(demo, 'sessionStorage', 'demo must not persist customer-entered values')

console.log(`${checks} demo-isolation assertions passed`)
