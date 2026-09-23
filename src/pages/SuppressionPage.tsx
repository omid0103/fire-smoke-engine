import { FormEvent, useEffect, useState } from 'react'
import { Droplets, Flame, Gauge, Network, CircleGauge, Waves } from 'lucide-react'
import Field from '../components/Field'
import ResultPanel from '../components/ResultPanel'
import { calculate } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { CalculationResponse, Project } from '../types'

const tabs = [
  ['sprinkler','اسپرینکلر',Droplets],
  ['hazen','افت فشار لوله',Network],
  ['pump','پمپ آتش‌نشانی',CircleGauge],
  ['npsh','NPSH',Waves],
] as const

export default function SuppressionPage(){
 const [tab,setTab]=useState<(typeof tabs)[number][0]>('sprinkler'),[projects,setProjects]=useState<Project[]>([]),[projectId,setProjectId]=useState(''),[result,setResult]=useState<CalculationResponse|null>(null),[busy,setBusy]=useState(false)
 const [spr,setSpr]=useState({density:'8.1',design_area:'139',coverage:'12',k:'57.276',hose:'0',duration:'90',count:''})
 const [haz,setHaz]=useState({flow:'1500',length:'30',diameter:'80',c:'120'})
 const [pump,setPump]=useState({flow:'1500',elevation:'30',residual:'4.5',friction:'12',safety:'5',efficiency:'70'})
 const [npsh,setNpsh]=useState({patm:'101.325',pvap:'2.34',density:'1000',static:'2',loss:'1'})
 useEffect(()=>{supabase.from('engineering_projects').select('*').order('updated_at',{ascending:false}).then(({data})=>data&&setProjects(data as Project[]))},[])
 const project=projects.find(p=>p.id===projectId)||null
 async function run(e:FormEvent){e.preventDefault();setBusy(true);setResult(null);try{let module='',input:Record<string,unknown>={};if(tab==='sprinkler'){module='sprinkler_preliminary';input={density_lpm_m2:+spr.density,design_area_m2:+spr.design_area,coverage_per_sprinkler_m2:+spr.coverage,k_metric:+spr.k,hose_allowance_lpm:+spr.hose,duration_min:+spr.duration,active_sprinkler_count:spr.count?+spr.count:null}}else if(tab==='hazen'){module='hazen_williams';input={flow_lpm:+haz.flow,length_m:+haz.length,diameter_mm:+haz.diameter,c_factor:+haz.c}}else if(tab==='pump'){module='fire_pump';input={flow_lpm:+pump.flow,elevation_m:+pump.elevation,residual_pressure_bar:+pump.residual,friction_head_m:+pump.friction,safety_percent:+pump.safety,efficiency_percent:+pump.efficiency}}else{module='npsha';input={atmospheric_pressure_kpa:+npsh.patm,vapor_pressure_kpa:+npsh.pvap,density_kg_m3:+npsh.density,static_suction_head_m:+npsh.static,suction_loss_m:+npsh.loss}}setResult(await calculate(module,input,project))}catch(e){alert(e instanceof Error?e.message:'خطا در محاسبه')}finally{setBusy(false)}}
 return <div className="page-stack"><section className="module-hero suppression"><div><span className="eyebrow">SUPPRESSION / HYDRAULICS</span><h1>اطفاء حریق و هیدرولیک</h1><p>محاسبات شفاف دبی، فشار، هد و پیش‌نیازهای طراحی با ذخیره نسخه و ردیابی محاسبه.</p></div><div className="module-hero__symbol"><Flame/><Gauge/></div></section>
 <div className="project-context"><span>ذخیره محاسبه در پروژه:</span><select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">بدون ذخیره در پروژه</option>{projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></div>
 <div className="calculator-layout"><section className="calc-card"><div className="segmented-tabs">{tabs.map(([id,label,Icon])=><button type="button" key={id} className={tab===id?'active':''} onClick={()=>{setTab(id);setResult(null)}}><Icon size={17}/>{label}</button>)}</div><form onSubmit={run} className="calc-form">
 {tab==='sprinkler'&&<><div className="calc-banner warning">این ماژول پیش‌محاسبه است؛ Remote Area نهایی هنوز باید با هندسه شبکه و استاندارد جاری اعتبارسنجی شود.</div><div className="form-grid two"><Field label="Density" unit="L/min·m²" value={spr.density} onChange={v=>setSpr({...spr,density:v})}/><Field label="Design Area" unit="m²" value={spr.design_area} onChange={v=>setSpr({...spr,design_area:v})}/><Field label="Coverage / Sprinkler" unit="m²" value={spr.coverage} onChange={v=>setSpr({...spr,coverage:v})}/><Field label="K-Factor Metric" value={spr.k} onChange={v=>setSpr({...spr,k:v})}/><Field label="Hose Allowance" unit="L/min" value={spr.hose} onChange={v=>setSpr({...spr,hose:v})}/><Field label="Duration" unit="min" value={spr.duration} onChange={v=>setSpr({...spr,duration:v})}/><Field label="Active Sprinklers (optional)" value={spr.count} onChange={v=>setSpr({...spr,count:v})}/></div></>}
 {tab==='hazen'&&<div className="form-grid two"><Field label="Flow" unit="L/min" value={haz.flow} onChange={v=>setHaz({...haz,flow:v})}/><Field label="Pipe Length" unit="m" value={haz.length} onChange={v=>setHaz({...haz,length:v})}/><Field label="Inside Diameter" unit="mm" value={haz.diameter} onChange={v=>setHaz({...haz,diameter:v})}/><Field label="Hazen-Williams C" value={haz.c} onChange={v=>setHaz({...haz,c:v})}/></div>}
 {tab==='pump'&&<div className="form-grid two"><Field label="Design Flow" unit="L/min" value={pump.flow} onChange={v=>setPump({...pump,flow:v})}/><Field label="Elevation Head" unit="m" value={pump.elevation} onChange={v=>setPump({...pump,elevation:v})}/><Field label="Required Residual Pressure" unit="bar" value={pump.residual} onChange={v=>setPump({...pump,residual:v})}/><Field label="Friction Head" unit="m" value={pump.friction} onChange={v=>setPump({...pump,friction:v})}/><Field label="Design Margin" unit="%" value={pump.safety} onChange={v=>setPump({...pump,safety:v})}/><Field label="Estimated Efficiency" unit="%" value={pump.efficiency} onChange={v=>setPump({...pump,efficiency:v})}/></div>}
 {tab==='npsh'&&<div className="form-grid two"><Field label="Atmospheric Pressure" unit="kPa" value={npsh.patm} onChange={v=>setNpsh({...npsh,patm:v})}/><Field label="Vapor Pressure" unit="kPa" value={npsh.pvap} onChange={v=>setNpsh({...npsh,pvap:v})}/><Field label="Fluid Density" unit="kg/m³" value={npsh.density} onChange={v=>setNpsh({...npsh,density:v})}/><Field label="Static Suction Head" unit="m" value={npsh.static} onChange={v=>setNpsh({...npsh,static:v})}/><Field label="Suction Loss" unit="m" value={npsh.loss} onChange={v=>setNpsh({...npsh,loss:v})}/></div>}
 <button className="primary-button calc-submit" disabled={busy}>{busy?'در حال محاسبه…':'اجرای محاسبه'}</button></form></section><ResultPanel data={result}/></div>
 </div>
}
