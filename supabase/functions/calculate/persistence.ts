// Runs only inside the Edge Function. Never accepts result JSON or actor IDs from the browser.
const moduleMap:Record<string,string>={hydraulic_network:'sprinkler_hydraulics',airflow_network:'stair_pressurization',atrium_axisymmetric:'atrium_smoke',pressurization_single_zone:'stair_pressurization',parking_smoke:'parking_smoke',parking_smoke_group:'parking_smoke',duct_velocity:'parking_smoke',hazen_williams:'sprinkler_hydraulics',sprinkler_preliminary:'sprinkler_hydraulics',fire_pump:'fire_pump',npsha:'fire_pump',fire_alarm_preliminary:'fire_alarm_detection',fire_alarm_battery:'fire_alarm_power',voltage_drop:'fire_alarm_power'};
export function serverPersistence(authorization:string,url:string,anonKey:string,serviceKey:string,request:typeof fetch=fetch){
 return async(data:any,projectId:string)=>{
  if(!serviceKey)throw new Error('Persistence not configured');
  const auth=await request(`${url}/auth/v1/user`,{headers:{Authorization:authorization,apikey:anonKey},signal:AbortSignal.timeout(5000)});
  if(!auth.ok)throw new Error('Session invalid');
  const user=await auth.json();if(typeof user.id!=='string')throw new Error('Session invalid');
  const c=data.calculation;
  const record={module_key:moduleMap[data.module],calculator:data.module,engine_version:data.engine_version,status:c.status,input_json:c.inputs,result_json:{...c.results,...(c.zones?{zones:c.zones}:{})},warnings:c.warnings||[],standards_snapshot:[{source_profile:c.source_profile||null}],calculation_trace:c.trace||[],calculation_hash:data.input_hash};
  if(!record.module_key)throw new Error('Unknown module');
  const response=await request(`${url}/rest/v1/rpc/save_engine_calculation`,{method:'POST',headers:{Authorization:`Bearer ${serviceKey}`,apikey:serviceKey,'Content-Type':'application/json'},body:JSON.stringify({actor:user.id,project:projectId,record}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('Save rejected');
  const runId=await response.json();if(typeof runId!=='string')throw new Error('Invalid save response');
  return {saved:true,run_id:runId,message:'محاسبه در پروژه ذخیره شد.'};
 };
}
