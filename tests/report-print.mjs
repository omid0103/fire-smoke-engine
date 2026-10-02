import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const page = await readFile('src/pages/ReportsPage.tsx', 'utf8')
const css = await readFile('src/styles.css', 'utf8')
let checks = 0

function has(text, needle, label) {
  assert.ok(text.includes(needle), label)
  checks++
}

for (const [needle, label] of [
  ['window.print()', 'print/PDF action'],
  ['Engine Version', 'engine version trace'],
  ['Hash', 'calculation hash'],
  ['سطح اعتبارسنجی مهندسی', 'engineering validation level'],
  ['ورودی‌ها', 'inputs section'],
  ['خروجی‌ها', 'results section'],
  ['هشدارهای مهندسی', 'engineering warnings'],
  ['منابع و دامنه مدل', 'model/source scope'],
  ['ردیابی محاسبه', 'calculation trace'],
  ['server_generated', 'server-generated provenance'],
  ['validation.limitations', 'declared validation limitations'],
]) has(page, needle, label)

for (const [needle, label] of [
  ['@media print', 'print stylesheet'],
  ['.report-sheet{', 'report sheet styling'],
  ['break-inside:avoid', 'page-break protection'],
  ['display:table-header-group', 'repeated network table header'],
  ['.report-sheet{padding:8mm}', 'A4-safe print padding'],
  ['background:white', 'white print background'],
]) has(css, needle, label)

console.log(`${checks} printable-report contract assertions passed`)
