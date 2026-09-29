-- Trusted server writes; caller identity is verified with Auth before this service-only RPC.
-- Invoker is sufficient: service_role already owns its explicit server privileges.
alter table public.design_runs add column server_generated boolean not null default false;
alter table public.design_runs add column calculator_key text;
create function public.save_engine_calculation(actor uuid, project uuid, record jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare run_id uuid;
begin
 if current_user <> 'service_role' or actor is null then raise exception 'Server only' using errcode='42501'; end if;
 if not exists(select 1 from private.billing_admins where user_id=actor) and not exists(select 1 from public.subscriptions where user_id=actor and valid_until>now()) then raise exception 'Subscription required' using errcode='42501'; end if;
 if not exists(select 1 from public.engineering_projects p join public.organization_members m on m.organization_id=p.organization_id where p.id=project and m.user_id=actor and m.role in ('owner','admin','lead_engineer','engineer')) then raise exception 'Project access denied' using errcode='42501'; end if;
 if record->>'status' not in ('calculated','warning') or jsonb_typeof(record->'input_json')<>'object' or jsonb_typeof(record->'result_json')<>'object' then raise exception 'Invalid calculation'; end if;
 insert into public.design_runs(project_id,module_key,calculator_key,engine_version,status,input_json,result_json,warnings,standards_snapshot,calculation_trace,calculation_hash,created_by,server_generated)
 values(project,record->>'module_key',record->>'calculator',record->>'engine_version',record->>'status',record->'input_json',record->'result_json',record->'warnings',record->'standards_snapshot',record->'calculation_trace',record->>'calculation_hash',actor,true) returning id into run_id;
 return run_id;
end $$;
revoke all on function public.save_engine_calculation(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_engine_calculation(uuid,uuid,jsonb) to service_role;
grant usage on schema private to service_role;
grant select on private.billing_admins to service_role;
revoke insert,update,delete on public.design_runs from anon,authenticated;
comment on column public.design_runs.server_generated is 'True only for trusted server persistence; not engineering approval. Existing client-generated records remain false.';
