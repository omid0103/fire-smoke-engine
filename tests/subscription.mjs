import {readFile,writeFile,unlink} from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
const file='tests/.subscription-test.mjs';
await writeFile(file,ts.transpileModule(await readFile('supabase/functions/calculate/subscription.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
try{
 const {checkSubscription:check}=await import('./.subscription-test.mjs');
 const req=new Request('https://test',{method:'POST',headers:{Authorization:'Bearer test'}});
 const fake=(body,status=200)=>async()=>new Response(JSON.stringify(body),{status});
 assert.equal((await check(new Request('https://test',{method:'POST'}),'url','key',fake(true))).status,401);
 assert.equal(await check(new Request('https://test',{method:'OPTIONS'}),'','',fake(false)),null);
 assert.equal(await check(req,'https://example.com','key',fake(true)),null);
 assert.equal((await check(req,'url','key',fake(false))).status,402);
 for(const body of ['true',null,{},[]])assert.equal((await check(req,'url','key',fake(body))).status,503);
 for(const status of [401,403])assert.equal((await check(req,'url','key',fake({},status))).status,401);
 assert.equal((await check(req,'url','key',fake({},500))).status,503);
 assert.equal((await check(req,'url','key',async()=>{throw new Error('network')})).status,503);
 assert.equal((await check(req,'','',fake(true))).status,503);
 console.log('13 subscription gate assertions passed');
}finally{await unlink(file)}
