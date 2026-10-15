import { readFile, writeFile, unlink } from 'node:fs/promises'
import ts from 'typescript'
import assert from 'node:assert/strict'

const temp = [
  'tests/.e2e-projectDesign.mjs',
  'tests/.e2e-projectRules.mjs',
  'tests/.e2e-autoDesign.mjs',
  'tests/.e2e-network.mjs',
  'tests/.e2e-engine.mjs',
]

async function transpile(source, target, replacements = []) {
  let text = await readFile(source, 'utf8')
  for (const [from, to] of replacements) text = text.replaceAll(from, to)
  text = text.replace('import "jsr:@supabase/functions-js/edge-runtime.d.ts";', '')
  text = text.replace('Deno.serve(handler);', '')
  const js = ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText
  await writeFile(target, js)
}

try {
  await transpile('src/lib/projectDesign.ts', temp[0])
  await transpile('src/lib/projectRules.ts', temp[1], [
    ["'./projectDesign'", "'./.e2e-projectDesign.mjs'"],
  ])
  await transpile('src/lib/autoDesign.ts', temp[2], [
    ["'./projectDesign'", "'./.e2e-projectDesign.mjs'"],
    ["'./projectRules'", "'./.e2e-projectRules.mjs'"],
  ])
  await transpile('supabase/functions/calculate/network.ts', temp[3])
  await transpile('supabase/functions/calculate/index.ts', temp[4], [
    ['"./network.ts"', '"./.e2e-network.mjs"'],
  ])

  const { generateAutoDesignPlan, generateAutoDesignDxf, generateBimHandoff } = await import('./.e2e-autoDesign.mjs')
  const { handler } = await import('./.e2e-engine.mjs')

  // Production acceptance case based on a real two-basement parking project:
  // B1=832 m², B2=850 m², clear height=3 m, 60% makeup air.
  // Standards/AHJ-specific values are explicit project inputs; no hidden defaults are asserted.
  const project = {
    id: 'e2e-qazvin-parking-001',
    organization_id: 'e2e-org',
    erp_project_id: null,
    project_code: 'PRD-E2E-PARKING',
    name: 'Parking Smoke Control — Production Acceptance',
    client_name: 'Production Readiness Case',
    building_use: 'پارکینگ زیرزمینی',
    address_text: 'قزوین',
    city: 'قزوین',
    floors_above: 0,
    floors_below: 2,
    total_area_m2: 1682,
    status: 'active',
    created_at: '2026-10-15T00:00:00.000Z',
    updated_at: '2026-10-15T00:00:00.000Z',
    project_data: {
      design_input_v1: {
        schema_version: 1,
        general: {
          occupancy_classification: 'Parking',
          mixed_occupancy: false,
          high_rise: false,
          fire_department_ahj: 'سازمان آتش‌نشانی و خدمات ایمنی قزوین',
        },
        systems: {
          fire_alarm_required: false,
          sprinkler_required: false,
          standpipe_required: false,
          fire_pump_required: false,
          smoke_control_required: true,
          stair_pressurization_required: false,
          clean_agent_required: false,
          kitchen_hood_required: false,
        },
        geometry: {
          unit_count: 0,
          bedroom_count: 0,
          storage_count: 0,
          stair_count: 1,
          elevator_count: 0,
          building_height_m: 6,
          typical_floor_height_m: 3,
          gross_built_area_m2: 1682,
          footprint_area_m2: 850,
          largest_floor_area_m2: 850,
          floor_areas_m2: [832, 850],
          unit_areas_m2: [],
          parking_levels: 2,
          parking_area_m2: 1682,
          parking_spaces: 0,
          basement_use: 'پارکینگ',
          occupied_roof: false,
        },
        life_safety: {},
        alarm: {},
        suppression: {},
        water_supply: {},
        smoke: {
          systems_basis: 'Mechanical smoke exhaust with makeup air',
          fire_scenario: 'single_zone',
          parking_zone_areas_m2: [832, 850],
          parking_clear_heights_m: [3, 3],
          normal_ach: 6,
          fire_ach: 10,
          makeup_percent: 60,
          shaft_velocity_mps: 10,
          damper_velocity_mps: 5,
          design_exhaust_cfm: 18500,
          duct_width_mm: 1000,
          duct_height_mm: 500,
          min_extract_spacing_m: 3,
          min_route_clearance_m: 0.1,
        },
        special_hazards: {},
        standards: {
          local_fire_department_basis: 'AHJ project basis',
          en12101_basis: 'Project-adopted smoke-control basis',
          design_notes: 'Acceptance case; final design remains subject to adopted code/AHJ review.',
        },
      },
    },
  }

  const plan = generateAutoDesignPlan(project, '2026-10-15T00:00:00.000Z')
  assert.equal(plan.project_id, project.id)
  assert.equal(plan.modules.find(m => m.key === 'smoke')?.requirement_status, 'required')
  const parkingTask = plan.tasks.find(t => t.id === 'smoke-parking')
  assert.ok(parkingTask, 'parking smoke task must exist')
  assert.equal(parkingTask.status, 'ready')
  assert.deepEqual(parkingTask.input.zones.map(z => z.area_m2), [832, 850])
  assert.equal(parkingTask.input.makeup_percent, 60)

  const response = await handler(new Request('https://acceptance.test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ module: parkingTask.calculator, input: parkingTask.input }),
  }))
  assert.equal(response.status, 200, await response.clone().text())
  const payload = await response.json()
  assert.equal(payload.ok, true)
  assert.equal(payload.calculation.results.zone_count, 2)
  assert.equal(payload.calculation.results.sum_normal_exhaust_cfm, 18500)
  assert.equal(payload.calculation.results.max_single_zone_fire_cfm, 15500)
  assert.equal(payload.calculation.results.design_exhaust_cfm, 18500)
  assert.equal(payload.calculation.results.makeup_air_cfm, 11100)
  assert.equal(payload.calculation.status, 'warning')
  assert.ok(payload.calculation.warnings.some(w => w.includes('سناریوی یک زون')))

  const dxf = generateAutoDesignDxf(plan)
  assert.ok(dxf.includes('$INSUNITS'))
  assert.ok(dxf.includes('SMOKE_ZONE'))
  assert.ok(dxf.includes('EXHAUST_SHAFT'))
  assert.ok(dxf.includes('MAKEUP_SHAFT'))

  const bim = generateBimHandoff(plan, project)
  assert.equal(bim.project.id, project.id)
  assert.equal(bim.levels.length, 3)
  assert.equal(bim.levels[0].name, 'B2')
  assert.equal(bim.levels[1].name, 'B1')
  assert.equal(bim.levels[2].name, 'Ground')
  assert.equal(bim.systems.find(s => s.discipline === 'smoke')?.requirement_status, 'required')

  console.log(JSON.stringify({
    result: 'PASS',
    case: 'real two-basement parking smoke-control acceptance',
    project_area_m2: project.total_area_m2,
    zones_m2: [832, 850],
    design_exhaust_cfm: payload.calculation.results.design_exhaust_cfm,
    makeup_air_cfm: payload.calculation.results.makeup_air_cfm,
    auto_design_engine: plan.engine_version,
    calculator_engine: payload.engine_version,
    dxf: true,
    bim_handoff: true,
  }))
} finally {
  for (const file of temp) await unlink(file).catch(() => {})
}
