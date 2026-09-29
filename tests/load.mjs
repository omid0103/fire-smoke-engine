// Bounded LOCAL engine benchmark. Does not send traffic to production or model DB/Auth latency.
import {readFile,writeFile,unlink} from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
const out='tests/.load-network.mjs';
await writeFile(out,ts.transpileModule(await readFile('supabase/functions/calculate/network.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
try{
 const {network}=await import('./.load-network.mjs');
 const nodes=[{id:'O',fixed:0,demand:0},...Array.from({length:59},(_,i)=>({id:`N${i}`,demand:-0.1}))];
 const edges=Array.from({length:200},(_,i)=>({id:`E${i}`,from:`N${i%59}`,to:'O',coefficient:0.085,exponent:0.65,offset_pa:0}));
 const input={nodes,edges};const times=[];
 const start=performance.now();
 for(let iteration=0;iteration<40;iteration++){
  const before=performance.now();const result=network(input,true);times.push(performance.now()-before);
  assert.equal(result.results.nodes.length,60);assert.equal(result.results.edges.length,200);
  for(let i=0;i<59;i++){
   const branches=edges.filter(e=>e.from===`N${i}`).length;
   const expected=(0.1/(branches*0.085))**(1/0.65);
   assert.ok(Math.abs(result.results.nodes[i+1].pressure_pa-expected)<0.0001);
  }
 }
 times.sort((a,b)=>a-b);
 console.log(JSON.stringify({scope:'local CPU only, not production load',runs:40,nodes:60,edges:200,elapsed_ms:+(performance.now()-start).toFixed(1),p50_ms:+times[19].toFixed(1),p95_ms:+times[37].toFixed(1),max_ms:+times[39].toFixed(1),node:process.version}));
}finally{await unlink(out);}
