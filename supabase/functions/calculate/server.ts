import { handler } from './index.ts';
import { checkSubscription } from './subscription.ts';
import { serverPersistence } from './persistence.ts';
Deno.serve(async (req:Request) => {
 const url=Deno.env.get('SUPABASE_URL')||'',anon=Deno.env.get('SUPABASE_ANON_KEY')||'';
 const denial=await checkSubscription(req,url,anon);
 return denial||handler(req,serverPersistence(req.headers.get('Authorization')||'',url,anon,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''));
});
