# Cybersecurity Review Report Template

Use this structure as a report contract, not as filler. Remove inapplicable
instructions and placeholders. Use `None` when an applicable section has no
content.

Keep the executive summary compact. Put technical evidence in the detailed
findings and link to findings by stable ID.

# Cybersecurity Review: <Repository or System>

## Report at a glance

| Field | Value |
| --- | --- |
| Review date | `<YYYY-MM-DD>` |
| Target | `<repository and root>` |
| Revision | `<commit, branch, or supplied revision>` |
| Working tree | `<clean, dirty, or unknown>` |
| Review depth | `Deep repository review` |
| Reviewer | `<agent or reviewer>` |
| Report sensitivity | `<classification or handling note>` |
| Network-backed checks | `<approved and used, denied, or not requested>` |
| Overall risk | `<Critical, High, Medium, Low, or Informational>` |

> This is a point-in-time repository review. It does not prove absence of
> vulnerabilities or certify compliance.

## 1. Executive summary

### Overall assessment

<One short paragraph describing the most important security conclusion,
exposure, and confidence.>

### Risk counts

| Severity | Confirmed |
| --- | ---: |
| Critical | `<count>` |
| High | `<count>` |
| Medium | `<count>` |
| Low | `<count>` |
| Informational | `<count>` |

Also record:

- Needs validation: `<count>`
- Defense-in-depth concerns: `<count>`

### Top actions

1. `<Highest-value action and why it matters>`
2. `<Second action>`
3. `<Third action>`

### Leadership implications

- `<Business, operational, customer, or regulatory implication>`
- `<Decision or ownership needed>`
- `<Important uncertainty>`

## 2. Scope and limitations

### Included

- `<Path, component, or concern>`

### Excluded

- `<Path, component, live system, or concern, with reason>`

### Assumptions

- `<Deployment, identity, data, attacker, or configuration assumption>`

### Limitations

- `<Unavailable runtime evidence, tool, environment, or time constraint>`

## 3. System and threat summary

### System shape

<Brief description of components, entry points, data stores, external
dependencies, deployment model, and security boundaries.>

### Sensitive assets and operations

| Asset or operation | Why it matters | Primary controls |
| --- | --- | --- |
| `<asset>` | `<impact>` | `<observed controls>` |

### Threat actors and capabilities

- `<Actor and relevant capability>`

### Entry points and trust boundaries

- `<Entry point or boundary and the data/control crossing it>`

### Prioritized abuse cases

1. `<Abuse case>`
2. `<Abuse case>`

## 4. Methodology

### Review activities

- repository and architecture mapping
- lightweight threat modeling
- manual control and source-to-sink tracing
- authentication, authorization, tenancy, and business-logic review
- dependency, build, CI/CD, container, IaC, and configuration review
- safe local verification with approved tools
- contextual validation and false-positive triage
- root-cause and sibling-instance analysis

Remove activities that were not performed.

### Standards used

| Standard | Use |
| --- | --- |
| CWE | Root-cause classification |
| CVSS v4.0 | Technical severity when evidence supports scoring |
| OWASP ASVS | Versioned mapping for applicable web controls |
| NIST SSDF | Systemic development and remediation themes |

Record exact versions and source URLs when verified.

### Commands and tools

| Command or tool | Version/configuration | Purpose | Result or limitation |
| --- | --- | --- | --- |
| `<command or tool>` | `<version>` | `<purpose>` | `<summary>` |

Do not include raw output containing sensitive data.

## 5. Findings at a glance

| ID | Severity | Confidence | Priority | Title | Affected area | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `SEC-001` | `<level>` | `<level>` | `<priority>` | `<title>` | `<component>` | `Confirmed` |

Sort confirmed findings by remediation priority and severity.

## 6. Detailed findings

Repeat this section for each confirmed finding.

### SEC-001 — <Concise finding title>

| Field | Value |
| --- | --- |
| Status | `Confirmed security finding` |
| Severity | `<Critical, High, Medium, Low, or Informational>` |
| Confidence | `<High, Medium, or Low>` |
| Remediation priority | `<Now, Next, or Later, with rationale>` |
| Affected components | `<components>` |
| Primary locations | `<path:line, function, or configuration key>` |
| CWE | `<precise CWE ID and name, or None>` |
| OWASP ASVS | `<versioned requirement IDs, or Not applicable>` |
| CVSS v4.0 | `<score and full vector, or Not scored>` |
| Related systemic theme | `<NIST SSDF practice or None>` |

#### Summary

<What is wrong and why it is security relevant.>

#### Evidence

- `<path/to/file.ext:line — observed behavior>`
- `<caller, guard, control, or sibling location>`

Use short, redacted excerpts only when they improve understanding.

#### Reachability and prerequisites

<Explain attacker control, call or data flow, required privileges,
configuration assumptions, and compensating controls.>

#### Impact

- Technical: `<confidentiality, integrity, availability, or control impact>`
- Business: `<repository-specific consequence or stated uncertainty>`

#### Safe reproduction or reasoning

<Provide a non-destructive local check or a clear reasoning chain. Do not
provide instructions for attacking live targets.>

#### Root cause

<Describe the underlying weakness rather than only the symptom or impact.>

#### Remediation

1. `<Smallest root-cause correction>`
2. `<Required defense-in-depth or migration step>`
3. `<Operational follow-up if applicable>`

#### Validation

- `<Regression test or verification step>`
- `<Negative case>`
- `<Sibling-instance search>`

#### Assumptions and uncertainty

- `<Anything that could change the classification or severity>`

## 7. Needs validation

These items are not confirmed findings and are excluded from confirmed counts.

| ID | Potential risk | Missing evidence | How to resolve | Possible impact |
| --- | --- | --- | --- | --- |
| `VAL-001` | `<candidate>` | `<runtime/config/context gap>` | `<safe validation>` | `<if confirmed>` |

## 8. Defense-in-depth and quality concerns

| ID | Concern | Benefit | Recommendation |
| --- | --- | --- | --- |
| `HARD-001` | `<concern>` | `<risk reduction>` | `<change>` |

Do not inflate these items into vulnerabilities.

## 9. Validated strengths

List only controls that were directly inspected or tested.

- `<Control and supporting evidence>`
- `<Security test or safe default>`

Absence of an item here does not mean the control is absent.

## 10. Systemic themes

Describe repeated causes or process gaps that affect multiple findings.

| Theme | Evidence | Risk | Recommended systemic action |
| --- | --- | --- | --- |
| `<theme>` | `<finding IDs or locations>` | `<effect>` | `<action>` |

Use NIST SSDF mappings here when applicable.

## 11. Remediation roadmap

### Now

- `<Critical/high-priority action, owner suggestion, and validation gate>`

### Next

- `<Medium-term control or recurring root-cause correction>`

### Later

- `<Lower-priority hardening or process improvement>`

Ordering must reflect exposure, severity, confidence, business impact,
dependencies, and remediation effort—not severity alone.

## 12. Coverage ledger

| Review area | Status | Evidence reviewed | Findings or notes | Limitation |
| --- | --- | --- | --- | --- |
| Attack surface and trust boundaries | `<status>` | `<paths/components>` | `<IDs or None>` | `<limitation>` |
| Authentication and sessions | `<status>` | `<paths/components>` | `<IDs or None>` | `<limitation>` |
| Authorization and tenancy | `<status>` | `<paths/components>` | `<IDs or None>` | `<limitation>` |
| Business logic and state transitions | `<status>` | `<paths/components>` | `<IDs or None>` | `<limitation>` |
| Input handling and injection | `<status>` | `<paths/components>` | `<IDs or None>` | `<limitation>` |
| File, process, network, and serialization | `<status>` | `<paths/components>` | `<IDs or None>` | `<limitation>` |
| Secrets and cryptography | `<status>` | `<paths/components>` | `<IDs or None>` | `<limitation>` |
| Sensitive data and logging | `<status>` | `<paths/components>` | `<IDs or None>` | `<limitation>` |
| Availability and resource limits | `<status>` | `<paths/components>` | `<IDs or None>` | `<limitation>` |
| Dependencies and supply chain | `<status>` | `<paths/components>` | `<IDs or None>` | `<limitation>` |
| CI/CD and release controls | `<status>` | `<paths/components>` | `<IDs or None>` | `<limitation>` |
| Containers, IaC, and deployment | `<status>` | `<paths/components>` | `<IDs or None>` | `<limitation>` |
| Auditability and security tests | `<status>` | `<paths/components>` | `<IDs or None>` | `<limitation>` |

Allowed statuses: `Reviewed`, `Limited`, `Not reviewed`, and `Not applicable`.

## 13. Residual risk and unreviewed areas

- `<Risk that remains after recommended remediation>`
- `<Area not reviewed or only partially reviewed>`
- `<Production or runtime assumption that repository evidence cannot confirm>`
- `<Third-party or organizational control outside repository scope>`

## Appendix A — Severity rubric

- **Critical:** Plausible compromise with catastrophic or systemic impact, such
  as broad privileged control, major cross-tenant compromise, or exposure of
  highly sensitive assets with few practical barriers.
- **High:** Serious confidentiality, integrity, or availability impact with a
  plausible attack path, but narrower scope or stronger prerequisites than
  Critical.
- **Medium:** Meaningful security impact requiring conditions, limited access,
  or chaining, or affecting a constrained scope.
- **Low:** Limited direct impact or difficult exploitation, but a concrete
  security weakness exists.
- **Informational:** Security-relevant observation with no demonstrated
  vulnerability.

## Appendix B — Confidence rubric

- **High:** The affected path and impact were directly established through
  repository evidence or safe reproduction.
- **Medium:** Strong evidence exists, but an important runtime or deployment
  assumption remains.
- **Low:** The concern is plausible but depends on substantial unavailable
  context. Prefer `Needs validation` unless the vulnerability itself is still
  established.

## Appendix C — Candidate disposition

Record only rejected or reclassified candidates that are important for future
review or explain a potentially surprising conclusion.

| Candidate | Disposition | Rationale |
| --- | --- | --- |
| `<candidate>` | `<False positive, Needs validation, or Defense-in-depth>` | `<reason>` |

## Appendix D — References

- `<Official standard, advisory, or repository document>`
