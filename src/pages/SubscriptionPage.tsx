import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Plan={code:string;title:string;months:number;price_toman:number;active:boolean}
type Order={id:string;user_id:string;plan_code:string;months:number;amount_toman:number;status:string;created_at:string;payment_note?:string;review_note?:string;contact?:string;valid_until?:string}
type Member={id:string;contact:string;valid_until?:string;trial_used:boolean}
type Status={is_admin:boolean;active:boolean;subscription?:{valid_until:string;trial_used:boolean};settings:{sales_enabled:boolean;bank_instructions:string};plans:Plan[];orders:Order[]}
type Admin={orders:Order[];users:Member[];events:{id:number;action:string;created_at:string;subject_id?:string}[]}
const money=(n:number)=>new Intl.NumberFormat('fa-IR').format(n)+' تومان'
const remainingDays=(s?:string)=>s?Math.max(0,Math.ceil((new Date(s).getTime()-Date.now())/86400000)):0
const date=(s?:string)=>s?new Date(s).toLocaleString('fa-IR'):'—'
const labels:Record<string,string>={pending:'در انتظار واریز',submitted:'در انتظار بررسی مدیر',approved:'تأیید شده',rejected:'رد شده',cancelled:'لغو شده'}
async function rpc(action:string,payload:Record<string,unknown>={}){const {data,error}=await supabase.rpc('billing',{action,payload});if(error)throw new Error(error.message);return data}

export default function SubscriptionPage(){
 const [status,setStatus]=useState<Status|null>(null),[admin,setAdmin]=useState<Admin|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const [checkout,setCheckout]=useState<Plan|null>(null),[accepted,setAccepted]=useState(false),[search,setSearch]=useState(''),[filter,setFilter]=useState('all')
 const modal=useRef<HTMLFormElement>(null)
 const [bank,setBank]=useState(''),[sales,setSales]=useState(false),[plans,setPlans]=useState<Plan[]>([])
 const [selected,setSelected]=useState<{action:string;id:string}|null>(null),[note,setNote]=useState(''),[reference,setReference]=useState(''),[confirmed,setConfirmed]=useState(false)
 async function load(){const s:Status=await rpc('status');setStatus(s);setBank(s.settings.bank_instructions);setSales(s.settings.sales_enabled);setPlans(s.plans);if(s.is_admin)setAdmin(await rpc('admin_list'))}
 useEffect(()=>{load().catch(e=>setError(e.message))},[])
 async function act(action:string,payload:Record<string,unknown>={}){
  if(busy)return
  setBusy(true);setError('');setMessage('')
  try{
   const result=await rpc(action,payload)
   setSelected(null);setCheckout(null)
   const messages:Record<string,string>={create_order:'سفارش ثبت شد. مبلغ و مشخصات سفارش را در بخش «سفارش‌های من» بررسی کنید و سپس واریز کنید.',submit_payment:'مشخصات واریز ثبت شد و در انتظار بررسی مدیر است. ثبت مشخصات به معنی تأیید پرداخت نیست.',approve_order:'وصول وجه تأیید و اعتبار اشتراک به‌روزرسانی شد.',cancel_order:'سفارش لغو شد.',reject_order:'نتیجه بررسی ثبت شد.',save_settings:'تنظیمات فروش ذخیره شد.',save_plan:'قیمت و وضعیت پلن ذخیره شد.'}
   setMessage(action==='create_order'&&result?.plan_code!==payload.plan_code?'یک سفارش باز قبلی دارید؛ ابتدا همان سفارش را تکمیل یا لغو کنید.':messages[action]||'عملیات ثبت شد.')
   window.dispatchEvent(new Event('subscription-updated'))
   try{await load()}catch{setError('عملیات ثبت شد، اما دریافت وضعیت جدید انجام نشد. قبل از هر اقدام یا پرداخت دوباره، «بررسی مجدد» را بزنید.')}
  }catch(e){setError(e instanceof Error?e.message:'عملیات انجام نشد؛ پیش از تکرار، وضعیت سفارش را بررسی کنید.')}
  finally{setBusy(false)}
 }
 const openOrder=status?.orders.find(o=>['pending','submitted'].includes(o.status))
 const visibleOrders=admin?.orders.filter(o=>(filter==='all'||o.status===filter)&&[o.contact,o.id,o.payment_note].some(v=>v?.toLowerCase().includes(search.trim().toLowerCase())))||[]
 useEffect(()=>{
  if(!selected&&!checkout)return
  const previous=document.activeElement as HTMLElement|null
  modal.current?.focus()
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'&&!busy){setSelected(null);setCheckout(null)}
   if(e.key!=='Tab')return
   const nodes=Array.from(modal.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),a[href]')||[])
   const first=nodes[0],last=nodes[nodes.length-1]
   if(!first){e.preventDefault();return}
   if(e.shiftKey&&(document.activeElement===first||document.activeElement===modal.current)){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===modal.current)){e.preventDefault();first.focus()}
  }
  document.addEventListener('keydown',key)
  return()=>{document.removeEventListener('keydown',key);previous?.focus()}
 },[selected,checkout,busy])
 function dialog(action:string,id:string){setSelected({action,id});setNote('');setReference('');setConfirmed(false)}
 function submit(e:FormEvent){e.preventDefault();if(!selected)return;act(selected.action,{order_id:selected.id,user_id:selected.id,note,bank_reference:reference})}
 return <div className="page-stack billing-page"><div className="page-title-row"><div><span className="eyebrow">RABIN ENGINEERING MEMBERSHIP</span><h1>اشتراک و تمدید</h1><p>یک حساب مهندسی، سه دوره اشتراک؛ بدون تمدید یا برداشت خودکار.</p></div></div>
 {error&&<div className="billing-alert" role="alert">{error}<button className="secondary-button" onClick={()=>load().then(()=>setError('')).catch(e=>setError(e.message))}>بررسی مجدد</button></div>}
 {message&&<p role="status">{message}</p>}
 {!status&&!error&&<p>در حال دریافت اطلاعات اشتراک…</p>}
 {status&&<><section className="panel billing-panel"><h2>{status.is_admin?'حساب مدیر سامانه':status.active?'اشتراک شما فعال است':'محاسبات جدید نیازمند اشتراک فعال است'}</h2><p>پایان اعتبار: {status.is_admin?'دسترسی مدیریتی':date(status.subscription?.valid_until)}</p>{!status.is_admin&&status.active&&remainingDays(status.subscription?.valid_until)<=7&&<p className="billing-alert" role="status">تا پایان اشتراک {remainingDays(status.subscription?.valid_until)} روز باقی مانده است. تمدید زودتر، روزهای باقی‌مانده را از بین نمی‌برد.</p>}<p>پس از پایان اعتبار، پروژه‌ها حذف نمی‌شوند و گزارش‌های ذخیره‌شده در دسترس می‌مانند.</p><Link to="/reports">مشاهده گزارش‌های قبلی</Link></section>
 {!status.settings.sales_enabled&&<div className="billing-alert">فروش عمومی هنوز آغاز نشده است. دسترسی آزمایشی ۱۴روزه با دعوت مدیر برای حداکثر ۲۰ مهندس فعال می‌شود.</div>}
 {openOrder&&<section className="billing-alert" role="status"><strong>یک سفارش باز دارید: {labels[openOrder.status]}</strong><span>{money(openOrder.amount_toman)} — {openOrder.months} ماه</span><a href="#my-orders">پیگیری سفارش و ثبت مشخصات واریز</a><span>برای جلوگیری از واریز تکراری، ابتدا وضعیت همین سفارش را بررسی کنید.</span></section>}
 <div className="billing-plans">{status.plans.filter(p=>p.active).map(p=><section className="panel billing-plan" key={p.code}><span className="eyebrow">{p.months===12?'اشتراک بلندمدت':p.months===3?'پیشنهاد دوره‌ای':'شروع منعطف'}</span><h2>{p.title}</h2><strong className="billing-price">{money(p.price_toman)}</strong><p>معادل ماهانه {money(Math.round(p.price_toman/p.months))}</p><ul><li>ماژول‌های منتشرشده محاسبات مهندسی</li><li>ذخیره پروژه و گزارش فارسی</li><li>به‌روزرسانی و پشتیبانی نرم‌افزار</li></ul><p>بررسی و تأیید طراحی پروژه، خدمت جداگانه است.</p><button className="primary-button" disabled={busy||!!openOrder||!status.settings.sales_enabled} onClick={()=>{setCheckout(p);setAccepted(false)}}>ثبت سفارش {p.title}</button></section>)}</div>
 <section className="panel billing-panel"><h2>روش پرداخت</h2><p className="billing-pre">{status.settings.bank_instructions||'اطلاعات حساب مقصد هنوز توسط مدیر ثبت نشده است؛ فعلاً وجهی واریز نکنید.'}</p><p>ابتدا سفارش ثبت کنید. پس از واریز، تاریخ و کد پیگیری را برای همان سفارش ثبت کنید. اشتراک فقط بعد از بررسی وصول وجه توسط مدیر فعال می‌شود. تمدید از پایان اعتبار موجود یا زمان تأیید پرداخت، هرکدام دیرتر باشد، محاسبه می‌شود.</p></section>
 <section id="my-orders" className="panel billing-panel"><h2>سفارش‌های من</h2>{!status.orders.length&&<p>هنوز سفارشی ثبت نشده است.</p>}{status.orders.map(o=><article className="billing-order" key={o.id}><strong>{o.months} ماه — {money(o.amount_toman)} — {labels[o.status]}</strong><small>شناسه: <bdi>{o.id}</bdi> | {date(o.created_at)}</small>{o.payment_note&&<p className="billing-pre">مشخصات واریز شما: {o.payment_note}</p>}{o.review_note&&<p>نظر مدیر: {o.review_note}</p>}{o.valid_until&&<p>اعتبار ثبت‌شده پس از این پرداخت: {date(o.valid_until)}</p>}{['pending','submitted'].includes(o.status)&&<div className="billing-actions"><button disabled={busy} className="primary-button" onClick={()=>dialog('submit_payment',o.id)}>ثبت / اصلاح مشخصات واریز</button><button disabled={busy} className="secondary-button" onClick={()=>act('cancel_order',{order_id:o.id})}>لغو سفارش</button></div>}</article>)}</section>
 </>}
 {status?.is_admin&&admin&&<section className="panel billing-panel"><h2>مدیریت فروش و اشتراک‌ها</h2><form className="billing-form" onSubmit={e=>{e.preventDefault();act('save_settings',{bank_instructions:bank,sales_enabled:sales})}}><label className="plain-field"><span>اطلاعات حساب مقصد و نام صاحب حساب</span><textarea maxLength={2000} value={bank} onChange={e=>setBank(e.target.value)} placeholder="بانک، شماره حساب یا شبا، نام صاحب حساب و راه ارتباط پشتیبانی"/></label><label><input type="checkbox" checked={sales} onChange={e=>setSales(e.target.checked)}/> فروش عمومی پس از تکمیل آزمون‌های پذیرش فعال شود</label><button className="primary-button" disabled={busy}>ذخیره تنظیمات فروش</button></form>
 <h3>قیمت پلن‌ها به تومان</h3>{plans.map((p,i)=><form key={p.code} className="billing-actions" onSubmit={e=>{e.preventDefault();act('save_plan',{plan_code:p.code,price_toman:p.price_toman,active:p.active})}}><label>{p.title} <input aria-label={'قیمت '+p.title} type="number" min={1000} max={1000000000} step={1} required value={p.price_toman} onChange={e=>setPlans(plans.map((v,j)=>j===i?{...v,price_toman:Number(e.target.value)}:v))}/></label><label><input type="checkbox" checked={p.active} onChange={e=>setPlans(plans.map((v,j)=>j===i?{...v,active:e.target.checked}:v))}/> نمایش پلن</label><button className="secondary-button" disabled={busy}>ذخیره قیمت</button></form>)}<p>تغییر قیمت بر سفارش‌های قبلاً ثبت‌شده اثر ندارد.</p>
 <h3>سفارش‌ها — ۲۰۰ مورد اخیر</h3><div className="billing-actions"><label className="plain-field">جست‌وجوی سفارش<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="شماره، ایمیل، شناسه یا مشخصات واریز"/></label><label className="plain-field">وضعیت<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">همه سفارش‌ها</option>{Object.entries(labels).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label><span>در انتظار بررسی: {admin.orders.filter(o=>o.status==='submitted').length} سفارش</span></div>{admin.orders.length>0&&visibleOrders.length===0&&<p>سفارشی با این جست‌وجو پیدا نشد.</p>}{admin.orders.length===0&&<p>سفارشی موجود نیست.</p>}{visibleOrders.map(o=><article key={o.id} className="billing-order"><strong><bdi>{o.contact}</bdi> — {money(o.amount_toman)} — {labels[o.status]}</strong><small><bdi>{o.id}</bdi> | {date(o.created_at)}</small><p className="billing-pre">مشخصات اعلامی واریز: {o.payment_note||'—'}</p>{o.status==='submitted'&&<div className="billing-actions"><button disabled={busy} className="primary-button" onClick={()=>dialog('approve_order',o.id)}>بررسی و تأیید وصول</button><button disabled={busy} className="secondary-button" onClick={()=>dialog('reject_order',o.id)}>رد واریز</button></div>}</article>)}
 <h3>کاربران — ۲۰۰ مورد اخیر</h3>{admin.users.map(u=><article key={u.id} className="billing-order"><strong><bdi>{u.contact||u.id}</bdi></strong><span>پایان اعتبار: {date(u.valid_until)}</span><div className="billing-actions"><button disabled={busy||u.trial_used||!!u.valid_until&&new Date(u.valid_until).getTime()>Date.now()} className="secondary-button" onClick={()=>dialog('grant_trial',u.id)}>اعطای آزمایش ۱۴روزه</button><button disabled={busy} className="secondary-button" onClick={()=>dialog('revoke_subscription',u.id)}>قطع اعتبار</button></div></article>)}
 <details><summary>سوابق تغییرات مدیریت — ۱۰۰ مورد اخیر</summary>{admin.events.map(e=><p key={e.id}>{date(e.created_at)} — {e.action} — <bdi>{e.subject_id?.slice(0,8)||'تنظیمات'}</bdi></p>)}</details>
 </section>}
 {checkout&&<div className="modal-backdrop"><form ref={modal} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="checkout-title" className="modal-card billing-form" onSubmit={e=>{e.preventDefault();if(accepted)act('create_order',{plan_code:checkout.code})}}>{error&&<p role="alert" className="billing-alert">{error}</p>}<h2 id="checkout-title">مرور سفارش {checkout.title}</h2><strong className="billing-price">{money(checkout.price_toman)}</strong><p>مدت اشتراک: {checkout.months} ماه برای یک حساب مهندسی.</p><p>فعال‌سازی پس از واریز و تأیید وصول توسط مدیر انجام می‌شود. برای تمدید، دوره جدید از پایان اعتبار فعلی یا زمان تأیید پرداخت، هرکدام دیرتر باشد، محاسبه خواهد شد.</p><p>برداشت و تمدید خودکار وجود ندارد. تأیید طراحی پروژه جزو این اشتراک نیست.</p><label><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> مبلغ، مدت اشتراک و روش فعال‌سازی را بررسی کردم.</label><div className="billing-actions"><button className="primary-button" disabled={busy||!accepted}>ثبت سفارش و مشاهده روش واریز</button><button type="button" className="secondary-button" disabled={busy} onClick={()=>setCheckout(null)}>بازگشت</button></div></form></div>}
 {selected&&<div className="modal-backdrop"><form ref={modal} tabIndex={-1} role="dialog" aria-modal="true" aria-label="بررسی درخواست اشتراک" className="modal-card billing-form" onSubmit={submit}>{error&&<p role="alert" className="billing-alert">{error}</p>}<h2>{selected.action==='submit_payment'?'مشخصات واریز':selected.action==='approve_order'?'تأیید وصول وجه':selected.action==='grant_trial'?'فعال‌سازی دوره آزمایشی':selected.action==='revoke_subscription'?'قطع اعتبار اشتراک':'رد واریز'}</h2><label className="plain-field"><span>{selected.action==='submit_payment'?'تاریخ واریز، کد پیگیری و نام واریزکننده':'توضیح / دلیل اقدام'}</span><textarea required minLength={selected.action==='submit_payment'?5:3} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label>{selected.action==='approve_order'&&<><label className="plain-field"><span>شناسه یکتای تراکنش در صورت‌حساب بانک</span><input required minLength={6} maxLength={100} value={reference} onChange={e=>setReference(e.target.value)}/></label><label><input required type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> مبلغ و وصول وجه را در حساب بانکی بررسی کردم.</label></>}<div className="billing-actions"><button className="primary-button" disabled={busy}>ثبت</button><button type="button" className="secondary-button" disabled={busy} onClick={()=>setSelected(null)}>انصراف</button></div></form></div>}
 </div>
}
