import { readFile, writeFile, unlink } from 'node:fs/promises'
import ts from 'typescript'
import assert from 'node:assert/strict'

const src = await readFile('src/lib/validation.ts','utf8')
const js = ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
await writeFile('tests/.validation-test.mjs',js)
const { validationFor } = await import('./.validation-test.mjs')

let checks = 0
function expect(key, level, validated){
 const v = validationFor(key)
 assert.equal(v.level, level, key)
 assert.equal(v.validatedWithinScope, validated, key)
 checks += 2
}

expect('hydraulic_network','validated_kernel',true)
expect('airflow_network','validated_kernel',true)
expect('hazen_williams','validated_kernel',true)
expect('duct_velocity','validated_kernel',true)
expect('fire_alarm_battery','validated_kernel',true)
expect('voltage_drop','validated_kernel',true)
expect('npsha','validated_kernel',true)
expect('atrium_axisymmetric','validated_limited_model',true)
expect('pressurization_single_zone','validated_limited_model',true)
expect('parking_smoke_group','project_basis_required',false)
expect('fire_pump','preliminary_only',false)
expect('sprinkler_preliminary','preliminary_only',false)
expect('fire_alarm_preliminary','legacy_reference_only',false)

for (const key of ['fire_alarm_preliminary','sprinkler_preliminary','fire_pump']) {
 const v = validationFor(key)
 assert.notEqual(v.tone,'ok',`${key} must never render as fully validated`)
 checks++
}

console.log(`${checks} validation-scope assertions passed`)
await unlink('tests/.validation-test.mjs')
