import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowUpLeft, BookOpenCheck, Building2, CheckCircle2, Flame, Gauge, ShieldAlert, Wind } from 'lucide-react'
import { Link } from 'react-router-dom'
import MetricCard from '../components/MetricCard'
import StatusPill from '../components/StatusPill'
import { supabase } from '../lib/supabase'
import { formatDate, formatNumber } from '../lib/persian'
import type { DesignRun, Project, StandardSource } from '../types'

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [runs, setRuns] = useState<DesignRun[]>([])
  const [standards, setStandards] = useState<StandardSource[]>([])
  const [noOrg, setNoOrg] = useState(false)
  const [bootBusy, setBootBusy] = useState(false)

  async function load() {
    const [p, r, s, m] = await Promise.all([
      supabase.from('engineering_projects').select('*').order('updated_at',{ascending:false}).limit(6),
      supabase.from('design_runs').select('*').order('created_at',{ascending:false}).limit(7),
      supabase.from('standard_sources').select('*').order('code').limit(50),
      supabase.from('organization_members').select('organization_id').limit(1)
    ])
    if (p.data) setProjects(p.data as Project[])
    if (r.data) setRuns(r.data as DesignRun[])
    if (s.data) setStandards(s.data as StandardSource[])
    setNoOrg((m.data?.length || 0) === 0)
  }
  useEffect(()=>{ load() },[])

  async function bootstrap() {
    setBootBusy(true)
    const { error } = await supabase.rpc('bootstrap_default_organization')
    setBootBusy(false)
    if (error) alert(error.message); else load()
  }

  const warningCount = runs.filter(x => (x.warnings?.length||0)>0).length
  const needReview = standards.filter(x=>x.verification_status==='needs_review').length

  return (
    <div className="page-stack">
      <section className="engineering-hero dashboard-hero">
        <div className="engineering-hero__copy">
          <span className="eyebrow">RABIN FIRE ENGINEERING / COMMAND DESK</span>
          <h1>داشبورد محاسبات مهندسی حریق</h1>
          <p>کنترل پروژه، اجرای محاسبات، پایش هشدارهای فنی و وضعیت منابع استاندارد در یک محیط واحد.</p>
          <div className="hero-actions"><Link to="/projects" className="primary-button">پروژه جدید <ArrowUpLeft size={18}/></Link><Link to="/smoke" className="secondary-button">محاسبه سریع کنترل دود</Link></div>
        </div>
        <div className="engineering-hero__graphic" aria-hidden="true">
          <svg viewBox="0 0 420 220">
            <g fill="none" stroke="currentColor">
              <circle cx="250" cy="108" r="78" opacity=".2"/><circle cx="250" cy="108" r="56" opacity=".35"/><circle cx="250" cy="108" r="31" opacity=".6"/>
              <path d="M54 162h80v-92h60m0 0 24 38m-24-38-24 38M330 108h54" strokeWidth="2.2"/>
              <path d="M250 76v64M218 108h64" strokeWidth="2.8"/>
            </g>
            <text x="40" y="194" fill="currentColor">HYDRAULIC / SMOKE / ALARM</text>
          </svg>
        </div>
      </section>

      {noOrg && <section className="critical-banner"><ShieldAlert size={22}/><div><strong>فعال‌سازی اولیه سازمان</strong><span>این حساب هنوز عضو سازمان محاسباتی نیست. اگر اولین کاربر سامانه هستید، مالک اولیه را فعال کنید.</span></div><button className="primary-button" onClick={bootstrap} disabled={bootBusy}>{bootBusy?'در حال فعال‌سازی…':'فعال‌سازی مالک اولیه'}</button></section>}

      <div className="metric-grid four">
        <MetricCard icon={Building2} label="پروژه‌های ثبت‌شده" value={formatNumber(projects.length,0)} hint="آخرین پروژه‌های قابل دسترس"/>
        <MetricCard icon={Gauge} label="اجرای محاسبات اخیر" value={formatNumber(runs.length,0)} hint="نسخه‌دار و قابل ردیابی" tone="green"/>
        <MetricCard icon={AlertTriangle} label="Run دارای هشدار" value={formatNumber(warningCount,0)} hint="نیازمند بازبینی مهندسی" tone="amber"/>
        <MetricCard icon={BookOpenCheck} label="منابع نیازمند اعتبارسنجی" value={formatNumber(needReview,0)} hint="Rule Registry" tone="red"/>
      </div>

      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">RECENT RUNS</span><h2>آخرین محاسبات</h2></div><Link to="/reports">مشاهده همه</Link></div>
          <div className="run-list">
            {runs.length===0 && <div className="empty-inline">هنوز محاسبه‌ای ثبت نشده است.</div>}
            {runs.map(run=><div className="run-row" key={run.id}><div className={`system-icon ${run.module_key.includes('smoke')?'smoke':run.module_key.includes('alarm')?'alarm':'fire'}`}>{run.module_key.includes('smoke')?<Wind size={18}/>:run.module_key.includes('alarm')?<ShieldAlert size={18}/>:<Flame size={18}/>}</div><div className="run-row__main"><strong>{run.module_key}</strong><span>{formatDate(run.created_at)}</span></div><div className="run-row__end">{run.warnings?.length?<StatusPill tone="warn">{run.warnings.length} هشدار</StatusPill>:<StatusPill tone="ok"><CheckCircle2 size={13}/> OK</StatusPill>}<code>{run.engine_version}</code></div></div>)}
          </div>
        </section>

        <section className="panel system-matrix-panel">
          <div className="panel-head"><div><span className="eyebrow">SYSTEM MATRIX</span><h2>وضعیت هسته‌ها</h2></div></div>
          <div className="system-matrix">
            <div><span><Flame/>اطفاء و هیدرولیک</span><StatusPill tone="warn">V1 / Validation</StatusPill></div>
            <div><span><Wind/>کنترل دود پارکینگ</span><StatusPill tone="ok">Operational</StatusPill></div>
            <div><span><ShieldAlert/>اعلام حریق</span><StatusPill tone="warn">Preliminary</StatusPill></div>
            <div><span><BookOpenCheck/>Rule Registry</span><StatusPill tone="info">Versioned</StatusPill></div>
          </div>
          <div className="engineering-note"><strong>اصل طراحی سامانه</strong><p>اعداد استانداردی که اعتبارسنجی نشده‌اند به‌عنوان معیار نهایی پنهان نمی‌شوند. هر خروجی همراه با هشدار، نسخه موتور و مبنای محاسبه ثبت می‌شود.</p></div>
        </section>
      </div>
    </div>
  )
}
