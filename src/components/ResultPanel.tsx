import { AlertTriangle, CheckCircle2, Copy, ShieldCheck } from 'lucide-react'
import { formatNumber } from '../lib/persian'
import type { CalculationResponse } from '../types'

function prettyKey(key: string) {
  const labels: Record<string, string> = {
    volume_m3: 'حجم', normal_exhaust_cfm: 'دبی تهویه عادی', fire_exhaust_cfm: 'دبی تخلیه حریق', design_exhaust_cfm: 'دبی طراحی', makeup_air_cfm: 'هوای جبرانی', exhaust_shaft_area_m2: 'سطح شفت تخلیه', makeup_shaft_area_m2: 'سطح شفت جبرانی', exhaust_damper_area_m2: 'سطح دمپر دود', two_fan_50pct_each_cfm: 'ظرفیت هر فن در آرایش 2×50%', friction_head_m: 'افت هد اصطکاکی', pressure_loss_kpa: 'افت فشار', base_head_m: 'هد پایه', design_head_m: 'هد طراحی', hydraulic_power_kw: 'توان هیدرولیکی', estimated_shaft_power_kw: 'توان محور تخمینی', active_sprinklers: 'تعداد اسپرینکلر فعال', discharge_per_sprinkler_lpm: 'دبی هر اسپرینکلر', minimum_pressure_at_k_bar: 'حداقل فشار K', sprinkler_flow_lpm: 'دبی اسپرینکلرها', total_with_hose_lpm: 'دبی کل با Hose Allowance', theoretical_storage_m3: 'ذخیره نظری', velocity_mps: 'سرعت هوا', area_m2: 'مساحت مقطع', hydraulic_diameter_m: 'قطر هیدرولیکی', raw_capacity_ah: 'ظرفیت خام باتری', design_capacity_ah: 'ظرفیت طراحی باتری', voltage_drop_v: 'افت ولتاژ', voltage_drop_percent: 'درصد افت ولتاژ', end_voltage_v: 'ولتاژ انتهای خط', npsha_m: 'NPSHa', estimated_detectors: 'تعداد تقریبی دتکتور', legacy_guide_area_per_device_m2: 'پوشش مرجع قدیمی هر تجهیز'
  }
  return labels[key] || key.replaceAll('_', ' ')
}

export default function ResultPanel({ data }: { data: CalculationResponse | null }) {
  if (!data) return (
    <div className="empty-result">
      <ShieldCheck size={28} />
      <strong>خروجی مهندسی اینجا نمایش داده می‌شود</strong>
      <span>مقادیر ورودی را تکمیل و محاسبه را اجرا کنید.</span>
    </div>
  )

  const c = data.calculation
  const warnings = c.warnings || []
  return (
    <div className="result-panel">
      <div className="result-panel__head">
        <div>
          <span className="eyebrow">ENGINE OUTPUT</span>
          <h3>خروجی محاسبات</h3>
        </div>
        <div className="result-panel__meta">
          <span>Engine {data.engine_version}</span>
          <button className="icon-button" onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))} title="کپی JSON"><Copy size={16}/></button>
        </div>
      </div>

      <div className="result-grid">
        {Object.entries(c.results).map(([key, value]) => (
          <div className="result-cell" key={key}>
            <span>{prettyKey(key)}</span>
            <strong>{typeof value === 'number' ? formatNumber(value, 4) : String(value)}</strong>
          </div>
        ))}
      </div>

      {warnings.length > 0 ? (
        <div className="warning-stack">
          {warnings.map((w, i) => <div className="warning-item" key={i}><AlertTriangle size={17}/><span>{w}</span></div>)}
        </div>
      ) : (
        <div className="ok-banner"><CheckCircle2 size={17}/> محاسبه بدون هشدار داخلی موتور انجام شد؛ کنترل نهایی استاندارد/AHJ همچنان الزامی است.</div>
      )}

      {c.trace && c.trace.length > 0 && (
        <details className="trace-box">
          <summary>ردیابی فرمول و منطق محاسبه</summary>
          <ol>{c.trace.map((t, i) => <li key={i}><code>{t}</code></li>)}</ol>
        </details>
      )}
      {c.source_profile && <div className="source-note">مبنای ثبت‌شده: {c.source_profile}</div>}
      <div className="hash-line">Calculation hash: <code>{data.input_hash.slice(0, 20)}…</code></div>
    </div>
  )
}
