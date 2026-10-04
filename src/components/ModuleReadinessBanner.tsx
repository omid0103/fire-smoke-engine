import type { ModuleReadiness, Project } from '../types'
import { analyzeProjectRequirements, readinessLabel } from '../lib/projectRules'

type Props = { project: Project | null; module: ModuleReadiness['module'] }

export default function ModuleReadinessBanner({project,module}:Props){
  if(!project)return null
  const assessment=analyzeProjectRequirements(project)
  if(!assessment)return null
  const readiness=assessment.modules[module]
  const relevantSystems=assessment.systems.filter(system=>{
    if(module==='alarm')return system.key==='fire_alarm'
    if(module==='suppression')return ['sprinkler','standpipe','fire_pump','clean_agent','kitchen_hood'].includes(system.key)
    return ['smoke_control','stair_pressurization'].includes(system.key)
  })
  const attention=relevantSystems.filter(system=>system.status==='required'||system.status==='review')
  return <div className={`module-readiness-banner module-readiness-${readiness.status}`}>
    <div><strong>آمادگی ورودی پروژه: {readiness.score}%</strong><span>{readinessLabel(readiness.status)}</span></div>
    {attention.length>0&&<p>سیستم‌های نیازمند تصمیم/بازبینی: {attention.map(system=>system.label).join('، ')}</p>}
    {readiness.missing.length>0&&<details><summary>مشاهده {readiness.missing.length} ورودی ناقص</summary><ul>{readiness.missing.map(item=><li key={item}>{item}</li>)}</ul></details>}
  </div>
}
