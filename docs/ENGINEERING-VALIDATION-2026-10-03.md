# Public Engineering Validation — 2026-10-03

## Status

The Rabin Fire Engineering Suite calculation kernel has completed a scope-controlled public engineering validation review for the equations and numerical solvers listed below.

This validation means that the implemented calculation relations and numerical solvers have traceable sources, independent regression cases, input guards, server-side persistence, and explicit scope limitations.

It does **not** mean that the software is an AHJ approval, a professional engineer seal, a product listing, or a substitute for project-specific code review. Code compliance depends on the adopted edition, Iranian regulations, local fire authority requirements, project geometry, equipment data and the responsible engineer's review.

## Current reference baseline checked on 2026-10-03

- NFPA 13 — 2025 edition. The NFPA development page lists the 2025 edition as current and also lists issued TIAs and a 2026 erratum. Rules that depend on NFPA 13 design criteria are therefore not hard-coded merely from historical project spreadsheets.
- NFPA 14 — 2024 edition catalogued for standpipe/hose-system project criteria.
- NFPA 20 — 2025 edition catalogued for fire-pump project criteria.
- NFPA 72 — 2025 edition catalogued for fire-alarm project criteria.
- NFPA 92 — 2024 edition catalogued for smoke-control project criteria.
- BS 5839-1 — 2025 edition catalogued as the current BSI non-domestic fire detection/alarm code of practice.
- BS EN 12101 series — part-specific editions must be selected. BS EN 12101-13:2022 is the current PDS design/calculation reference; BS EN 12101-6:2022 covers PDS kits; PD CEN/TS 12101-11:2022 covers horizontal-flow powered ventilation for enclosed car parks.
- NIST CONTAM 3.4 documentation — verified public engineering reference for multizone airflow-network methodology.
- US EPA EPANET 2.2 — verified public engineering reference for pressurized hydraulic-network methodology and headloss/emitter concepts.
- NISTIR 5516 — verified historical engineering reference for the axisymmetric atrium plume model used by the limited atrium calculator.
- Iranian National Building Regulations / local fire-authority requirements remain project-specific Registry entries with `needs_review` status until the exact adopted edition and local instruction set are selected for a project.

## Validation levels used by the application

### Validated Engineering Kernel

The implemented equation/solver is independently tested and can be used within its stated mathematical scope. Project acceptance limits still come from the selected standard/AHJ/equipment data.

- `hydraulic_network`
  - steady nodal mass balance
  - Hazen–Williams pipe resistance
  - pressure-dependent emitters
  - branched, parallel and looped test networks
  - rejection of disconnected/singular/non-convergent cases
  - does not automatically select NFPA remote area or pump curves

- `airflow_network`
  - signed power-law airflow paths
  - nodal mass balance
  - exponents 0.5, 0.65 and 1 regression tested
  - reverse flow and signed pressure offsets tested
  - not an implementation or certification of CONTAM
  - full thermal buoyancy, large-opening two-way transport and fan curves are outside scope

- `hazen_williams`
- `duct_velocity`
- `fire_alarm_battery` arithmetic
- `voltage_drop` arithmetic
- `npsha` arithmetic

### Validated Limited Model

The equations are independently tested, but the physical model is intentionally narrower than a complete system design.

- `atrium_axisymmetric`
  - NISTIR 5516 axisymmetric steady plume relation
  - does not cover balcony/window plume, plugholing, transient fire growth or CFD

- `pressurization_single_zone`
  - orifice leakage, open-door airflow addition and door pressure-force moment
  - does not replace a complete multizone PDS analysis under BS EN 12101-13

### Project Basis / AHJ Required

The arithmetic implementation is tested, but the governing inputs are design criteria and cannot be made universal.

- `parking_smoke`
- `parking_smoke_group`

ACH, make-up ratio, zoning, redundancy, design fire scenario and allowable velocities must be selected from the governing project basis. The existing project-reference defaults remain `draft` in the Rule Registry.

### Preliminary Only

- `sprinkler_preliminary`
  - density-area/K-factor arithmetic only
  - not automatic remote-area design

- `fire_pump`
  - base head and power arithmetic only
  - final selection requires actual manufacturer curve, churn/rated/150%, NPSH, driver and project criteria

### Legacy Reference Only

- `fire_alarm_preliminary`
  - the old detector coverage constants are retained only as an explicitly labelled legacy/educational calculation
  - they are not valid as final BS 5839-1:2025 or Iranian/AHJ design rules

## Rule Registry changes

The production Registry now includes verified public references for NIST CONTAM 3.4, EPA EPANET 2.2 and NISTIR 5516.

Locked or verified calculation rules effective 2026-10-03:

1. Hazen–Williams metric headloss
2. pressure-dependent emitter relation
3. steady power-law airflow path
4. axisymmetric atrium plume model (`verified`, limited scope)
5. DC battery charge arithmetic
6. two-wire DC voltage drop
7. NPSHa energy relation
8. hydraulic/shaft power relation
9. duct continuity and hydraulic diameter
10. single-zone orifice leakage relation

The parking project-reference defaults remain `draft` because values such as ACH and zoning limits are not universal engineering laws.

## Automated evidence

The existing test suite covers supported calculators, independent arithmetic cases, hydraulic and airflow network closed-form cases, reverse flow, mass balance, topology errors, invalid inputs, payload limits, server persistence, subscription gates and phone normalization.

A new validation-scope regression test prevents preliminary or legacy modules from being accidentally presented as fully validated in future releases.

Production output and printable reports now display the validation level, evidence basis and remaining limitations for the exact calculator used.

## Public-release conclusion

The software is suitable for public release as a **fire-engineering calculation and traceability tool within the declared validation scope**.

It must not be marketed as universally code-approved, AHJ-approved, a replacement for the responsible engineer, or equivalent to certified third-party engineering software where such certification is required.

A formal external approval, professional seal, AHJ acceptance or accredited third-party certification cannot be created by the software team itself; those remain external project- or jurisdiction-specific acts.
