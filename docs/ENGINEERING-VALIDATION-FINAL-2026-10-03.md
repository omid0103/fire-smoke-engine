# Final Public Engineering Validation Baseline — 2026-10-03

## Final classification

Rabin Fire Engineering Suite is validated for public use as a fire-engineering calculation and traceability tool **within the declared scope of each calculator**.

This validation confirms traceable engineering equations, independent regression tests, bounded numerical solvers, input guards, explicit validation levels, server-side calculation persistence, and a frozen reference baseline.

It is not an AHJ approval, professional seal, product listing, accredited third-party certification, or a substitute for project-specific code review.

## Reference baseline frozen on 2026-10-03

- NFPA 13 — 2025 edition. Current edition confirmed; NFPA also lists issued TIAs and Errata 13-25-1 dated 2026-06-24.
- NFPA 14 — 2024 edition.
- NFPA 20 — 2025 edition.
- NFPA 72 — 2025 edition.
- NFPA 92 — 2024 edition.
- BS 5839-1:2025 — current BSI non-domestic fire detection/alarm code of practice.
- BS EN 12101-13:2022 — current BSI/CEN pressure-differential-system design and calculation reference.
- BS EN 12101-6:2022 — current BSI/CEN PDS kits/components reference.
- PD CEN/TS 12101-11:2022 — current BSI/CEN technical specification for horizontal-flow powered ventilation systems for enclosed car parks.
- NIST CONTAM — User Guide methodology version 3.4; current NIST software release independently checked as 3.4.0.8 on 2026-10-03.
- US EPA EPANET 2.2 — public pressurized hydraulic-network reference.
- NISTIR 5516 — historical axisymmetric atrium-plume engineering reference.
- Iranian National Building Regulations and local Fire AHJ instructions — deliberately project-specific and retained as `needs_review` until the applicable edition/instruction is selected for a project.

## Accepted validation levels

### Validated engineering kernel

Approved within mathematical scope:

- `hydraulic_network`
- `airflow_network`
- `hazen_williams`
- `duct_velocity`
- `fire_alarm_battery`
- `voltage_drop`
- `npsha`

These may be used as validated computational kernels. Project design criteria remain external inputs where the governing code/AHJ/manufacturer defines them.

### Validated limited physical model

Approved only within stated model limits:

- `atrium_axisymmetric`
- `pressurization_single_zone`

The atrium module is a steady axisymmetric plume model and is not CFD. The single-zone pressurization calculator does not replace a complete multizone BS EN 12101-13 analysis.

### Project-basis / AHJ required

Arithmetic and unit conversions are validated, but universal design criteria are not asserted:

- `parking_smoke`
- `parking_smoke_group`

ACH, make-up ratio, zoning, redundancy, design-fire scenario, system arrangement and allowable velocities must be defined from the project governing basis. Generic parking defaults remain draft and cannot be represented as universal requirements.

### Preliminary only

- `sprinkler_preliminary`
- `fire_pump`

Sprinkler preliminary calculations do not perform complete NFPA 13 remote-area design. Fire-pump arithmetic does not replace manufacturer curve verification, rated/churn/150% checks, suction/NPSH review, driver selection and project criteria.

### Legacy reference only

- `fire_alarm_preliminary`

Historic detector-coverage constants are retained for educational/legacy comparison and are not approved for final BS 5839-1:2025 or Iranian/AHJ design.

## Automated engineering evidence

The engine regression suite includes independent arithmetic and closed-form checks for every supported calculator, including:

- hydraulic mass balance and pressure-dependent discharge;
- branched, parallel and looped hydraulic networks;
- airflow network exponents 0.5, 0.65 and 1;
- reverse airflow and signed pressure offsets;
- disconnected, singular and invalid topology rejection;
- atrium plume equation cases;
- single-zone leakage, open-door airflow and door-force calculation;
- parking grouped-zone arithmetic;
- pump power, NPSHa, battery, voltage-drop and duct-continuity calculations;
- malformed payload, numerical overflow and resource-bound rejection.

A validation-scope regression test prevents preliminary or legacy modules from being rendered as fully validated.

## Rule Registry status

Locked/verified computational rules include:

1. Hazen–Williams metric headloss
2. pressure-dependent emitter relation
3. steady power-law airflow path
4. axisymmetric atrium plume model
5. DC battery charge arithmetic
6. two-wire DC voltage drop
7. NPSHa energy relation
8. hydraulic/shaft power relation
9. duct continuity and hydraulic diameter
10. single-zone orifice leakage relation

Part-specific BS EN 12101 references have been added to the production Standards Registry. CONTAM registry metadata now records the current 3.4.0.8 software release while preserving the 3.4 User Guide as the methodology document.

## Release gate

**Public engineering validation gate: CLOSED / PASSED WITH DECLARED SCOPE.**

The software may be presented publicly as a validated engineering calculation and traceability platform within the validation level shown for each calculation.

The following claims remain prohibited unless separately obtained from the relevant external body:

- universally code-approved;
- AHJ-approved;
- professionally sealed;
- independently accredited/certified;
- equivalent to CONTAM, EPANET, CFD software or listed manufacturer-selection software.

Project-specific compliance remains the responsibility of the responsible engineer using the adopted code edition, Iranian regulations, local AHJ instructions, actual building geometry and manufacturer data.
