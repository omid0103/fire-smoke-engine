export type Project = {
  id: string
  organization_id: string
  erp_project_id: string | null
  project_code: string | null
  name: string
  client_name: string | null
  building_use: string | null
  address_text: string | null
  city: string | null
  floors_above: number | null
  floors_below: number | null
  total_area_m2: number | null
  status: 'draft' | 'active' | 'review' | 'approved' | 'archived'
  created_at: string
  updated_at: string
}

export type CalculationResponse = {
  ok: boolean
  module: string
  engine_version: string
  input_hash: string
  calculation: {
    status: 'calculated' | 'warning' | 'failed'
    inputs?: Record<string, unknown>
    results: Record<string, unknown>
    warnings?: string[]
    trace?: string[]
    source_profile?: string
    zones?: unknown[]
  }
}

export type StandardSource = {
  id: string
  code: string
  title: string
  edition: string | null
  jurisdiction: string | null
  authority: string | null
  source_kind: string
  verification_status: 'catalogued' | 'verified' | 'superseded' | 'needs_review'
  notes: string | null
}

export type DesignRun = {
  id: string
  project_id: string
  module_key: string
  engine_version: string
  status: string
  input_json: Record<string, unknown>
  result_json: Record<string, unknown>
  warnings: string[]
  calculation_trace: string[]
  calculation_hash: string | null
  created_at: string
}
