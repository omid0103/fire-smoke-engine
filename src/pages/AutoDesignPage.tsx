import { useEffect, useMemo, useState } from 'react'
import { Box, Braces, Calculator, CheckCircle2, Download, FileJson, Layers3, Save, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calculate } from '../lib/api'
import { generateAutoDesignDxf, generateAutoDesignPlan, generateBimHandoff } from '../lib/autoDesign'
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
    if(!project||!plan)return
    setSaving(true)
    try{
      const projectData={...(project.project_data||{}),auto_design_plan_v1:plan,auto_design_saved_at:new Date().toISOString()}
      const {error}=await supabase.from('engineering_projects').update({project_data:projectData,updated_at:new Date().toISOString()}).eq('id',project.id)
      if(error)throw error
      setProjects(list=>list.map(item=>item.id===project.id?{...item,project_data:projectData,updated_at:new Date().toISOString()}:item))
      alert('Snapshot طراحی خودکار در پرونده پروژه ذخیره شد.')
    }catch(error){alert(error instanceof Error?error.message:'خطا در ذخیره Snapshot')}
    finally{setSaving(false)}
  }

  function exportDxf(){if(project&&plan&&plan.handoff.dxf_available)downloadText(`${safeName(project.name)}-preliminary.dxf`,generateAutoDesignDxf(plan),'application/dxf')}
  function exportBim(){if(project&&plan)downloadText(`${safeName(project.name)}-bim-handoff.json`,JSON.stringify(generateBimHandoff(plan,project),null,2),'application/json;charset=utf-8')}

  return <div className="page-stack auto-design-page">
    <section className="module-hero auto-design-hero"><div><span className="eyebrow">AUTO DESIGN PIPELINE</span><h1>طراحی خودکار مقدماتی</h1><p>تبدیل پرونده پروژه به Scope طراحی، صف محاسبات قابل اجرا، کنترل داده‌های ناقص و خروجی مقدماتی CAD/BIM.</p></div><div className="module-hero__symbol"><Layers3/><Box/></div></section>

    <div className="auto-design-toolbar">
      <label className="plain-field"><span>پروژه فعال</span><select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">انتخاب پروژه…</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} {p.project_code?`— ${p.project_code}`:''}</option>)}</select></label>
      <div className="auto-design-actions">
        <button className="primary-button" disabled={!plan||busy||executable.length===0} onClick={runReady}><Calculator size={17}/>{busy?'در حال اجرای صف…':`اجرای ${executable.length} محاسبه آماده`}</button>
        <button className="secondary-button" disabled={!plan||saving} onClick={saveSnapshot}><Save size={17}/>{saving?'در حال ذخیره…':'ذخیره Snapshot'}</button>
      </div>
    </div>

    {!plan&&<div className="calc-banner info">برای شروع یک پروژه را انتخاب کنید.</div>}
    {plan&&<>
      <div className="auto-design-summary">
        <div><strong>{plan.ready_task_count}</strong><span>محاسبه دارای ورودی کامل</span></div>
        <div><strong>{plan.blocked_task_count}</strong><span>محاسبه متوقف به‌علت ورودی ناقص</span></div>
        <div><strong>{plan.global_missing.length}</strong><span>داده پایه پروژه ناقص</span></div>
        <div><strong>{plan.engine_version}</strong><span>نسخه موتور</span></div>
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

      <section className="auto-design-visuals">
        <div className="visual-card"><div className="visual-card__head"><div><span className="eyebrow">PRELIMINARY 2D</span><h2>شماتیک پلان اولیه</h2></div><button className="secondary-button" onClick={exportDxf} disabled={!plan.handoff.dxf_available}><Download size={16}/> DXF مقدماتی</button></div><Plan2D plan={plan}/></div>
        <div className="visual-card"><div className="visual-card__head"><div><span className="eyebrow">CONCEPT 3D</span><h2>نمای حجمی اولیه</h2></div><button className="secondary-button" onClick={exportBim}><FileJson size={16}/> BIM JSON</button></div><Concept3D plan={plan}/></div>
      </section>

      <section className="auto-design-handoff"><div className="section-title"><Braces size={20}/><h2>خروجی CAD / BIM</h2></div><p>{plan.handoff.note}</p><div className="handoff-grid"><span className={plan.handoff.dxf_available?'ok':'no'}>DXF مقدماتی: {plan.handoff.dxf_available?'آماده':'نیازمند هندسه'}</span><span className="ok">BIM JSON: آماده</span><span className="no">Native RVT: مرحله بعدی Connector/Revit Add-in</span></div></section>
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

function Plan2D({plan}:{plan:ReturnType<typeof generateAutoDesignPlan>}){
  const g=plan.geometry
  if(g.width_m<=0||g.length_m<=0)return <div className="visual-empty">برای تولید پلان، مساحت سطح اشغال/بزرگ‌ترین طبقه یا مساحت پارکینگ را ثبت کنید.</div>
  const pad=38,w=620,h=340,scale=Math.min((w-pad*2)/g.width_m,(h-pad*2)/g.length_m),bw=g.width_m*scale,bh=g.length_m*scale,x=(w-bw)/2,y=(h-bh)/2
  return <svg className="auto-plan-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="شماتیک دوبعدی پروژه">
    <rect className="plan-building" x={x} y={y} width={bw} height={bh}/>
    {g.smoke_zones.map((z,i)=><g key={z.name}><rect className={`plan-zone zone-${i%4}`} x={x+z.x_m*scale} y={y+z.y_m*scale} width={Math.max(1,z.width_m*scale)} height={Math.max(1,z.length_m*scale)}/><text x={x+(z.x_m+z.width_m/2)*scale} y={y+bh/2} textAnchor="middle">{z.name}</text></g>)}
    {g.exhaust_shaft&&<rect className="plan-shaft exhaust" x={x+g.exhaust_shaft.x_m*scale} y={y+g.exhaust_shaft.y_m*scale} width={g.exhaust_shaft.width_m*scale} height={g.exhaust_shaft.length_m*scale}/>} 
    {g.makeup_shaft&&<rect className="plan-shaft makeup" x={x+g.makeup_shaft.x_m*scale} y={y+g.makeup_shaft.y_m*scale} width={g.makeup_shaft.width_m*scale} height={g.makeup_shaft.length_m*scale}/>} 
    <text className="plan-dimension" x={w/2} y={h-8} textAnchor="middle">{g.width_m.toFixed(2)} m × {g.length_m.toFixed(2)} m — هندسه مقدماتی</text>
  </svg>
}

function Concept3D({plan}:{plan:ReturnType<typeof generateAutoDesignPlan>}){
  const g=plan.geometry
  if(g.width_m<=0||g.length_m<=0)return <div className="visual-empty">هندسه کافی برای نمایش سه‌بعدی ثبت نشده است.</div>
  const floors=Math.min(Math.max(g.levels,1),12)
  return <div className="concept-3d-wrap"><div className="concept-building" style={{'--floor-count':floors} as React.CSSProperties}>{Array.from({length:floors},(_,i)=><div className="concept-floor" key={i} style={{transform:`translate3d(${i*5}px,${-i*9}px,${i*2}px)`}}><span>{i+1}</span></div>)}</div><div className="concept-legend"><strong>{g.levels} تراز ثبت‌شده</strong><span>ارتفاع تیپ: {g.height_m||'—'} m</span><span>این مدل حجمی برای هماهنگی اولیه است، نه مدل BIM نهایی.</span></div></div>
}
