begin;
create table public.subscription_plans (
 code text primary key, title text not null, months int not null check(months in(1,3,12)),
 price_toman bigint not null check(price_toman between 1000 and 1000000000), active boolean not null default true
);
insert into public.subscription_plans values ('monthly','یک‌ماهه',1,690000,true),('quarterly','سه‌ماهه',3,1790000,true),('annual','یک‌ساله',12,5900000,true);
create table public.billing_settings (id boolean primary key default true check(id), sales_enabled boolean not null default false, bank_instructions text not null default '');
insert into public.billing_settings default values;
create table private.billing_admins(user_id uuid primary key references auth.users(id));
-- Only the established internal organization's owner becomes a billing administrator.
insert into private.billing_admins select m.user_id from public.organization_members m join public.organizations o on o.id=m.organization_id where o.slug='rabin-azar-vira' and m.role='owner';
create table public.subscriptions (
 user_id uuid primary key references auth.users(id), valid_until timestamptz not null default now(),
 trial_used boolean not null default false, updated_at timestamptz not null default now()
);
create table public.subscription_orders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 plan_code text not null references public.subscription_plans(code), months int not null check(months in(1,3,12)),
 amount_toman bigint not null check(amount_toman>0), status text not null default 'pending' check(status in('pending','submitted','approved','rejected','cancelled')),
 payment_note text, bank_reference text unique, review_note text, reviewed_by uuid references auth.users(id),
 created_at timestamptz not null default now(), reviewed_at timestamptz, valid_until timestamptz
);
create unique index one_open_subscription_order on public.subscription_orders(user_id) where status in('pending','submitted');
create table public.billing_events(id bigint generated always as identity primary key, actor_id uuid not null references auth.users(id), subject_id uuid references auth.users(id), action text not null, details jsonb not null default '{}', created_at timestamptz not null default now());
alter table public.subscription_plans enable row level security;
alter table public.billing_settings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_orders enable row level security;
alter table public.billing_events enable row level security;
revoke all on public.subscription_plans,public.billing_settings,public.subscriptions,public.subscription_orders,public.billing_events from anon,authenticated;
grant select on public.subscription_plans,public.billing_settings,public.subscriptions,public.subscription_orders to authenticated;
create policy plans_read on public.subscription_plans for select to authenticated using(true);
create policy settings_read on public.billing_settings for select to authenticated using(true);
create policy subscription_self on public.subscriptions for select to authenticated using(user_id=(select auth.uid()));
create policy orders_self on public.subscription_orders for select to authenticated using(user_id=(select auth.uid()));

create function private.has_subscription() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (exists(select 1 from private.billing_admins where user_id=auth.uid()) or exists(select 1 from public.subscriptions where user_id=auth.uid() and valid_until>now()));
$$;
revoke all on function private.has_subscription() from public,anon;
grant execute on function private.has_subscription() to authenticated;
create function public.has_subscription() returns boolean language sql stable security invoker set search_path='' as $$ select private.has_subscription(); $$;
revoke all on function public.has_subscription() from public,anon;
grant execute on function public.has_subscription() to authenticated;

create function private.billing(action text, payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
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
  update public.billing_settings set sales_enabled=coalesce((payload->>'sales_enabled')::boolean,false),bank_instructions=trim(coalesce(payload->>'bank_instructions',''));
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
$$;
revoke all on function private.billing(text,jsonb) from public,anon;
grant execute on function private.billing(text,jsonb) to authenticated;
create function public.billing(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.billing(action,payload); $$;
revoke all on function public.billing(text,jsonb) from public,anon;
grant execute on function public.billing(text,jsonb) to authenticated;

create function private.ensure_workspace() returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); org uuid;
begin
 if u is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,1));
 select organization_id into org from public.organization_members where user_id=u order by created_at limit 1;
 if org is not null then return org; end if;
 insert into public.organizations(name,slug,created_by) values('فضای کار مهندسی','engineer-'||u::text,u) returning id into org;
 insert into public.organization_members(organization_id,user_id,role) values(org,u,'owner') on conflict (organization_id,user_id) do nothing;
 return org;
end;
$$;
revoke all on function private.ensure_workspace() from public,anon;
grant execute on function private.ensure_workspace() to authenticated;
create or replace function public.bootstrap_default_organization() returns uuid language sql security invoker set search_path='' as $$ select private.ensure_workspace(); $$;
revoke all on function public.bootstrap_default_organization() from public,anon;
grant execute on function public.bootstrap_default_organization() to authenticated;
-- Individual licenses: read existing data after expiry; all new writes require entitlement.
create policy projects_subscription_insert on public.engineering_projects as restrictive for insert to authenticated with check(private.has_subscription());
create policy projects_subscription_update on public.engineering_projects as restrictive for update to authenticated using(private.has_subscription()) with check(private.has_subscription());
create policy runs_subscription_insert on public.design_runs as restrictive for insert to authenticated with check(private.has_subscription());
create policy runs_subscription_update on public.design_runs as restrictive for update to authenticated using(private.has_subscription()) with check(private.has_subscription());
commit;
