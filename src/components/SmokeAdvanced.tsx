import { useEffect, useState, type FormEvent } from 'react'
import Field from './Field'
import ResultPanel from './ResultPanel'
import { calculate } from '../lib/api'
import type { CalculationResponse, Project } from '../types'
const models = {
 atrium_axisymmetric: { title:'آتریوم — ستون دود متقارن', fields:[['hrr_kw','توان حریق','kW','4000'],['convective_fraction','سهم جابجایی','0–1','0.7'],['layer_height_m','ارتفاع لایه از سطح آتش','m','12'],['ambient_c','دمای محیط','°C','30'],['pressure_pa','فشار مطلق محیط','Pa','101300'],['heat_fraction','سهم گرمای باقی‌مانده','0–1','1']] },
 pressurization_single_zone: { title:'فشار مثبت — مدل یک ناحیه', fields:[['pressure_pa','اختلاف فشار هدف','Pa','50'],['leakage_area_m2','سطح نشت معادل بسته','m²','0.1'],['discharge_coefficient','ضریب تخلیه','0–1','0.65'],['density_kg_m3','چگالی هوا','kg/m³','1.2'],['open_door_area_m2','سطح درهای باز','m²','2'],['open_door_velocity_mps','سرعت هدف در باز','m/s','1'],['margin_percent','حاشیه دبی','%','10'],['door_width_m','عرض در','m','1'],['door_height_m','ارتفاع در','m','2.1'],['handle_arm_m','فاصله دستگیره از لولا','m','0.9'],['closer_force_n','نیروی آرام‌بند در دستگیره','N','30']] }
} as const
export default function SmokeAdvanced({project}:{project:Project|null}){
 const [mode,setMode]=useState<keyof typeof models>('atrium_axisymmetric')
 const defaults=(m:keyof typeof models)=>Object.fromEntries(models[m].fields.map(([k,,,v])=>[k,v]))
 const [values,setValues]=useState<Record<string,string>>(defaults(mode)),[result,setResult]=useState<CalculationResponse|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>setResult(null),[values,project])
 async function run(e:FormEvent){e.preventDefault();setBusy(true);setError('');setResult(null);try{setResult(await calculate(mode,Object.fromEntries(Object.entries(values).map(([k,v])=>[k,Number(v)])),project))}catch(e){setError(e instanceof Error?e.message:'خطای محاسبه')}finally{setBusy(false)}}
 return <section><h2>مدل‌های تکمیلی کنترل دود</h2><div className="calculator-layout"><div className="calc-card"><div className="segmented-tabs">{Object.entries(models).map(([key,m])=><button key={key} className={mode===key?'active':''} onClick={()=>{const k=key as keyof typeof models;setMode(k);setValues(defaults(k));setResult(null);setError('')}}>{m.title}</button>)}</div><form className="calc-form" onSubmit={run}><div className="calc-banner warning">مدل مقدماتی با دامنه کاربرد مشخص؛ برای تأیید شبکه چندطبقه یا طراحی نهایی کافی نیست.</div><div className="form-grid two">{models[mode].fields.map(([k,label,unit])=><Field key={k} label={label} unit={unit} value={values[k]??''} onChange={v=>setValues({...values,[k]:v})}/>)}</div>{error&&<div role="alert" className="warning-item">{error}</div>}<button className="primary-button" disabled={busy}>{busy?'در حال محاسبه…':'محاسبه'}</button></form></div><ResultPanel data={result}/></div></section>
}
