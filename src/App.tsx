import SubscriptionPage from './pages/SubscriptionPage'
import SubscriptionGate from './components/SubscriptionGate'
import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage, { PasswordRecoveryPage } from './pages/LoginPage'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import SuppressionPage from './pages/SuppressionPage'
import SmokePage from './pages/SmokePage'
import AlarmPage from './pages/AlarmPage'
import StandardsPage from './pages/StandardsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

export default function App(){
 const [recovery,setRecovery]=useState(false)
 useEffect(()=>{const {data}=supabase.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')setRecovery(true)});return()=>data.subscription.unsubscribe()},[])
 if(recovery)return <PasswordRecoveryPage recovery/>

 return <Routes><Route path="/forgot-password" element={<PasswordRecoveryPage/>}/><Route path="/login" element={<LoginPage/>}/><Route element={<ProtectedRoute><AppShell/></ProtectedRoute>}><Route index element={<DashboardPage/>}/><Route path="projects" element={<ProjectsPage/>}/><Route path="suppression" element={<SubscriptionGate><SuppressionPage/></SubscriptionGate>}/><Route path="smoke" element={<SubscriptionGate><SmokePage/></SubscriptionGate>}/><Route path="alarm" element={<SubscriptionGate><AlarmPage/></SubscriptionGate>}/><Route path="standards" element={<StandardsPage/>}/><Route path="reports" element={<ReportsPage/>}/><Route path="subscription" element={<SubscriptionPage/>}/><Route path="settings" element={<SettingsPage/>}/></Route></Routes>
}
