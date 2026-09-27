import {readFile,writeFile,unlink} from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
const net=await readFile('supabase/functions/calculate/network.ts','utf8');
await writeFile('tests/.network-test.mjs',ts.transpileModule(net,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
const src=await readFile('supabase/functions/calculate/index.ts','utf8');
const js=ts.transpileModule(src.replace('./network.ts','./.network-test.mjs').replace('import "jsr:@supabase/functions-js/edge-runtime.d.ts";','').replace('Deno.serve(handler);',''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
await writeFile('tests/.engine-test.mjs',js);
const {handler}=await import('./.engine-test.mjs');
let checks=0;
async function run(module,input,status=200){const r=await handler(new Request('https://test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({module,input})}));assert.equal(r.status,status,await r.clone().text());checks++;return (await r.json()).calculation;}
function near(a,b,t=0.001){assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);checks++;}
const zone={area_m2:2100,height_m:3.05,normal_ach:6,fire_ach:10};
const group={zones:[zone,{...zone,area_m2:2700,height_m:5.2}],makeup_percent:60,shaft_velocity_mps:10,damper_velocity_mps:5};
let a=await run('parking_smoke_group',group);near(a.results.design_exhaust_cfm,83000,0);near(a.zones[0].results.exhaust_damper_area_m2,38000/2118.880003/5,0.0001);
let b=await run('parking_smoke_group',{...group,fire_scenario:'all_zones'});near(b.results.design_exhaust_cfm,121000,0);
a=await run('duct_velocity',{flow_cfm:12000,width_mm:1000,height_mm:500});near(a.results.velocity_mps,11.3267,0.001);
a=await run('fire_pump',{flow_lpm:600,elevation_m:10,residual_pressure_bar:0,friction_head_m:0,efficiency_percent:50});near(a.results.hydraulic_power_kw,0.980665);near(a.results.estimated_shaft_power_kw,1.96133);
a=await run('sprinkler_preliminary',{density_lpm_m2:8.1,design_area_m2:139,coverage_per_sprinkler_m2:12,k_metric:80,hose_allowance_lpm:0,duration_min:90});near(a.results.active_sprinklers,12,0);near(a.results.total_with_hose_lpm,1166.4);
const atrium={hrr_kw:4000,convective_fraction:0.7,layer_height_m:12,ambient_c:30,pressure_pa:101300,heat_fraction:1};
a=await run('atrium_axisymmetric',atrium);const m=0.071*Math.cbrt(2800)*Math.pow(12,5/3)+5.04;near(a.results.mass_flow_kg_s,m);near(a.results.smoke_temperature_c,30+2800/m);
a=await run('atrium_axisymmetric',{...atrium,layer_height_m:1});near(a.results.mass_flow_kg_s,0.032*2800**0.6);
a=await run('pressurization_single_zone',{pressure_pa:50,leakage_area_m2:0.1,discharge_coefficient:0.65,density_kg_m3:1.2,open_door_area_m2:2,open_door_velocity_mps:1,margin_percent:10,door_width_m:1,door_height_m:2.1,handle_arm_m:0.9,closer_force_n:30});near(a.results.door_opening_force_n,88.333333);
for(const v of [-1,101])await run('parking_smoke_group',{...group,makeup_percent:v},400);
await run('parking_smoke_group',{...group,fire_scenario:'typo'},400);
await run('fire_pump',{flow_lpm:600,efficiency_percent:101},400);
for(const v of ['',null,false,{},-1,0])await run('duct_velocity',{flow_cfm:v,width_mm:500,height_mm:500},400);
await run('sprinkler_preliminary',{density_lpm_m2:8.1,design_area_m2:139,coverage_per_sprinkler_m2:12,k_metric:80,active_sprinkler_count:2},400);
await run('unknown',{},400);
// Independent conservation and closed-form network cases.
const airSimple={nodes:[{id:'O',fixed:0,demand:0},{id:'A',demand:-0.6,min:25,max:60}],edges:[{id:'e',from:'A',to:'O',coefficient:0.085,exponent:0.5,offset_pa:0}]};
a=await run('airflow_network',airSimple);near(a.results.nodes[1].pressure_pa,(0.6/0.085)**2,0.001);near(a.results.edges[0].flow_m3_s,0.6,1e-7);
a=await run('airflow_network',{...airSimple,edges:[{...airSimple.edges[0],offset_pa:10}]});near(a.results.nodes[1].pressure_pa,(0.6/0.085)**2-10,0.001);
a=await run('airflow_network',{...airSimple,nodes:[airSimple.nodes[0],{id:'A',demand:0.6}]});near(a.results.nodes[1].pressure_pa,-((0.6/0.085)**2),0.001);
a=await run('airflow_network',{nodes:[{id:'O',fixed:0,demand:0},{id:'A',demand:0}],edges:airSimple.edges});near(a.results.nodes[1].pressure_pa,0,1e-7);
const waterSimple={nodes:[{id:'S',fixed:50,elevation_m:0,demand:0},{id:'A',elevation_m:10,demand:0,k_metric:80,min:1}],edges:[{id:'p',from:'S',to:'A',length_m:30,diameter_mm:32,c_factor:120}]};
a=await run('hydraulic_network',waterSimple);
let lo=0,hi=50;for(let i=0;i<100;i++){const h=(lo+hi)/2,q=80*Math.sqrt(h*0.0980665),loss=10.67*30*(q/60000)**1.852/(120**1.852*0.032**4.87);if(h+10+loss>50)hi=h;else lo=h;}
near(a.results.nodes[1].pressure_bar,(lo+hi)/2*0.0980665,1e-5);
near(a.results.edges[0].flow_lpm,a.results.nodes[1].discharge_lpm,1e-4);
const parallel={...waterSimple,edges:[...waterSimple.edges,{...waterSimple.edges[0],id:'p2'}]};a=await run('hydraulic_network',parallel);near(a.results.edges[0].flow_lpm,a.results.edges[1].flow_lpm,1e-5);near(a.results.edges[0].flow_lpm*2,a.results.nodes[1].discharge_lpm,1e-4);
const loop={nodes:[...waterSimple.nodes,{id:'B',elevation_m:10,demand:0,k_metric:80,min:1}],edges:[waterSimple.edges[0],{...waterSimple.edges[0],id:'p2',to:'B'},{...waterSimple.edges[0],id:'link',from:'A',to:'B'}]};a=await run('hydraulic_network',loop);near(a.results.nodes[1].pressure_bar,a.results.nodes[2].pressure_bar,1e-5);near(a.results.edges[2].flow_lpm,0,1e-4);
await run('airflow_network',{...airSimple,nodes:[...airSimple.nodes,{id:'disconnected',demand:0}]},400);
await run('airflow_network',{...airSimple,nodes:[airSimple.nodes[1]]},400);
await run('airflow_network',{...airSimple,edges:[{...airSimple.edges[0],coefficient:0}]},400);
await run('hydraulic_network',{...waterSimple,nodes:[...waterSimple.nodes,{...waterSimple.nodes[1]}]},400);
await run('hydraulic_network',{...waterSimple,edges:[{...waterSimple.edges[0],to:'missing'}]},400);
console.log(`${checks} engine assertions passed`);await unlink('tests/.engine-test.mjs');await unlink('tests/.network-test.mjs');
