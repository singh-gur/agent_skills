# <Specification Title>

- **Status:** Draft | Proposed | Approved | Superseded
- **Version:** <semantic or sequential version>
- **Profile:** <primary profile; secondary profiles if applicable>
- **Detail level:** Concept | Build Ready | High Assurance
- **Owner:** <person/team or Unassigned>
- **Approver:** <person/role or Pending>
- **Created:** <YYYY-MM-DD>
- **Last updated:** <YYYY-MM-DD>
- **Source request:** <short reference or summary>
- **Supersedes:** <version/path or Not applicable>

## Revision History

| Version | Date | Author | Status | Material changes |
|---|---|---|---|---|
| <version> | <YYYY-MM-DD> | <name/role> | <status> | <summary> |

## 1. Executive Summary

<What is being specified, for whom, why it matters, and the approved scope.>

## 2. Problem Statement

<Current state, pain/opportunity, evidence, and consequences of not acting.>

## 3. Goals

| ID | Goal | Success signal | Source |
|---|---|---|---|
| G-001 | <outcome> | <measurable signal> | <DEC/EVD/request reference> |

## 4. Non-Goals

| ID | Explicitly excluded behavior/outcome | Rationale | Source |
|---|---|---|---|
| NG-001 | <non-goal> | <why excluded> | <decision reference> |

## 5. Users and Stakeholders

| User/stakeholder | Need or responsibility | Permissions/authority | Impact |
|---|---|---|---|
| <role> | <need> | <authority> | <impact> |

## 6. Scope

### 6.1 In Scope

- <capability or behavior>

### 6.2 Out of Scope

- <explicit boundary linked to NG IDs where applicable>

## 7. User Journeys and Use Cases

### UC-001 — <Use case name>

- **Actor:** <role>
- **Trigger:** <event>
- **Preconditions:** <state>
- **Primary flow:** <ordered observable behavior>
- **Alternative/failure flows:** <behavior>
- **Outcome:** <observable result>
- **Related requirements:** <FR/NFR IDs>

## 8. Functional Requirements

| ID | Priority | Normative requirement | Rationale/value | Drivers | Sources | Acceptance criteria | Dependencies |
|---|---|---|---|---|---|---|---|
| FR-001 | Must | The system must… | <why> | G-001 / CON-### / RISK-### | DEC-001, EVD-001 | AC-001 | <IDs/None> |

## 9. Non-Functional Requirements

| ID | Priority | Quality attribute and requirement | Drivers | Metric/target | Measurement context | Verification method | Sources | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|
| NFR-001 | Must | The system must… | G-### / CON-### / RISK-### | <number/unit/tolerance> | <window/workload/environment> | <method> | <request/DEC/EVD IDs> | AC-### |

## 10. Data, Interfaces, and Integrations

### 10.1 Data

<Ownership, classification, inputs/outputs, lifecycle, retention/deletion, migration, and quality requirements or Not applicable with reason.>

### 10.2 Interfaces and Contracts

<Externally meaningful contract, compatibility, error, versioning, and dependency requirements without speculative implementation design.>

### 10.3 Integrations

<Providers/consumers, trust boundaries, limits, failure behavior, and ownership.>

## 11. Edge Cases and Failure Behavior

| Scenario | Expected behavior | Recovery/operator behavior | Related IDs |
|---|---|---|---|
| <invalid/boundary/dependency failure> | <observable result> | <recovery> | <FR/AC IDs> |

## 12. Security, Privacy, Compliance, and Accessibility

<Applicable requirements grouped by concern. Use `Not applicable` with a reason where omission could be mistaken for oversight.>

## 13. Constraints and Dependencies

| ID | Constraint/dependency | Type | Owner/source | Impacted IDs | Consequence |
|---|---|---|---|---|---|
| CON-001 | <constraint> | <technical/business/policy/timing/etc.> | <source> | <IDs> | <impact> |

## 14. Acceptance Criteria

### AC-001 — <Observable outcome>

- **Covers:** FR-001
- **Precondition/Given:** <state>
- **Action/When:** <event>
- **Expected/Then:** <observable result>
- **Measurement context:** <dataset/window/environment if applicable>
- **Verification method:** <automated/manual/measurement/inspection/audit>

## 15. Success Metrics

| Metric | Baseline | Target | Window | Owner | Related goals |
|---|---|---|---|---|---|
| <outcome metric> | <known/unknown> | <target> | <period> | <owner> | G-001 |

## 16. Assumptions

| ID | Assumption | Why it matters | Owner/resolver | Validation method/deadline | Impacted IDs | Status |
|---|---|---|---|---|---|---|
| ASM-001 | <belief> | <impact> | <owner> | <method/trigger> | <IDs> | Pending/Validated/Rejected |

## 17. Risks and Mitigations

| ID | Risk | Likelihood/impact | Mitigation or response | Owner | Related IDs |
|---|---|---|---|---|---|
| RISK-001 | <risk> | <rating with basis> | <response> | <owner> | <IDs> |

## 18. Open Questions

Only non-blocking questions may remain in an approved specification.

| ID | Question | Blocking? | Owner | Decision point | Impacted IDs |
|---|---|---|---|---|---|
| OQ-001 | <question> | No | <owner> | <date/trigger> | <IDs> |

## 19. Decision Log

| ID | Date | Decision | Rationale | Alternatives considered | Approver | Impacted IDs |
|---|---|---|---|---|---|---|
| DEC-001 | <YYYY-MM-DD> | <decision> | <reason> | <options> | <role> | <IDs> |

## 20. Deferred Design Decisions

<Architecture or implementation choices intentionally deferred to later design/planning, with constraints the future decision must satisfy. Do not disguise unresolved product behavior as a design decision.>

## 21. Research and Evidence

| ID | Finding | Level | Source | Product/version/region | Published/updated | Accessed | Volatility | Confidence | Scope/implication |
|---|---|---|---|---|---|---|---|---|---|
| EVD-001 | <atomic finding> | E1/E2/E3/E4 | <URL/file/decision> | <applicability> | <date/unknown> | <YYYY-MM-DD> | <stable/change-prone + recheck> | <level/reason> | <scope> |

## 22. Traceability Matrix

| Source request / decision | Driver (G/CON/RISK) | Requirement | Acceptance criterion | Evidence | Status |
|---|---|---|---|---|---|
| <request item or DEC ID> | G-001 / CON-### / RISK-### | FR-001 | AC-001 | EVD-001 | Confirmed/Assumption/Open |

## 23. Approval

- **Confirmation brief approved by:** <person/role>
- **Approval date:** <YYYY-MM-DD>
- **Residual assumptions/open questions accepted:** <IDs or None>
- **Verification summary:** <review tracks and resolved findings>
