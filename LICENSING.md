# Licensing

Two licences, on purpose. See [ADR 0008](decisions/0008-licence-split.md) for why.

| Path | Licence | What it is |
|---|---|---|
| `lab/components/` | **MIT** | The physics. Exact, tested, equations visible |
| `lab/harness/` | **MIT** | The commit-before-reveal gate, the transport, the layout |
| `lab/primitives/` | **MIT** | Composable scenario types |
| `lab/scenario/` | **MIT** | The spec schema, the headless runner, **the verification checks** |
| `lab/scenarios/` | **MIT** | Scenario specifications — data |
| `lab/notebook/` | **AGPL-3.0-or-later** | The learner's record, and calibration |
| `lab/record/` | **AGPL-3.0-or-later** | The page a learner comes back for |
| `lab/hub/` | **AGPL-3.0-or-later** | The assembled application |
| everything else | **AGPL-3.0-or-later** | Tooling, deployment, documentation |

Every source file carries an `SPDX-License-Identifier` line, so the boundary is
readable per file and cannot drift silently.

**In plain terms.** Take the lab kit and build whatever you like, including
something commercial — that is the MIT half, and we would rather it spread than
stay ours. Run the application for your own school, class or child freely. If
you host a modified version of the application **as a service for others**, the
AGPL asks you to publish your changes.

Full texts: [LICENSE](LICENSE) (AGPL-3.0) and [LICENSE-MIT](LICENSE-MIT).
