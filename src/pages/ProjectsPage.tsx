import { FormEvent, useEffect, useState } from 'react'
import { Building2, ChevronLeft, CirclePlus, MapPin, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { EngineeringDesignInput, Project } from '../types'
import { formatDate, formatNumber } from '../lib/persian'
import StatusPill from '../components/StatusPill'
import {
  DESIGN_GROUPS,
  emptyEngineeringDesignInput,
  formatDesignValue,
  getDesignValue,
  getProjectDesignInput,
  parseDesignValue,
  projectEngineeringCompleteness,
  setDesignValue,
  type DesignField,
} from '../lib/projectDesign'
import '../project-form.css'

type ProjectForm = {
  name: string
  project_code: string
  client_name: string
  building_use: string
  city: string
  address_text: string
  floors_above: string
  floors_below: string
  erp_project_id: string
  design: EngineeringDesignInput
}

const newForm = (): ProjectForm => ({
  name: '', project_code: '', client_name: '', building_use: 'مسکونی', city: 'قزوین', address_text: '', floors_above: '', floors_below: '', erp_project_id: '', design: emptyEngineeringDesignInput(),
})

const buildingUses = ['مسکونی','اداری','تجاری','مختلط','پارکینگ','صنعتی','درمانی','آموزشی','هتل/اقامتی','انبار','تجمعی/فرهنگی/ورزشی','دیتاسنتر/فناوری','سایر']

export default function ProjectsPage(){
  const [editing,setEditing]=useState<string|null>(null)
  const [projects,setProjects]=useState<Project[]>([])
  const [search,setSearch]=useState('')
  const [open,setOpen]=useState(false)
  const [form,setForm]=useState<ProjectForm>(newForm())
  const [busy,setBusy]=useState(false)
  const [org,setOrg]=useState<string|null>(null)

  async function load(){
    const m=await supabase.from('organization_members').select('organization_id').limit(1).maybeSingle()
    setOrg(m.data?.organization_id||null)
    const p=await supabase.from('engineering_projects').select('*').order('updated_at',{ascending:false})
    if(p.data)setProjects(p.data as Project[])
  }

  useEffect(()=>{load()},[])

  function startCreate(){
    setEditing(null)
    setForm(newForm())
    setOpen(true)
  }

  function startEdit(p:Project){
    setEditing(p.id)
    setForm({
      name:p.name||'',
      project_code:p.project_code||'',
      client_name:p.client_name||'',
      building_use:p.building_use||'مسکونی',
      city:p.city||'',
      address_text:p.address_text||'',
      floors_above:String(p.floors_above??''),
      floors_below:String(p.floors_below??''),
      erp_project_id:p.erp_project_id||'',
      design:getProjectDesignInput(p),
    })
    setOpen(true)
  }

  function changeDesign(field:DesignField, raw:string|boolean){
    setForm(current=>({...current,design:setDesignValue(current.design,field.path,parseDesignValue(field,raw))}))
  }

  async function submit(e:FormEvent){
    e.preventDefault()
    if(!org)return alert('ابتدا عضویت سازمان را از داشبورد فعال کنید.')
    setBusy(true)
    try{
      const u=(await supabase.auth.getUser()).data.user
      const currentProject=editing?projects.find(p=>p.id===editing):null
      const grossArea=form.design.geometry.gross_built_area_m2??null
      const projectData={...(currentProject?.project_data||{}),design_input_v1:form.design,design_schema_version:1}
      const base={
        name:form.name,
        project_code:form.project_code||null,
        client_name:form.client_name||null,
        building_use:form.building_use,
        city:form.city||null,
        address_text:form.address_text||null,
        floors_above:Number(form.floors_above)||0,
        floors_below:Number(form.floors_below)||0,
        total_area_m2:grossArea,
        erp_project_id:form.erp_project_id||null,
        project_data:projectData,
      }
      const {error}=editing
        ? await supabase.from('engineering_projects').update({...base,updated_at:new Date().toISOString()}).eq('id',editing).select('id').single()
        : await supabase.from('engineering_projects').insert({organization_id:org,...base,created_by:u?.id,status:'active'})
      if(error)throw error
      setOpen(false)
      setEditing(null)
      setForm(newForm())
      await load()
    }catch(error){
      alert(error instanceof Error?error.message:'خطا در ثبت اطلاعات پروژه')
    }finally{
      setBusy(false)
    }
  }

  const filtered=projects.filter(p=>`${p.name} ${p.project_code||''} ${p.client_name||''}`.toLowerCase().includes(search.toLowerCase()))

  return <div className="page-stack">
    <div className="page-title-row"><div><span className="eyebrow">PROJECT CONTROL</span><h1>پروژه‌های مهندسی</h1><p>مشخصات پروژه یک‌بار ثبت می‌شود و ماژول‌های اعلام، اطفا و کنترل دود از همان ورودی‌ها استفاده می‌کنند.</p></div><button className="primary-button" onClick={startCreate}><CirclePlus size={18}/> پروژه جدید</button></div>
    <div className="toolbar"><div className="search-box"><Search size={17}/><input placeholder="جستجو در پروژه‌ها…" value={search} onChange={e=>setSearch(e.target.value)}/></div><span>{formatNumber(filtered.length,0)} پروژه</span></div>
    <div className="project-grid">{filtered.map(p=>{
      const d=getProjectDesignInput(p)
      const completeness=projectEngineeringCompleteness(p)
      return <article className="project-card" key={p.id}>
        <div className="project-card__top"><div className="project-card__icon"><Building2/></div><StatusPill tone={p.status==='approved'?'ok':p.status==='review'?'warn':'info'}>{p.status}</StatusPill></div>
        <h3>{p.name}</h3><div className="project-code">{p.project_code||'بدون کد پروژه'}</div>
        <div className="project-card__meta">
          <span><MapPin size={14}/>{p.city||'—'}</span>
          <span>نوع ساختمان: {p.building_use||'—'}</span>
          <span>طبقات: {formatNumber(p.floors_above||0,0)}+ / {formatNumber(p.floors_below||0,0)}-</span>
          <span>واحدها: {d.geometry.unit_count!=null?formatNumber(d.geometry.unit_count,0):'—'}</span>
          <span>زیربنا: {p.total_area_m2?formatNumber(p.total_area_m2,0)+' m²':'—'}</span>
          <span>تکمیل ورودی مهندسی: {formatNumber(completeness,0)}%</span>
          <span>آخرین تغییر: {formatDate(p.updated_at)}</span>
        </div>
        <div className="project-card__foot"><span>{p.client_name||'کارفرما ثبت نشده'}</span><button className="secondary-button" onClick={()=>startEdit(p)}>ویرایش <ChevronLeft size={18}/></button></div>
      </article>
    })}</div>

    {open&&<div className="modal-backdrop"><form className="modal-card engineering-project-modal" onSubmit={submit}>
      <div className="modal-head sticky-modal-head"><div><span className="eyebrow">ENGINEERING PROJECT DESIGN INPUT</span><h2>{editing?'ویرایش جامع پروژه':'تعریف جامع پروژه جدید'}</h2><p>اطلاعاتی که در طراحی هر سیستم لازم است در همین پرونده پروژه نگهداری می‌شود.</p></div><button type="button" className="icon-button" onClick={()=>setOpen(false)}><X/></button></div>

      <section className="project-form-section">
        <div className="project-form-section__head"><h3>مشخصات پایه پروژه</h3><p>شناسه، محل، نوع ساختمان و تعداد طبقات.</p></div>
        <div className="form-grid three">
          <label className="plain-field"><span>نام پروژه</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label>
          <label className="plain-field"><span>کد پروژه</span><input value={form.project_code} onChange={e=>setForm({...form,project_code:e.target.value})}/></label>
          <label className="plain-field"><span>کارفرما</span><input value={form.client_name} onChange={e=>setForm({...form,client_name:e.target.value})}/></label>
          <label className="plain-field"><span>شناسه پروژه ERP</span><input value={form.erp_project_id} onChange={e=>setForm({...form,erp_project_id:e.target.value})}/></label>
          <label className="plain-field"><span>شهر</span><input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label>
          <label className="plain-field"><span>نوع ساختمان / کاربری اصلی</span><select value={form.building_use} onChange={e=>setForm({...form,building_use:e.target.value})}>{buildingUses.map(v=><option key={v}>{v}</option>)}</select></label>
          <label className="plain-field"><span>تعداد طبقات مثبت</span><input type="number" min="0" value={form.floors_above} onChange={e=>setForm({...form,floors_above:e.target.value})}/></label>
          <label className="plain-field"><span>تعداد طبقات منفی</span><input type="number" min="0" value={form.floors_below} onChange={e=>setForm({...form,floors_below:e.target.value})}/></label>
          <label className="plain-field span-two"><span>آدرس</span><input value={form.address_text} onChange={e=>setForm({...form,address_text:e.target.value})}/></label>
        </div>
      </section>

      {DESIGN_GROUPS.map(group=><section className="project-form-section" key={group.key}>
        <div className="project-form-section__head"><h3>{group.title}</h3><p>{group.description}</p></div>
        <div className="form-grid three">{group.fields.map(field=>{
          const raw=formatDesignValue(getDesignValue(form.design,field.path),field)
          if(field.kind==='checkbox')return <label className="project-check" key={field.path}><input type="checkbox" checked={Boolean(raw)} onChange={e=>changeDesign(field,e.target.checked)}/><span>{field.label}</span>{field.hint&&<small>{field.hint}</small>}</label>
          if(field.kind==='textarea')return <label className="plain-field span-three" key={field.path}><span>{field.label}{field.unit?` (${field.unit})`:''}</span><textarea rows={3} placeholder={field.placeholder} value={String(raw)} onChange={e=>changeDesign(field,e.target.value)}/>{field.hint&&<small>{field.hint}</small>}</label>
          if(field.kind==='select')return <label className="plain-field" key={field.path}><span>{field.label}{field.unit?` (${field.unit})`:''}</span><select value={String(raw)} onChange={e=>changeDesign(field,e.target.value)}><option value="">انتخاب کنید…</option>{field.options?.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>{field.hint&&<small>{field.hint}</small>}</label>
          return <label className="plain-field" key={field.path}><span>{field.label}{field.unit?` (${field.unit})`:''}</span><input type={field.kind==='number'?'number':'text'} step={field.kind==='number'?'any':undefined} placeholder={field.placeholder} value={String(raw)} onChange={e=>changeDesign(field,e.target.value)}/>{field.kind==='numberList'&&<small>چند مقدار را با ویرگول جدا کنید.</small>}{field.hint&&<small>{field.hint}</small>}</label>
        })}</div>
      </section>)}

      <div className="project-form-note">پارامترهای طراحی عددی مانند Density، Design Area، فشار، دبی، ACH و فشار مثبت باید مطابق نسخه استاندارد و نظر مرجع تأیید پروژه تعیین شوند؛ نرم‌افزار آن‌ها را بدون مبنای ثبت‌شده حدس نمی‌زند.</div>
      <div className="modal-actions sticky-modal-actions"><button type="button" className="secondary-button" onClick={()=>setOpen(false)}>انصراف</button><button className="primary-button" disabled={busy}>{busy?'در حال ثبت…':editing?'ذخیره تغییرات پروژه':'ثبت پروژه'}</button></div>
    </form></div>}
  </div>
}
