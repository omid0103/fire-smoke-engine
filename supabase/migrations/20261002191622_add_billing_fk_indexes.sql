create index if not exists billing_events_actor_id_idx on public.billing_events(actor_id);
create index if not exists billing_events_subject_id_idx on public.billing_events(subject_id);
create index if not exists subscription_orders_plan_code_idx on public.subscription_orders(plan_code);
create index if not exists subscription_orders_reviewed_by_idx on public.subscription_orders(reviewed_by);
