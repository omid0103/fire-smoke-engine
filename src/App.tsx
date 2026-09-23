import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import SuppressionPage from './pages/SuppressionPage'
import SmokePage from './pages/SmokePage'
import AlarmPage from './pages/AlarmPage'
import StandardsPage from './pages/StandardsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

export default function App(){
 return <Routes><Route path="/login" element={<LoginPage/>}/><Route element={<ProtectedRoute><AppShell/></ProtectedRoute>}><Route index element={<DashboardPage/>}/><Route path="projects" element={<ProjectsPage/>}/><Route path="suppression" element={<SuppressionPage/>}/><Route path="smoke" element={<SmokePage/>}/><Route path="alarm" element={<AlarmPage/>}/><Route path="standards" element={<StandardsPage/>}/><Route path="reports" element={<ReportsPage/>}/><Route path="settings" element={<SettingsPage/>}/></Route></Routes>
}
