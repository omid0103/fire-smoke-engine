import { useEffect, useMemo, useState } from 'react'
import { Box, Braces, Calculator, CheckCircle2, Download, FileJson, Layers3, Network, Save, TableProperties, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calculate } from '../lib/api'
import { generateAutoDesignPlan, generateBimHandoff } from '../lib/autoDesign'
import {
  generateConnectorPackage,
  generateEngineeringLayout,
  generateEquipmentScheduleCsv,
  generateLayeredEngineeringDxf,
  type EngineeringLayout,
} from '../lib/engineeringLayout'
import { requirementStatusLabel } from '../lib/projectRules'
import type { AutoDesignTask, CalculationResponse, Project } from '../types'
import '../auto-design.css'

type TaskResult = { ok:true; response:CalculationResponse } | { ok:false; error:string }

function downloadText(filename:string,text:string,type:string){
  const blob=new Blob([text],{type})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)
}

const safeName=(value:string)=>value.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]+/g,'-').replace(/-+/g,'-')

export default function AutoDesignPage(){
  const [projects,setProjects]=useState<Project[]>([])
  const [projectId,setProjectId]=useState('')
  const [busy,setBusy]=useState(false)
  const [saving,setSaving]=useState(false)
  const [results,setResults]=useState<Record<string,TaskResult>>({})

  useEffect(()=>{supabase.from('engineering_projects').select('*').order('updated_at',{ascending:false}).then(({data})=>{if(data){setProjects(data as Project[]);if(data.length)setProjectId(String(data[0].id))}})},[])
  const project=projects.find(p=>p.id===projectId)||null
  const plan=useMemo(()=>project?generateAutoDesignPlan(project):null,[project])
  useEffect(()=>setResults({}),[projectId])

  const executable=useMemo(()=>{
    if(!plan)return []
    return plan.tasks.filter(task=>{
      const module=plan.modules.find(m=>m.key===task.discipline)
      return task.status==='ready' && module?.requirement_status!=='not_indicated'
    })
  },[plan])

  const successfulResults=useMemo(()=>Object.fromEntries(Object.entries(results).flatMap(([id,result])=>result.ok?[[id,result.response]]:[])) as Record<string,CalculationResponse>,[results])
  const layout=useMemo(()=>project&&plan?generateEngineeringLayout(project,plan,successfulResults):null,[project,plan,successfulResults])

  async function runReady(){
    if(!project||!plan||!executable.length)return
    setBusy(true);setResults({})
    const next:Record<string,TaskResult>={}
    for(const task of executable){
      try{next[task.id]={ok:true,response:await calculate(task.calculator,task.input,project)}}
      catch(error){next[task.id]={ok:false,error:error instanceof Error?error.message:'خطای محاسبه'}}
      setResults({...next})
    }
    setBusy(false)
  }

  async function saveSnapshot(){
    if(!project||!plan||!layout)return
    setSaving(true)
    try{
      const projectData={
        ...(project.project_data||{}),
        auto_design_plan_v1:plan,
        engineering_layout_v1:layout,
        auto_design_results_v1:successfulResults,
        auto_design_saved_at:new Date().toISOString(),
      }
      const updatedAt=new Date().toISOString()
      const {error}=await supabase.from('engineering_projects').update({project_data:projectData,updated_at:updatedAt}).eq('id',project.id)
      if(error)throw error
      setProjects(list=>list.map(item=>item.id===project.id?{...item,project_data:projectData,updated_at:updatedAt}:item))
      alert('Snapshot طراحی، Layout و نتایج محاسبات در پرونده پروژه ذخیره شد.')
    }catch(error){alert(error instanceof Error?error.message:'خطا در ذخیره Snapshot')}
    finally{setSaving(false)}
  }

  function exportDxf(){if(project&&plan&&layout&&layout.floor.width_m>0)downloadText(`${safeName(project.name)}-engineering-layout.dxf`,generateLayeredEngineeringDxf(layout,plan),'application/dxf')}
  function exportBim(){if(project&&plan)downloadText(`${safeName(project.name)}-bim-handoff.json`,JSON.stringify(generateBimHandoff(plan,project),null,2),'application/json;charset=utf-8')}
  function exportConnector(){if(project&&plan&&layout)downloadText(`${safeName(project.name)}-revit-ifc-connector.json`,JSON.stringify(generateConnectorPackage(layout,plan,project),null,2),'application/json;charset=utf-8')}
  function exportSchedule(){if(project&&layout)downloadText(`${safeName(project.name)}-equipment-schedule.csv`,generateEquipmentScheduleCsv(layout),'text/csv;charset=utf-8')}

  return <div className="page-stack auto-design-page">
    <section className="module-hero auto-design-hero"><div><span className="eyebrow">AUTO DESIGN PIPELINE</span><h1>طراحی خودکار مقدماتی</h1><p>تبدیل پرونده پروژه به Scope، محاسبه، جانمایی مفهومی تجهیزات، مسیرگذاری اولیه، رایزر دیاگرام و خروجی CAD/BIM قابل ردیابی.</p></div><div className="module-hero__symbol"><Layers3/><Box/></div></section>

    <div className="auto-design-toolbar">
      <label className="plain-field"><span>پروژه فعال</span><select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">انتخاب پروژه…</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} {p.project_code?`— ${p.project_code}`:''}</option>)}</select></label>
      <div className="auto-design-actions">
        <button className="primary-button" disabled={!plan||busy||executable.length===0} onClick={runReady}><Calculator size={17}/>{busy?'در حال اجرای صف…':`اجرای ${executable.length} محاسبه آماده`}</button>
        <button className="secondary-button" disabled={!plan||!layout||saving} onClick={saveSnapshot}><Save size={17}/>{saving?'در حال ذخیره…':'ذخیره Snapshot'}</button>
      </div>
    </div>

    {!plan&&<div className="calc-banner info">برای شروع یک پروژه را انتخاب کنید.</div>}
    {plan&&layout&&<>
      <div className="auto-design-summary">
        <div><strong>{plan.ready_task_count}</strong><span>محاسبه دارای ورودی کامل</span></div>
        <div><strong>{plan.blocked_task_count}</strong><span>محاسبه متوقف به‌علت ورودی ناقص</span></div>
        <div><strong>{layout.equipment.length}</strong><span>المان در Layout مقدماتی</span></div>
        <div><strong>{layout.routes.length}</strong><span>مسیر اولیه کابل/لوله/کانال</span></div>
      </div>
      <div className="calc-banner warning">{plan.scope_notice}</div>

      <section className="auto-design-modules">
        {plan.modules.map(module=><article className="auto-design-module" key={module.key}>
          <div className="auto-design-module__head"><div><span className="eyebrow">{module.key.toUpperCase()}</span><h2>{module.label}</h2></div><div className={`auto-score ${module.readiness_score>=90?'ready':module.readiness_score>=40?'partial':'blocked'}`}>{module.readiness_score}%</div></div>
          <div className="auto-design-status">وضعیت الزام: <strong>{requirementStatusLabel(module.requirement_status)}</strong></div>
          <h3>Scope پیشنهادی طراحی</h3><ul>{module.scope.map(item=><li key={item}>{item}</li>)}</ul>
          <h3>صف محاسبات</h3><div className="auto-task-list">{module.tasks.map(task=><TaskCard key={task.id} task={task} result={results[task.id]}/>)}</div>
        </article>)}
      </section>

      {plan.global_missing.length>0&&<section className="auto-design-blockers"><div className="section-title"><TriangleAlert size={20}/><h2>داده‌های پایه‌ای که قبل از طراحی نهایی باید تکمیل شوند</h2></div><div className="blocker-grid">{plan.global_missing.map(item=><span key={item}>{item}</span>)}</div></section>}

      <section className="auto-design-visuals engineering-visuals">
        <div className="visual-card engineering-plan-card"><div className="visual-card__head"><div><span className="eyebrow">ROUTED 2D</span><h2>پلان مهندسی اولیه</h2></div><button className="secondary-button" onClick={exportDxf} disabled={layout.floor.width_m<=0}><Download size={16}/> DXF لایه‌بندی‌شده</button></div><EngineeringPlan2D plan={plan} layout={layout}/></div>
        <div className="visual-card"><div className="visual-card__head"><div><span className="eyebrow">CONCEPT 3D</span><h2>نمای حجمی اولیه</h2></div><button className="secondary-button" onClick={exportBim}><FileJson size={16}/> BIM JSON</button></div><Concept3D plan={plan} layout={layout}/></div>
      </section>

      <section className="visual-card riser-card"><div className="visual-card__head"><div><span className="eyebrow">RISER COORDINATION</span><h2>رایزر دیاگرام مقدماتی</h2></div><Network size={18}/></div><RiserDiagram layout={layout}/></section>

      <section className="auto-design-schedules">
        <article className="visual-card schedule-card"><div className="visual-card__head"><div><span className="eyebrow">EQUIPMENT SCHEDULE</span><h2>لیست تجهیزات مفهومی</h2></div><button className="secondary-button" onClick={exportSchedule}><TableProperties size={16}/> CSV</button></div><EquipmentSchedule layout={layout}/></article>
        <article className="visual-card schedule-card"><div className="visual-card__head"><div><span className="eyebrow">ROUTE SCHEDULE</span><h2>طول مسیرهای اولیه</h2></div></div><RouteSchedule layout={layout}/></article>
      </section>

      <section className="auto-design-handoff"><div className="section-title"><Braces size={20}/><h2>خروجی CAD / BIM / Revit</h2></div><p>DXF شامل لایه‌های مجزا برای اعلام حریق، اطفا، کانال دود و نقاط تجهیز است. Connector JSON نیز مختصات، Category پیشنهادی Revit و IFC Class Mapping را منتقل می‌کند.</p><div className="handoff-actions"><button className="secondary-button" onClick={exportConnector}><FileJson size={16}/> Revit / IFC Connector JSON</button><button className="secondary-button" onClick={exportBim}><FileJson size={16}/> BIM Manifest</button></div><div className="handoff-grid"><span className={layout.floor.width_m>0?'ok':'no'}>Layered DXF: {layout.floor.width_m>0?'آماده':'نیازمند هندسه'}</span><span className="ok">Equipment/Route Schedule: آماده</span><span className="ok">Revit Category Mapping: آماده</span><span className="ok">IFC Class Mapping: آماده</span><span className="no">Native RVT/IFC STEP: نیازمند Connector و Validation مرحله بعد</span></div></section>

      <section className="auto-design-notes"><div className="section-title"><TriangleAlert size={20}/><h2>محدودیت طراحی مقدماتی</h2></div><ul>{layout.notes.map(note=><li key={note}>{note}</li>)}</ul></section>
    </>}
  </div>
}

function TaskCard({task,result}:{task:AutoDesignTask;result?:TaskResult}){
  return <div className={`auto-task ${task.status}`}>
    <div className="auto-task__top"><strong>{task.label}</strong>{task.status==='ready'?<span className="task-state ok"><CheckCircle2 size={15}/> آماده</span>:<span className="task-state wait"><TriangleAlert size={15}/> ناقص</span>}</div>
    <small>{task.calculator}</small>
    {task.missing.length>0&&<p>کمبود: {task.missing.join('، ')}</p>}
    {task.note&&<p>{task.note}</p>}
    {result&&<div className={`task-result ${result.ok?'ok':'error'}`}>{result.ok?`محاسبه انجام شد — ${result.response.calculation.status}`:`خطا: ${result.error}`}</div>}
  </div>
}

function EngineeringPlan2D({plan,layout}:{plan:ReturnType<typeof generateAutoDesignPlan>;layout:EngineeringLayout}){
  const g=layout.floor
  if(g.width_m<=0||g.length_m<=0)return <div className="visual-empty">برای تولید پلان، عرض و طول پلان یا مساحت سطح اشغال/بزرگ‌ترین طبقه را ثبت کنید.</div>
  const pad=38,w=760,h=420,scale=Math.min((w-pad*2)/g.width_m,(h-pad*2)/g.length_m),bw=g.width_m*scale,bh=g.length_m*scale,x=(w-bw)/2,y=(h-bh)/2
  const sx=(v:number)=>x+v*scale,sy=(v:number)=>y+v*scale
  return <div className="engineering-plan-wrap"><svg className="auto-plan-svg engineering-plan-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="پلان مهندسی مقدماتی پروژه">
    <rect className="plan-building" x={x} y={y} width={bw} height={bh}/>
    {plan.geometry.smoke_zones.map((z,i)=><rect key={z.name} className={`plan-zone zone-${i%4}`} x={sx(z.x_m)} y={sy(z.y_m)} width={Math.max(1,z.width_m*scale)} height={Math.max(1,z.length_m*scale)}/>)}
    {layout.routes.map(route=><polyline key={route.id} className={`layout-route route-${route.discipline} route-${route.kind}`} points={route.points.map(p=>`${sx(p.x_m)},${sy(p.y_m)}`).join(' ')}/>)}
    {layout.equipment.map(item=><g key={item.id} className={`layout-equipment equipment-${item.discipline}`}><circle cx={sx(item.x_m)} cy={sy(item.y_m)} r={item.kind.includes('shaft')||item.kind==='riser'?7:4.5}/><text x={sx(item.x_m)+7} y={sy(item.y_m)-7}>{item.label}</text></g>)}
    <text className="plan-dimension" x={w/2} y={h-8} textAnchor="middle">{g.width_m.toFixed(2)} m × {g.length_m.toFixed(2)} m — {g.source==='project-inputs'?'هندسه ثبت‌شده':'هندسه استنباطی'}</text>
  </svg><div className="layout-legend"><span className="legend-alarm">اعلام حریق</span><span className="legend-suppression">اطفا/لوله</span><span className="legend-smoke">کنترل دود/کانال</span></div></div>
}

function Concept3D({plan,layout}:{plan:ReturnType<typeof generateAutoDesignPlan>;layout:EngineeringLayout}){
  const g=layout.floor
  if(g.width_m<=0||g.length_m<=0)return <div className="visual-empty">هندسه کافی برای نمایش سه‌بعدی ثبت نشده است.</div>
  const floors=Math.min(Math.max(plan.geometry.levels,1),12)
  return <div className="concept-3d-wrap"><div className="concept-building" style={{'--floor-count':floors} as React.CSSProperties}>{Array.from({length:floors},(_,i)=><div className="concept-floor" key={i} style={{transform:`translate3d(${i*5}px,${-i*9}px,${i*2}px)`}}><span>{i+1}</span></div>)}</div><div className="concept-legend"><strong>{plan.geometry.levels} تراز ثبت‌شده</strong><span>ارتفاع تیپ: {g.height_m||'—'} m</span><span>تجهیزات Layout: {layout.equipment.length}</span><span>مسیرهای هماهنگی: {layout.routes.length}</span><span>این مدل حجمی برای هماهنگی اولیه است، نه مدل BIM نهایی.</span></div></div>
}

function RiserDiagram({layout}:{layout:EngineeringLayout}){
  if(!layout.risers.length)return <div className="visual-empty">سیستم فعالی برای رایزر دیاگرام تشخیص داده نشد.</div>
  const allLevels=layout.risers[0].levels
  const w=Math.max(720,layout.risers.length*150+180),rowH=58,h=Math.max(260,allLevels.length*rowH+80),left=135,top=35
  const yFor=(index:number)=>top+index*rowH
  return <div className="riser-scroll"><svg className="riser-svg" viewBox={`0 0 ${w} ${h}`}>
    {allLevels.map((level,i)=><g key={level.name}><line className="riser-level-line" x1={left} y1={yFor(i)} x2={w-25} y2={yFor(i)}/><text className="riser-level-label" x={15} y={yFor(i)+4}>{level.name} ({level.elevation_m} m)</text></g>)}
    {layout.risers.map((riser,index)=>{const x=left+75+index*145;return <g key={riser.id} className={`riser-system riser-${riser.discipline}`}><line x1={x} y1={yFor(0)} x2={x} y2={yFor(allLevels.length-1)}/><text className="riser-title" x={x} y={h-25} textAnchor="middle">{riser.label}{riser.size_label?` — ${riser.size_label}`:''}</text>{allLevels.map((level,i)=><circle key={level.name} cx={x} cy={yFor(i)} r={5}/>)}</g>})}
  </svg></div>
}

function EquipmentSchedule({layout}:{layout:EngineeringLayout}){
  return <div className="schedule-table-wrap"><table className="engineering-table"><thead><tr><th>رشته</th><th>تجهیز</th><th>تعداد</th><th>سایز/پارامتر</th></tr></thead><tbody>{layout.equipment_schedule.map((row,i)=><tr key={`${row.kind}-${i}`}><td>{row.discipline}</td><td>{row.label}</td><td>{row.count}</td><td>{row.size_label||'—'}</td></tr>)}</tbody></table></div>
}

function RouteSchedule({layout}:{layout:EngineeringLayout}){
  return <div className="schedule-table-wrap"><table className="engineering-table"><thead><tr><th>رشته</th><th>مسیر</th><th>طول مفهومی</th><th>سایز</th></tr></thead><tbody>{layout.route_schedule.map((row,i)=><tr key={`${row.kind}-${i}`}><td>{row.discipline}</td><td>{row.label}</td><td>{row.length_m.toFixed(2)} m</td><td>{row.size_label||'—'}</td></tr>)}</tbody></table></div>
}
