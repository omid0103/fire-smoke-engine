begin;
create function pg_temp.check_ok(v boolean,msg text) returns void language plpgsql as $$ begin if not coalesce(v,false) then raise exception 'FAILED: %',msg; end if; end $$;
select set_config('request.jwt.claim.sub','5f4f63b9-fa28-4a95-bfb7-f4b671ae4a0b',true);
set local role authenticated;
insert into public.engineering_projects(id,organization_id,name,created_by) values('33333333-3333-4333-8333-333333333333','84dbb1b3-2b08-4721-be57-6c5a6ea31b70','QA server persistence rollback',auth.uid());
do $$ begin
 begin insert into public.design_runs(project_id,module_key,engine_version) values('33333333-3333-4333-8333-333333333333','parking_smoke','fake'); raise exception 'FAILED direct insert'; exception when insufficient_privilege then null; end;
 begin perform public.save_engine_calculation(auth.uid(),'33333333-3333-4333-8333-333333333333','{}'); raise exception 'FAILED client rpc'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
select public.save_engine_calculation('5f4f63b9-fa28-4a95-bfb7-f4b671ae4a0b','33333333-3333-4333-8333-333333333333','{"module_key":"parking_smoke","calculator":"duct_velocity","engine_version":"0.5.1","status":"calculated","input_json":{"flow_cfm":12000},"result_json":{"velocity_mps":11.327},"warnings":[],"standards_snapshot":[],"calculation_trace":[],"calculation_hash":"qa"}');
do $$ begin
 begin perform public.save_engine_calculation('cb5b4200-5b72-4ef9-b4d5-6dc714db2e26','33333333-3333-4333-8333-333333333333','{}'); raise exception 'FAILED unsubscribed actor'; exception when insufficient_privilege then null; end;
 begin perform public.save_engine_calculation('5f4f63b9-fa28-4a95-bfb7-f4b671ae4a0b','44444444-4444-4444-8444-444444444444','{}'); raise exception 'FAILED unknown project'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select pg_temp.check_ok((select server_generated and calculator_key='duct_velocity' and result_json->>'velocity_mps'='11.327' from public.design_runs where project_id='33333333-3333-4333-8333-333333333333'),'server record reads back');
do $$ begin
 begin update public.design_runs set result_json='{"tampered":true}' where project_id='33333333-3333-4333-8333-333333333333'; raise exception 'FAILED client update'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','cb5b4200-5b72-4ef9-b4d5-6dc714db2e26',true);
set local role authenticated;
select pg_temp.check_ok(not exists(select 1 from public.design_runs where project_id='33333333-3333-4333-8333-333333333333'),'other tenant cannot read');
reset role;
rollback;
select 'PASS: server record saved/read; client insert/update/RPC and invalid actor/project denied; rollback complete' as result;
