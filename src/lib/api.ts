import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { CalculationResponse, Project } from '../types'

const moduleMap: Record<string, string> = {
  atrium_axisymmetric: 'atrium_smoke',
  pressurization_single_zone: 'stair_pressurization',
  parking_smoke: 'parking_smoke',
  parking_smoke_group: 'parking_smoke',
  duct_velocity: 'parking_smoke',
  hazen_williams: 'sprinkler_hydraulics',
  sprinkler_preliminary: 'sprinkler_hydraulics',
  fire_pump: 'fire_pump',
  npsha: 'fire_pump',
  fire_alarm_preliminary: 'fire_alarm_detection',
  fire_alarm_battery: 'fire_alarm_power',
  voltage_drop: 'fire_alarm_power'
}

export async function calculate(module: string, input: Record<string, unknown>, project?: Project | null) {
  const { data, error } = await supabase.functions.invoke<CalculationResponse>('calculate', { body: { module, input } })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null)
      throw new Error(payload?.error || error.message)
    }
    throw error
  }
  if (!data?.ok) throw new Error('محاسبه از سمت موتور مهندسی تکمیل نشد.')

  if (project) {
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (user) {
      const c = data.calculation
      const { error: saveError } = await supabase.from('design_runs').insert({
        project_id: project.id,
        module_key: moduleMap[module] || module,
        engine_version: data.engine_version,
        status: c.status,
        input_json: input,
        result_json: { ...c.results, ...(c.zones ? { zones: c.zones } : {}) },
        warnings: c.warnings || [],
        standards_snapshot: [{ source_profile: c.source_profile || null }],
        calculation_trace: c.trace || [],
        calculation_hash: data.input_hash,
        created_by: user.id
      })
      data.persistence = saveError ? { saved: false, message: 'محاسبه انجام شد اما ذخیره نشد: ' + saveError.message } : { saved: true, message: 'محاسبه در پروژه ذخیره شد.' }
    } else data.persistence = { saved: false, message: 'نشست معتبر نیست؛ محاسبه ذخیره نشد.' }
  }
  return data
}
