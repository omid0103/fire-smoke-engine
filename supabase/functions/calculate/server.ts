import { handler } from './index.ts';
import { checkSubscription } from './subscription.ts';
Deno.serve(async (req:Request) => {
 const denial=await checkSubscription(req,Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_ANON_KEY')||'');
 return denial||handler(req);
});
