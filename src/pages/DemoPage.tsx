import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, ArrowLeft, Bell, Building2, Calculator, CheckCircle2, Eye, FileText, Flame, Gauge, LockKeyhole, ShieldCheck, Wind } from 'lucide-react'
import { Link } from 'react-router-dom'
import EngineeringLogo from '../components/EngineeringLogo'
import '../demo.css'

type DemoView = 'dashboard' | 'projects' | 'calculator' | 'report'

const sampleProjects = [
  { name: 'مجتمع مسکونی نمونه', meta: '۵ طبقه روی پیلوت • اعلام حریق', state: 'نمونه تکمیل‌شده' },
  { name: 'پارکینگ تجاری نمونه', meta: '۲ زیرزمین • کنترل دود', state: 'بازبینی فنی' },
  { name: 'ساختمان اداری نمونه', meta: 'اطفاء + هیدرولیک • ۸ طبقه', state: 'در حال طراحی' },
]

const sampleRuns = [
  { module: 'کنترل دود پارکینگ', value: '38,000 CFM', note: 'سناریوی نمونه • خروجی نمایشی', icon: Wind },
  { module: 'باتری اعلام حریق', value: '16.25 Ah', note: 'هسته محاسباتی معتبر', icon: Bell },
  { module: 'افت فشار کانال', value: '11.33 m/s', note: 'نمونه سرعت کانال', icon: Gauge },
]

export default function DemoPage() {
  const [view, setView] = useState<DemoView>('dashboard')
  const [flow, setFlow] = useState(12000)
  const [width, setWidth] = useState(1000)
  const [height, setHeight] = useState(500)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'نسخه دمو | Rabin Fire Engineering'
    const existing = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null
    const created = !existing
    const meta = existing || document.createElement('meta')
    if (created) {
      meta.name = 'robots'
      document.head.appendChild(meta)
    }
    const previous = meta.content
    meta.content = 'noindex,nofollow,noarchive'
    return () => {
      document.title = previousTitle
      if (created) meta.remove()
      else meta.content = previous
    }
  }, [])

  const velocity = useMemo(() => {
    const area = Math.max(0.01, (width * height) / 1_000_000)
    return (flow / 2118.880003) / area
  }, [flow, width, height])

  const velocityTone = velocity > 12 ? 'warn' : 'ok'

  return (
    <div className="demo-shell" dir="rtl">
      <div className="demo-watermark" aria-hidden="true">DEMO</div>
      <aside className="demo-sidebar">
        <EngineeringLogo />
        <div className="demo-badge"><Eye size={16}/> نسخه نمایشی بازاریابی</div>
        <nav>
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}><Activity size={18}/> داشبورد</button>
          <button className={view === 'projects' ? 'active' : ''} onClick={() => setView('projects')}><Building2 size={18}/> پروژه‌های نمونه</button>
          <button className={view === 'calculator' ? 'active' : ''} onClick={() => setView('calculator')}><Calculator size={18}/> محاسبه محدود</button>
          <button className={view === 'report' ? 'active' : ''} onClick={() => setView('report')}><FileText size={18}/> گزارش نمونه</button>
        </nav>
        <div className="demo-sidebar__guard"><LockKeyhole size={17}/><span>بدون اتصال به داده‌های واقعی، بدون ذخیره‌سازی و بدون خروجی رسمی</span></div>
        <Link className="demo-login-link" to="/login">ورود به نسخه کامل <ArrowLeft size={16}/></Link>
      </aside>

      <main className="demo-main">
        <header className="demo-topbar">
          <div><span className="demo-kicker">RABIN FIRE ENGINEERING</span><strong>محیط دمو و ارائه مشتری</strong></div>
          <div className="demo-topbar__chips"><span><ShieldCheck size={15}/> Sandbox</span><span>Engine v0.5.1</span></div>
        </header>

        <div className="demo-notice"><AlertTriangle size={18}/><span>این محیط فقط برای معرفی قابلیت‌هاست. محاسبات و گزارش‌های دمو برای طراحی یا تأیید اجرایی قابل استناد نیستند.</span></div>

        {view === 'dashboard' && <div className="demo-stack">
          <section className="demo-hero">
            <div><span className="demo-kicker">LIMITED MARKETING DEMO</span><h1>محاسبات مهندسی حریق، در یک محیط یکپارچه</h1><p>نمایش کنترل‌شده‌ای از مدیریت پروژه، هسته‌های محاسباتی، هشدارهای مهندسی و گزارش‌های قابل ردیابی.</p><button className="demo-primary" onClick={() => setView('calculator')}>اجرای محاسبه نمونه <ArrowLeft size={17}/></button></div>
            <div className="demo-hero__graphic"><div className="demo-orbit"><Flame/><Wind/><Bell/></div></div>
          </section>

          <div className="demo-metrics">
            <article><Building2/><div><span>پروژه نمونه</span><strong>۳</strong></div></article>
            <article><Calculator/><div><span>هسته نمایشی</span><strong>۳</strong></div></article>
            <article><ShieldCheck/><div><span>داده واقعی</span><strong>۰</strong></div></article>
            <article><FileText/><div><span>خروجی رسمی</span><strong>غیرفعال</strong></div></article>
          </div>

          <section className="demo-panel">
            <div className="demo-panel__head"><div><span className="demo-kicker">SAMPLE RUNS</span><h2>نمونه خروجی‌ها</h2></div><button onClick={() => setView('report')}>گزارش نمونه</button></div>
            <div className="demo-run-list">{sampleRuns.map(({module,value,note,icon:Icon}) => <article key={module}><span className="demo-system-icon"><Icon size={18}/></span><div><strong>{module}</strong><small>{note}</small></div><b>{value}</b></article>)}</div>
          </section>
        </div>}

        {view === 'projects' && <div className="demo-stack">
          <section className="demo-section-title"><span className="demo-kicker">PROJECT CONTROL</span><h1>پروژه‌های نمونه</h1><p>در نسخه دمو فقط رکوردهای ساختگی نمایش داده می‌شوند و امکان ایجاد، ویرایش یا حذف پروژه وجود ندارد.</p></section>
          <div className="demo-project-grid">{sampleProjects.map((p, i) => <article key={p.name}><div className="demo-project-no">0{i + 1}</div><h3>{p.name}</h3><p>{p.meta}</p><span>{p.state}</span><button disabled>ویرایش در نسخه کامل</button></article>)}</div>
        </div>}

        {view === 'calculator' && <div className="demo-stack">
          <section className="demo-section-title"><span className="demo-kicker">VALIDATED KERNEL SAMPLE</span><h1>نمونه محدود محاسبه سرعت کانال</h1><p>این بخش فقط یک هسته محاسباتی محدود را در مرورگر نمایش می‌دهد؛ نتیجه ذخیره نمی‌شود و گزارش رسمی تولید نمی‌کند.</p></section>
          <div className="demo-calc-grid">
            <section className="demo-panel demo-form">
              <label><span>دبی هوا</span><div><input type="number" min="1000" max="25000" step="500" value={flow} onChange={e => setFlow(Number(e.target.value) || 0)}/><em>CFM</em></div></label>
              <label><span>عرض کانال</span><div><input type="number" min="200" max="2500" step="50" value={width} onChange={e => setWidth(Number(e.target.value) || 0)}/><em>mm</em></div></label>
              <label><span>ارتفاع کانال</span><div><input type="number" min="150" max="1500" step="50" value={height} onChange={e => setHeight(Number(e.target.value) || 0)}/><em>mm</em></div></label>
              <button className="demo-disabled-action" disabled>ذخیره Run در نسخه کامل</button>
            </section>
            <section className="demo-result-card">
              <span className="demo-kicker">LIVE DEMO RESULT</span><strong>{Number.isFinite(velocity) ? velocity.toFixed(2) : '—'} <small>m/s</small></strong>
              <div className={`demo-result-state ${velocityTone}`}>{velocityTone === 'ok' ? <CheckCircle2 size={17}/> : <AlertTriangle size={17}/>} {velocityTone === 'ok' ? 'در محدوده نمایشی' : 'بیش از آستانه نمایشی 12 m/s'}</div>
              <dl><div><dt>مساحت مقطع</dt><dd>{((width * height) / 1_000_000).toFixed(3)} m²</dd></div><div><dt>دبی تبدیل‌شده</dt><dd>{(flow / 2118.880003).toFixed(3)} m³/s</dd></div><div><dt>ذخیره سرور</dt><dd>غیرفعال در دمو</dd></div></dl>
              <p>نسخه کامل علاوه بر نتیجه، ورودی‌ها، نسخه موتور، هشدارها، مبنای محاسبه و Trace را روی سرور ثبت می‌کند.</p>
            </section>
          </div>
        </div>}

        {view === 'report' && <div className="demo-stack">
          <section className="demo-section-title"><span className="demo-kicker">TRACEABLE REPORT</span><h1>گزارش نمونه محاسبات</h1><p>نمونه‌ای از ساختار گزارش نسخه کامل؛ چاپ و دانلود رسمی در دمو غیرفعال است.</p></section>
          <article className="demo-report">
            <div className="demo-report__head"><div><span>RABIN FIRE ENGINEERING</span><h2>گزارش نمونه — سرعت کانال</h2></div><span className="demo-report-stamp">DEMO / NOT FOR DESIGN</span></div>
            <div className="demo-report-meta"><div><span>Engine Version</span><b>0.5.1</b></div><div><span>Validation Level</span><b>Validated Kernel</b></div><div><span>Server Generated</span><b>Disabled in Demo</b></div><div><span>Calculation Hash</span><b>DEMO-NOT-PERSISTED</b></div></div>
            <section><h3>ورودی‌ها</h3><table><tbody><tr><td>دبی هوا</td><td>12,000 CFM</td></tr><tr><td>ابعاد کانال</td><td>1000 × 500 mm</td></tr></tbody></table></section>
            <section><h3>خروجی نمونه</h3><table><tbody><tr><td>مساحت مقطع</td><td>0.500 m²</td></tr><tr><td>سرعت هوا</td><td>11.33 m/s</td></tr></tbody></table></section>
            <section className="demo-report-note"><AlertTriangle size={18}/><p>این نسخه نمایشی است و فاقد ذخیره سرور، امضای محاسباتی، پرونده پروژه و خروجی قابل استناد است.</p></section>
            <div className="demo-report-actions"><button disabled>دانلود PDF در نسخه کامل</button><Link to="/login">ورود به سامانه کامل</Link></div>
          </article>
        </div>}
      </main>
    </div>
  )
}
