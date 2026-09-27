# Engineering release 0.4.0 — 2026-09-27

## Implemented and checked
- Recovered deployed engine 0.3.0 into source control.
- Input validation, numeric overflow guard, explicit parking fire scenario, forwarded damper velocity, per-zone results, input snapshots.
- Axisymmetric atrium model traced to AtriumCalc-Version1-1.xlsm (Atrium-Fire-SI I15:I20, A-Fire-SI C11:C12); Kelvin offset 273.15.
- Single-zone leakage/open-door flow and door opening force model. Not a multizone network solver.
- Explicit calculation save outcome; project editing; readable result units; report print container fixed.
- 32 automated numerical and invalid-input assertions; TypeScript and production build pass.

## Source findings
- parking 2.xlsx Sheet1 P15 contains an incomplete formula `=`. Not copied.
- parking 2.xlsx sums normal demand and selects maximum single-zone fire demand; uploaded ventilation PDF sums all-floor fire demand. Both scenarios are explicit in UI and trace.
- Workbook rounds with 0.589 CFM per m³/h. Engine uses more precise 0.588577779; threshold differences are expected and intentional.
- Training files and historical calculators are references, not proof of adopted regulatory compliance. Windows executables were not executed.
- Public technical reference: https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nistir5516.pdf
- Multizone scope: https://www.nist.gov/el/beed/nist-multizone-modeling/applications/smoke-management

## Release blockers for full engineering production use
- Sprinkler remote-area hydraulic network and standpipe network solving not implemented.
- Multizone stair/elevator pressure network, wind/stack effects not implemented.
- Atrium balcony/window plume and plugholing models not implemented.
- Duct pressure network and manufacturer pump/fan curve verification not implemented.
- Adopted Iranian/AHJ edition and project-specific acceptance criteria not verified.
- Authenticated end-to-end create/calculate/save/reopen/print and mobile visual QA require a usable signed-in test session.
- Existing alarm coverage legacy constants remain preliminary and are not validated design rules.

Do not represent this release as a complete validated design suite.

# Update 0.5.0
- Added independent steady hydraulic graph solver: branched/looped pipes, fixed total-head supplies, elevations, Hazen-Williams resistance, pressure-dependent sprinkler emitters and fixed standpipe demands. Source head is an input; automated remote-area selection and pump-curve solving remain outside scope.
- Added steady pressure graph solver: floors/shaft paths, fixed pressure boundaries, signed mechanical injection, power-law leakage, signed wind/stack offsets. Assumes volumetric continuity / common reference density; not full thermal or large-opening two-way transport.
- Damped Newton iteration rejects disconnected, singular and non-convergent models. Outputs unrounded node/edge values, boundary supply and numerical mass residual.
- Editable network tables, per-node project acceptance limits, required design-basis description, persisted reports with tabular outputs and model references.
- 55 assertions include independent single-pipe bisection, analytic orifice pressure, parallel pipes, symmetric loop, reverse flow, zero flow, offsets and topology errors.
- TypeScript check on network solver and production UI build pass.
- No assertion of equivalence to EPANET/CONTAM certification. Independent whole-building validation, regulatory adoption checks, manufacturer curves, and authenticated end-to-end tests remain release gates for final design approval.
