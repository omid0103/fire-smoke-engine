const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
export async function checkSubscription(req:Request,url:string,key:string,request:typeof fetch=fetch):Promise<Response|null>{
 if(req.method==='OPTIONS')return null;
 const deny=(status:number,error:string)=>new Response(JSON.stringify({ok:false,error}),{status,headers});
 const authorization=req.headers.get('Authorization');
 if(!authorization?.startsWith('Bearer '))return deny(401,'ابتدا وارد حساب شوید.');
 if(!url||!key)return deny(503,'بررسی اشتراک موقتاً در دسترس نیست.');
 try{
  const result=await request(`${url}/rest/v1/rpc/has_subscription`,{method:'POST',headers:{Authorization:authorization,apikey:key,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});
  if(result.status===401||result.status===403)return deny(401,'نشست معتبر نیست؛ دوباره وارد شوید.');
  if(!result.ok)return deny(503,'بررسی اشتراک موقتاً در دسترس نیست.');
  const active=await result.json();
  if(active===true)return null;
  if(active===false)return deny(402,'اشتراک فعال ندارید. از بخش «اشتراک و تمدید» اقدام کنید.');
  return deny(503,'پاسخ بررسی اشتراک معتبر نیست.');
 }catch{return deny(503,'بررسی اشتراک موقتاً در دسترس نیست.');}
}
