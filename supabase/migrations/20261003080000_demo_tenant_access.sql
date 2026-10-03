create table if not exists public.demo_access_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  client_name text not null check (char_length(client_name) between 2 and 120),
  expires_at timestamptz not null,
  max_redemptions integer not null default 3 check (max_redemptions between 1 and 20),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  max_projects integer not null default 10 check (max_projects between 1 and 50),
  max_runs integer not null default 60 check (max_runs between 1 and 500),
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  link_id uuid not null references public.demo_access_links(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expires_at timestamptz not null,
  max_projects integer not null,
  max_runs integer not null,
  created_at timestamptz not null default now()
);

create index if not exists demo_sessions_org_idx on public.demo_sessions(organization_id);
create index if not exists demo_links_expiry_idx on public.demo_access_links(expires_at) where revoked_at is null;

alter table public.demo_access_links enable row level security;
alter table public.demo_sessions enable row level security;
revoke all on public.demo_access_links from anon, authenticated;
revoke all on public.demo_sessions from anon, authenticated;
grant select, insert, update, delete on public.demo_access_links to service_role;
grant select, insert, update, delete on public.demo_sessions to service_role;

create or replace function private.is_demo_user() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.demo_sessions s where s.user_id=(select auth.uid()));
$$;
create or replace function private.demo_access_active() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.demo_sessions s where s.user_id=(select auth.uid()) and s.expires_at>now());
$$;
create or replace function private.demo_org_id() returns uuid language sql stable security definer set search_path='' as $$
 select s.organization_id from public.demo_sessions s where s.user_id=(select auth.uid()) and s.expires_at>now() limit 1;
$$;
create or replace function private.demo_access_org_ok(p_org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select case when not private.is_demo_user() then true else private.demo_access_active() and p_org=private.demo_org_id() end;
$$;
create or replace function private.demo_project_insert_ok(p_org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select case when not private.is_demo_user() then true else private.demo_access_active() and p_org=private.demo_org_id() and (select count(*) from public.engineering_projects p where p.organization_id=p_org) < (select s.max_projects from public.demo_sessions s where s.user_id=(select auth.uid())) end;
$$;
create or replace function private.demo_run_project_ok(p_project uuid) returns boolean language sql stable security definer set search_path='' as $$
 select case when not private.is_demo_user() then true else private.demo_access_active() and exists(select 1 from public.engineering_projects p where p.id=p_project and p.organization_id=private.demo_org_id()) end;
$$;

revoke execute on function private.is_demo_user() from public;
revoke execute on function private.demo_access_active() from public;
revoke execute on function private.demo_org_id() from public;
revoke execute on function private.demo_access_org_ok(uuid) from public;
revoke execute on function private.demo_project_insert_ok(uuid) from public;
revoke execute on function private.demo_run_project_ok(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_demo_user() to authenticated;
grant execute on function private.demo_access_active() to authenticated;
grant execute on function private.demo_org_id() to authenticated;
grant execute on function private.demo_access_org_ok(uuid) to authenticated;
grant execute on function private.demo_project_insert_ok(uuid) to authenticated;
grant execute on function private.demo_run_project_ok(uuid) to authenticated;

create or replace function private.has_subscription() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (exists(select 1 from private.billing_admins where user_id=(select auth.uid())) or exists(select 1 from public.subscriptions where user_id=(select auth.uid()) and valid_until>now()) or private.demo_access_active());
$$;

create or replace function public.claim_demo_link(p_token_hash text)
returns table(link_id uuid, client_name text, expires_at timestamptz, max_projects integer, max_runs integer)
language plpgsql security invoker set search_path='' as $$
declare d public.demo_access_links%rowtype;
begin
 if current_user <> 'service_role' then raise exception 'Server only' using errcode='42501'; end if;
 select * into d from public.demo_access_links where token_hash=p_token_hash for update;
 if not found or d.revoked_at is not null or d.expires_at<=now() or d.redemption_count>=d.max_redemptions then return; end if;
 update public.demo_access_links set redemption_count=redemption_count+1 where id=d.id;
 return query select d.id,d.client_name,d.expires_at,d.max_projects,d.max_runs;
end $$;
revoke execute on function public.claim_demo_link(text) from public, anon, authenticated;
grant execute on function public.claim_demo_link(text) to service_role;

create or replace function public.billing(action text, payload jsonb default '{}'::jsonb) returns jsonb language plpgsql set search_path='' as $$
begin
 if private.is_demo_user() then raise exception 'Billing is unavailable in demo mode' using errcode='42501'; end if;
 return private.billing(action,payload);
end $$;

create or replace function public.save_engine_calculation(actor uuid, project uuid, record jsonb) returns uuid language plpgsql set search_path='' as $$
declare run_id uuid; d public.demo_sessions%rowtype;
begin
 if current_user <> 'service_role' or actor is null then raise exception 'Server only' using errcode='42501'; end if;
 select * into d from public.demo_sessions where user_id=actor;
 if found then
   if d.expires_at<=now() then raise exception 'Demo expired' using errcode='42501'; end if;
   if not exists(select 1 from public.engineering_projects p where p.id=project and p.organization_id=d.organization_id) then raise exception 'Project access denied' using errcode='42501'; end if;
   if (select count(*) from public.design_runs r join public.engineering_projects p on p.id=r.project_id where p.organization_id=d.organization_id) >= d.max_runs then raise exception 'Demo calculation limit reached' using errcode='42501'; end if;
 else
   if not exists(select 1 from private.billing_admins where user_id=actor) and not exists(select 1 from public.subscriptions where user_id=actor and valid_until>now()) then raise exception 'Subscription required' using errcode='42501'; end if;
 end if;
 if not exists(select 1 from public.engineering_projects p join public.organization_members m on m.organization_id=p.organization_id where p.id=project and m.user_id=actor and m.role in ('owner','admin','lead_engineer','engineer')) then raise exception 'Project access denied' using errcode='42501'; end if;
 if record->>'status' not in ('calculated','warning') or jsonb_typeof(record->'input_json')<>'object' or jsonb_typeof(record->'result_json')<>'object' then raise exception 'Invalid calculation'; end if;
 insert into public.design_runs(project_id,module_key,calculator_key,engine_version,status,input_json,result_json,warnings,standards_snapshot,calculation_trace,calculation_hash,created_by,server_generated)
 values(project,record->>'module_key',record->>'calculator',record->>'engine_version',record->>'status',record->'input_json',record->'result_json',record->'warnings',record->'standards_snapshot',record->'calculation_trace',record->>'calculation_hash',actor,true) returning id into run_id;
 return run_id;
end $$;

create policy demo_organizations_select_guard on public.organizations as restrictive for select to authenticated using (private.demo_access_org_ok(id));
create policy demo_organizations_insert_guard on public.organizations as restrictive for insert to authenticated with check (not private.is_demo_user());
create policy demo_organizations_update_guard on public.organizations as restrictive for update to authenticated using (not private.is_demo_user()) with check (not private.is_demo_user());
create policy demo_org_members_select_guard on public.organization_members as restrictive for select to authenticated using (private.demo_access_org_ok(organization_id));
create policy demo_org_members_insert_guard on public.organization_members as restrictive for insert to authenticated with check (not private.is_demo_user());
create policy demo_org_members_update_guard on public.organization_members as restrictive for update to authenticated using (not private.is_demo_user()) with check (not private.is_demo_user());
create policy demo_org_members_delete_guard on public.organization_members as restrictive for delete to authenticated using (not private.is_demo_user());
create policy demo_projects_select_guard on public.engineering_projects as restrictive for select to authenticated using (private.demo_access_org_ok(organization_id));
create policy demo_projects_insert_guard on public.engineering_projects as restrictive for insert to authenticated with check (private.demo_project_insert_ok(organization_id));
create policy demo_projects_update_guard on public.engineering_projects as restrictive for update to authenticated using (private.demo_access_org_ok(organization_id)) with check (private.demo_access_org_ok(organization_id));
create policy demo_projects_delete_guard on public.engineering_projects as restrictive for delete to authenticated using (not private.is_demo_user());
create policy demo_runs_select_guard on public.design_runs as restrictive for select to authenticated using (private.demo_run_project_ok(project_id));
create policy demo_runs_insert_guard on public.design_runs as restrictive for insert to authenticated with check (private.demo_run_project_ok(project_id));
create policy demo_runs_update_guard on public.design_runs as restrictive for update to authenticated using (private.demo_run_project_ok(project_id)) with check (private.demo_run_project_ok(project_id));
