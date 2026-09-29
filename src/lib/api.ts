import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { CalculationResponse, Project } from '../types'

export async function calculate(module: string, input: Record<string, unknown>, project?: Project | null) {
  const { data, error } = await supabase.functions.invoke<CalculationResponse>('calculate', { body: { module, input, ...(project ? { project_id: project.id } : {}) } })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null)
      throw new Error(payload?.error || error.message)
    }
    throw error
  }
  if (!data?.ok) throw new Error('محاسبه از سمت موتور مهندسی تکمیل نشد.')

  return data
}
