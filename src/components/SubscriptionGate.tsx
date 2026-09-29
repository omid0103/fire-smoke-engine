import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
export default function SubscriptionGate({children}:{children:React.ReactNode}){
 const [allowed,setAllowed]=useState<boolean|null>(null),[error,setError]=useState('')
 useEffect(()=>{let live=true;const load=async()=>{const {data,error}=await supabase.rpc('has_subscription');if(live){setError(error?'بررسی اعتبار اشتراک انجام نشد. دوباره تلاش کنید.':'');setAllowed(!error&&data===true)}};load();const id=window.setInterval(load,60000);window.addEventListener('subscription-updated',load);return()=>{live=false;clearInterval(id);window.removeEventListener('subscription-updated',load)}},[])
 if(allowed===null)return <p>در حال بررسی اعتبار اشتراک…</p>
 if(!allowed)return <section className="panel billing-panel"><h1>{error||'برای محاسبه، اشتراک فعال لازم است'}</h1><p>گزارش‌های ذخیره‌شده شما در بخش گزارش‌ها در دسترس‌اند.</p><Link className="primary-button" to="/subscription">مشاهده اشتراک و تمدید</Link></section>
 return <>{children}</>
}
