import {readFile,writeFile,unlink} from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
const target='tests/.persistence-test.mjs';
await writeFile(target,ts.transpileModule(await readFile('supabase/functions/calculate/persistence.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
try{
 const {serverPersistence}=await import('./.persistence-test.mjs');
 const data={module:'duct_velocity',engine_version:'0.5.1',input_hash:'test',calculation:{status:'calculated',inputs:{flow_cfm:12000},results:{velocity_mps:11.327}}};
 let calls=[];
 const fake=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.endsWith('/user')?{id:'verified-user'}:'saved-run'));};
 const save=serverPersistence('Bearer caller','https://test','anon','server-secret',fake);
 const result=await save(data,'project');
 assert.equal(result.saved,true);assert.equal(result.run_id,'saved-run');
 assert.equal(calls[0].options.headers.Authorization,'Bearer caller');
 assert.equal(calls[1].options.headers.Authorization,'Bearer server-secret');
 const payload=JSON.parse(calls[1].options.body);assert.equal(payload.actor,'verified-user');assert.equal(payload.project,'project');assert.equal(payload.record.module_key,'parking_smoke');assert.equal(payload.record.result_json.velocity_mps,11.327);
 for(const code of [401,403,500]){let count=0;await assert.rejects(serverPersistence('Bearer caller','url','anon','key',async()=>{count++;return new Response('{}',{status:code});})(data,'p'));assert.equal(count,1);}
 await assert.rejects(serverPersistence('Bearer caller','url','anon','',fake)(data,'p'));
 await assert.rejects(serverPersistence('Bearer caller','url','anon','key',async()=>new Response('{}'))(data,'p'));
 await assert.rejects(serverPersistence('Bearer caller','url','anon','key',async(url)=>new Response(url.endsWith('/user')?'{"id":"valid"}':'{}',{status:url.endsWith('/user')?200:403}))(data,'p'));
 await assert.rejects(serverPersistence('Bearer caller','url','anon','key',async()=>{throw Error('network');})(data,'p'));
 console.log('18 server persistence assertions passed');
}finally{await unlink(target);}
