CREATE OR REPLACE FUNCTION private.billing(action text, payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); admin boolean; target uuid; o public.subscription_orders%rowtype; p public.subscription_plans%rowtype; expiry timestamptz; result jsonb; ref text;
begin
 if u is null then raise exception 'ورود به حساب الزامی است'; end if;
 select exists(select 1 from private.billing_admins where user_id=u) into admin;
 if action='status' then
  return jsonb_build_object('is_admin',admin,'active',private.has_subscription(),'subscription',(select to_jsonb(s) from public.subscriptions s where user_id=u),'settings',(select to_jsonb(s) from public.billing_settings s),'plans',(select jsonb_agg(to_jsonb(plan_row) order by months) from public.subscription_plans plan_row),'orders',(select coalesce(jsonb_agg(to_jsonb(q) order by created_at desc),'[]') from (select * from public.subscription_orders where user_id=u order by created_at desc limit 100) q));
 elsif action='create_order' then
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  if not exists(select 1 from public.billing_settings where sales_enabled and length(trim(bank_instructions))>10) then raise exception 'فروش عمومی هنوز فعال نشده است'; end if;
  select * into p from public.subscription_plans where code=payload->>'plan_code' and active;
  if not found then raise exception 'پلن نامعتبر است'; end if;
  select * into o from public.subscription_orders where user_id=u and status in('pending','submitted');
  if found then return to_jsonb(o); end if;
  insert into public.subscription_orders(user_id,plan_code,months,amount_toman) values(u,p.code,p.months,p.price_toman) returning * into o;
  return to_jsonb(o);
 elsif action in('submit_payment','cancel_order') then
  select * into o from public.subscription_orders where id=(payload->>'order_id')::uuid and user_id=u for update;
  if not found or o.status not in('pending','submitted') then raise exception 'سفارش قابل تغییر نیست'; end if;
  if action='submit_payment' then
   if length(trim(coalesce(payload->>'note','')))<5 or length(payload->>'note')>1000 then raise exception 'تاریخ و کد پیگیری واریز را وارد کنید'; end if;
   update public.subscription_orders set payment_note=trim(payload->>'note'),status='submitted' where id=o.id;
  else update public.subscription_orders set status='cancelled' where id=o.id; end if;
  return jsonb_build_object('ok',true);
 end if;
 if not admin then raise exception 'دسترسی مدیریت اشتراک لازم است'; end if;
 if action='admin_list' then
  return jsonb_build_object('orders',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (select order_row.*,coalesce(nullif(a.email,''),a.phone) as contact from public.subscription_orders order_row join auth.users a on a.id=order_row.user_id order by order_row.created_at desc limit 200) q),'users',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (select a.id,coalesce(nullif(a.email,''),a.phone) as contact,s.valid_until,coalesce(s.trial_used,false) as trial_used from auth.users a left join public.subscriptions s on s.user_id=a.id order by a.created_at desc limit 200) q),'events',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (select * from public.billing_events order by id desc limit 100) q));
 elsif action='save_settings' then
  if coalesce((payload->>'sales_enabled')::boolean,false) and length(trim(coalesce(payload->>'bank_instructions','')))<10 then raise exception 'اطلاعات حساب مقصد لازم است'; end if;
  if length(coalesce(payload->>'bank_instructions',''))>2000 then raise exception 'متن طولانی است'; end if;
  update public.billing_settings set sales_enabled=coalesce((payload->>'sales_enabled')::boolean,false),bank_instructions=trim(coalesce(payload->>'bank_instructions','')) where id = true;
 elsif action='save_plan' then
  update public.subscription_plans set price_toman=(payload->>'price_toman')::bigint,active=(payload->>'active')::boolean where code=payload->>'plan_code';
  if not found then raise exception 'پلن نامعتبر است'; end if;
 elsif action in('approve_order','reject_order') then
  select * into o from public.subscription_orders where id=(payload->>'order_id')::uuid for update;
  if not found then raise exception 'سفارش یافت نشد'; end if;
  if o.status='approved' and action='approve_order' then return to_jsonb(o); end if;
  if o.status<>'submitted' then raise exception 'سفارش باید در انتظار بررسی واریز باشد'; end if;
  target:=o.user_id;
  if length(trim(coalesce(payload->>'note','')))<3 then raise exception 'توضیح بررسی لازم است'; end if;
  if action='approve_order' then
   ref:=upper(regexp_replace(coalesce(payload->>'bank_reference',''),'\s','','g'));
   if length(ref)<6 or length(ref)>100 then raise exception 'شناسه یکتای تراکنش بانکی تأییدشده لازم است'; end if;
   perform pg_advisory_xact_lock(hashtextextended(target::text,0));
   insert into public.subscriptions(user_id) values(target) on conflict do nothing;
   select greatest(valid_until,now()) into expiry from public.subscriptions where user_id=target for update;
   expiry:=expiry+make_interval(months=>o.months);
   update public.subscriptions set valid_until=expiry,updated_at=now() where user_id=target;
   update public.subscription_orders set status='approved',bank_reference=ref,review_note=payload->>'note',reviewed_by=u,reviewed_at=now(),valid_until=expiry where id=o.id;
  else update public.subscription_orders set status='rejected',review_note=payload->>'note',reviewed_by=u,reviewed_at=now() where id=o.id; end if;
 elsif action in('grant_trial','revoke_subscription') then
  target:=(payload->>'user_id')::uuid;
  if target is null then raise exception 'کاربر لازم است'; end if;
  if length(trim(coalesce(payload->>'note','')))<3 then raise exception 'دلیل تغییر لازم است'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text,0));
  insert into public.subscriptions(user_id) values(target) on conflict do nothing;
  if action='grant_trial' then
   perform pg_advisory_xact_lock(hashtextextended('billing-trial-capacity',0));
   if exists(select 1 from public.subscriptions where user_id=target and (trial_used or valid_until>now())) then raise exception 'این کاربر قبلاً دوره آزمایشی دریافت کرده یا اشتراک فعال دارد'; end if;
   if (select count(*) from public.subscriptions where trial_used)>=20 then raise exception 'ظرفیت ۲۰ کاربر آزمایشی تکمیل شده است'; end if;
   update public.subscriptions set valid_until=now()+interval '14 days',trial_used=true,updated_at=now() where user_id=target;
  else update public.subscriptions set valid_until=now(),updated_at=now() where user_id=target; end if;
 else raise exception 'عملیات نامعتبر است';
 end if;
 insert into public.billing_events(actor_id,subject_id,action,details) values(u,target,action,payload);
 return jsonb_build_object('ok',true);
end;
$function$
