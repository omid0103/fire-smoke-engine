update public.standard_sources
set notes = 'Public NIST airflow-network methodology reference from CONTAM User Guide 3.4; current NIST CONTAM software release verified as 3.4.0.8 on 2026-10-03. Used as methodology reference, not a claim of CONTAM equivalence.',
    metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('current_software_version','3.4.0.8','current_software_version_verified_on','2026-10-03','methodology_document_version','3.4'),
    updated_at = now()
where code='NIST-CONTAM-3.4' and edition='3.4' and jurisdiction='Engineering reference';

update public.standard_sources
set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('errata_checked_on','2026-10-03','current_errata','Errata 13-25-1','errata_issued','2026-06-24'),
    notes = 'Current edition catalogue verified on 2026-10-03. NFPA development page also lists issued TIAs and Errata 13-25-1 (2026-06-24). Project rule values must be checked against the licensed adopted text and AHJ requirements before activation.',
    updated_at = now()
where code='NFPA 13' and edition='2025' and jurisdiction='International';

insert into public.standard_sources (code,title,edition,jurisdiction,authority,source_kind,verification_status,source_url,notes,metadata)
values
('BS EN 12101-13','Smoke and heat control systems — Pressure differential systems (PDS). Design and calculation methods, installation, acceptance testing, routine testing and maintenance','2022','Europe/UK','CEN/BSI','standard','catalogued','https://knowledge.bsigroup.com/products/smoke-and-heat-control-systems-pressure-differential-systems-pds-design-and-calculation-methods-installation-acceptance-testing-routine-testing-and-maintenance','Current BSI PDS design/calculation reference verified 2026-10-03. Project acceptance criteria still require adopted national/AHJ basis and licensed standard text.',jsonb_build_object('current_edition_verified',true,'verified_on','2026-10-03','scope','pressure differential system design/calculation')),
('BS EN 12101-6','Smoke and heat control systems — Specification for pressure differential systems. Kits','2022','Europe/UK','CEN/BSI','standard','catalogued','https://knowledge.bsigroup.com/products/smoke-and-heat-control-systems-specification-for-pressure-differential-systems-kits-1','Current BSI PDS kit/component reference verified 2026-10-03; this is not the calculation-method substitute for BS EN 12101-13.',jsonb_build_object('current_edition_verified',true,'verified_on','2026-10-03','scope','PDS kits and components')),
('PD CEN/TS 12101-11','Smoke and heat control systems — Horizontal flow powered ventilation systems for enclosed car parks','2022','Europe/UK','CEN/BSI','standard','catalogued','https://knowledge.bsigroup.com/products/smoke-and-heat-control-systems-horizontal-flow-powered-ventilation-systems-for-enclosed-car-parks','Current BSI/CEN technical specification for horizontal-flow powered ventilation in enclosed car parks verified 2026-10-03. It does not make generic ACH defaults universally applicable.',jsonb_build_object('current_edition_verified',true,'verified_on','2026-10-03','scope','horizontal-flow powered ventilation for enclosed car parks'))
on conflict (code,edition,jurisdiction) do update
set title=excluded.title, authority=excluded.authority, source_kind=excluded.source_kind, verification_status=excluded.verification_status, source_url=excluded.source_url, notes=excluded.notes, metadata=excluded.metadata, updated_at=now();
