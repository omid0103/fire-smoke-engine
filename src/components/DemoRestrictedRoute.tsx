import { useEffect,useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function DemoRestrictedRoute({children}:{children:React.ReactNode}){
 const [loading,setLoading]=useState(true),[demo,setDemo]=useState(false)
 useEffect(()=>{supabase.auth.getUser().then(({data})=>{setDemo(data.user?.app_metadata?.demo===true);setLoading(false)})},[])
 if(loading)return <div className="full-loader"><div className="loader-ring"/><span>در حال بررسی سطح دسترسی…</span></div>
 if(demo)return <Navigate to="/" replace/>
 return <>{children}</>
}
