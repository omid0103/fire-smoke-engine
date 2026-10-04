export type EngineeringDesignInput = {
  schema_version: 1
  general: {
    occupancy_classification?: string | null
    mixed_occupancy?: boolean
    construction_type?: string | null
    structural_system?: string | null
    high_rise?: boolean
    fire_department_ahj?: string | null
    special_use_notes?: string | null
  }
  systems: {
    fire_alarm_required?: boolean
    sprinkler_required?: boolean
    standpipe_required?: boolean
    fire_pump_required?: boolean
    smoke_control_required?: boolean
    stair_pressurization_required?: boolean
    clean_agent_required?: boolean
    kitchen_hood_required?: boolean
  }
  geometry: {
    unit_count?: number | null
    bedroom_count?: number | null
    storage_count?: number | null
    stair_count?: number | null
    elevator_count?: number | null
    building_height_m?: number | null
    typical_floor_height_m?: number | null
    gross_built_area_m2?: number | null
    footprint_area_m2?: number | null
    largest_floor_area_m2?: number | null
    unit_areas_m2?: number[]
    floor_areas_m2?: number[]
    parking_levels?: number | null
    parking_area_m2?: number | null
    parking_spaces?: number | null
    basement_use?: string | null
    atrium_area_m2?: number | null
    atrium_height_m?: number | null
    occupied_roof?: boolean
  }
  life_safety: {
    occupant_load_total?: number | null
    max_floor_occupant_load?: number | null
    exit_count?: number | null
    stair_clear_width_m?: number | null
    max_travel_distance_m?: number | null
    common_path_m?: number | null
    dead_end_m?: number | null
    fire_compartment_count?: number | null
    fire_barrier_rating_min?: number | null
    stair_enclosure_rating_min?: number | null
    refuge_area_m2?: number | null
  }
  alarm: {
    system_type?: string | null
    design_floor_area_m2?: number | null
    ceiling_height_m?: number | null
    ceiling_type?: string | null
    ceiling_slope_deg?: number | null
    environmental_condition?: string | null
    default_detector_type?: string | null
    alarm_zones_count?: number | null
    loops_count?: number | null
    panel_voltage_v?: number | null
    standby_current_a?: number | null
    standby_hours?: number | null
    alarm_current_a?: number | null
    alarm_hours?: number | null
    battery_margin_percent?: number | null
    longest_circuit_m?: number | null
    circuit_current_a?: number | null
    cable_area_mm2?: number | null
    conductor_material?: string | null
    conductor_resistivity_ohm_mm2_m?: number | null
    ambient_noise_db?: number | null
    interfaces?: string | null
  }
  suppression: {
    sprinkler_system_type?: string | null
    hazard_class?: string | null
    hazard_description?: string | null
    design_density_lpm_m2?: number | null
    hydraulic_design_area_m2?: number | null
    sprinkler_coverage_m2?: number | null
    k_factor_metric?: number | null
    hose_allowance_lpm?: number | null
    duration_min?: number | null
    active_sprinklers?: number | null
    design_temperature_c?: number | null
    storage_commodity?: string | null
    storage_height_m?: number | null
    ceiling_clearance_m?: number | null
    standpipe_class?: string | null
    hose_valves_count?: number | null
    highest_outlet_elevation_m?: number | null
    required_fire_flow_lpm?: number | null
    required_residual_pressure_bar?: number | null
    estimated_friction_head_m?: number | null
    pump_safety_percent?: number | null
    pump_efficiency_percent?: number | null
    pipe_material?: string | null
    hazen_c?: number | null
  }
  water_supply: {
    source_type?: string | null
    static_pressure_bar?: number | null
    residual_pressure_bar?: number | null
    test_flow_lpm?: number | null
    tank_usable_volume_m3?: number | null
    tank_elevation_m?: number | null
    atmospheric_pressure_kpa?: number | null
    vapor_pressure_kpa?: number | null
    water_density_kg_m3?: number | null
    suction_static_head_m?: number | null
    suction_loss_m?: number | null
  }
  smoke: {
    systems_basis?: string | null
    fire_scenario?: string | null
    parking_zone_areas_m2?: number[]
    parking_clear_heights_m?: number[]
    normal_ach?: number | null
    fire_ach?: number | null
    makeup_percent?: number | null
    shaft_velocity_mps?: number | null
    damper_velocity_mps?: number | null
    design_exhaust_cfm?: number | null
    duct_width_mm?: number | null
    duct_height_mm?: number | null
    fan_temperature_rating_c?: number | null
    fan_rating_min?: number | null
    redundancy_required?: boolean
    stair_design_pressure_pa?: number | null
    stair_doors_open_count?: number | null
    stair_door_width_m?: number | null
    stair_door_height_m?: number | null
    stair_leakage_area_m2?: number | null
    stair_shaft_height_m?: number | null
    stair_discharge_coefficient?: number | null
    stair_air_density_kg_m3?: number | null
    stair_open_door_velocity_mps?: number | null
    stair_margin_percent?: number | null
    stair_handle_arm_m?: number | null
    stair_closer_force_n?: number | null
    atrium_design_fire_kw?: number | null
    atrium_convective_fraction?: number | null
    atrium_heat_fraction?: number | null
    target_smoke_layer_height_m?: number | null
    plume_height_m?: number | null
    exhaust_temperature_c?: number | null
    ambient_temperature_c?: number | null
    ambient_pressure_pa?: number | null
  }
  special_hazards: {
    clean_agent_room_volume_m3?: number | null
    clean_agent_type?: string | null
    clean_agent_design_concentration_percent?: number | null
    clean_agent_hold_time_min?: number | null
    kitchen_hood_count?: number | null
    generator_room_area_m2?: number | null
    electrical_room_area_m2?: number | null
    ev_charging_spaces?: number | null
    special_hazard_notes?: string | null
  }
  standards: {
    iran_mabhas3_edition?: string | null
    local_fire_department_basis?: string | null
    nfpa13_edition?: string | null
    nfpa14_edition?: string | null
    nfpa20_edition?: string | null
    nfpa72_edition?: string | null
    nfpa92_edition?: string | null
    ibc_ifc_edition?: string | null
    en12101_basis?: string | null
    design_notes?: string | null
  }
}

export type ProjectSystemKey = 'fire_alarm' | 'sprinkler' | 'standpipe' | 'fire_pump' | 'smoke_control' | 'stair_pressurization' | 'clean_agent' | 'kitchen_hood'
export type RequirementStatus = 'required' | 'review' | 'recommended' | 'not_indicated'
export type ReadinessStatus = 'ready' | 'partial' | 'blocked'

export type RequirementDecision = {
  key: ProjectSystemKey
  label: string
  status: RequirementStatus
  confidence: 'explicit' | 'screening'
  reasons: string[]
  standards: string[]
}

export type ModuleReadiness = {
  module: 'alarm' | 'suppression' | 'smoke'
  label: string
  status: ReadinessStatus
  score: number
  missing: string[]
  available: string[]
  notes: string[]
}

export type ProjectRequirementAssessment = {
  engine_version: string
  generated_at: string
  scope_notice: string
  systems: RequirementDecision[]
  modules: {
    alarm: ModuleReadiness
    suppression: ModuleReadiness
    smoke: ModuleReadiness
  }
  global_missing: string[]
  standards_in_scope: string[]
  trace: string[]
}

export type AutoDesignTask = {
  id: string
  discipline: 'alarm' | 'suppression' | 'smoke'
  calculator: string
  label: string
  status: 'ready' | 'blocked'
  input: Record<string, unknown>
  missing: string[]
  note?: string
}

export type AutoDesignModulePlan = {
  key: 'alarm' | 'suppression' | 'smoke'
  label: string
  requirement_status: RequirementStatus
  readiness_score: number
  scope: string[]
  missing_inputs: string[]
  tasks: AutoDesignTask[]
}

export type PreliminaryDesignGeometry = {
  source: 'project-inputs' | 'inferred-rectangle'
  width_m: number
  length_m: number
  height_m: number
  levels: number
  smoke_zones: Array<{ name: string; area_m2: number; x_m: number; y_m: number; width_m: number; length_m: number }>
  exhaust_shaft?: { x_m: number; y_m: number; width_m: number; length_m: number }
  makeup_shaft?: { x_m: number; y_m: number; width_m: number; length_m: number }
}

export type AutoDesignPlan = {
  engine_version: string
  generated_at: string
  project_id: string
  project_name: string
  scope_notice: string
  modules: AutoDesignModulePlan[]
  tasks: AutoDesignTask[]
  ready_task_count: number
  blocked_task_count: number
  global_missing: string[]
  standards_in_scope: string[]
  geometry: PreliminaryDesignGeometry
  handoff: {
    dxf_available: boolean
    bim_json_available: boolean
    native_rvt_available: false
    note: string
  }
}

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
  project_data: (Record<string, unknown> & {
    design_input_v1?: EngineeringDesignInput
    requirements_assessment_v1?: ProjectRequirementAssessment
    auto_design_plan_v1?: AutoDesignPlan
  }) | null
  status: 'draft' | 'active' | 'review' | 'approved' | 'archived'
  created_at: string
  updated_at: string
}

export type CalculationResponse = {
  persistence?: { saved: boolean; message: string; run_id?: string }
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
  server_generated?: boolean
  calculator_key?: string | null
  id: string
  project_id: string
  module_key: string
  engine_version: string
  status: string
  input_json: Record<string, unknown>
  result_json: Record<string, unknown>
  warnings: string[]
  calculation_trace: string[]
  standards_snapshot?: { source_profile?: string | null }[]
  calculation_hash: string | null
  created_at: string
}
