# Specification Profiles and Detail Levels

Use this reference to adapt the specification to the request instead of forcing every request into the same document. Select one primary profile, add secondary profiles only when materially relevant, and record the choice in the confirmation brief and final specification.

## Detail levels

### Concept

Use for stakeholder alignment and early product discovery.

Required depth:

- problem, users, goals, non-goals, and scope boundaries
- primary journeys or use cases
- highest-priority functional requirements
- critical non-functional constraints
- measurable success signals
- major assumptions, risks, decisions, and open questions
- lightweight traceability for every Must requirement

Do not add implementation-level contract detail unless it is already a constraint.

### Build Ready — default

Use when architecture, planning, and implementation should proceed from the specification without rediscovering product behavior.

Required depth:

- complete functional and applicable non-functional requirements
- happy paths, alternatives, boundary cases, and failure/recovery behavior
- data, interface, integration, permission, compatibility, and rollout requirements
- measurable acceptance criteria and verification methods
- complete evidence and decision traceability

### High Assurance

Use for regulated, security-sensitive, safety-relevant, high-cost, highly available, or difficult-to-reverse work.

Includes Build Ready plus:

- data classification, privacy, residency, retention, deletion, and legal/compliance basis
- threat, abuse, misuse, segregation-of-duty, and audit requirements
- quantitative reliability, recovery, performance, and capacity requirements
- migration, rollback, business continuity, incident, and operational ownership requirements
- control-to-requirement and requirement-to-verification traceability
- explicit approvers and evidence needed for launch readiness

## Profiles

### Product or user-facing feature

Emphasize:

- personas, jobs, journeys, and permissions
- UI states: loading, empty, partial, error, success, disabled, and offline where relevant
- validation, destructive actions, undo/cancellation, notifications, and user feedback
- accessibility, localization, responsive behavior, and content expectations
- product analytics, success metrics, adoption, and support implications

### API or integration

Emphasize:

- consumers/providers and trust boundaries
- request/response or event semantics and schema ownership
- authentication, authorization, scopes, and credential lifecycle requirements
- versioning, compatibility, pagination, rate limits, quotas, timeouts, retries, and idempotency
- error taxonomy, partial failure, ordering, deduplication, and recovery
- sandbox/testing, observability, deprecation, and support expectations

### Data system or pipeline

Emphasize:

- sources, sinks, ownership, lineage, schema, and data contracts
- freshness, completeness, validity, uniqueness, reconciliation, and quality thresholds
- late, duplicate, malformed, missing, and out-of-order data
- backfill, replay, correction, retention, deletion, residency, and classification
- throughput, latency, recovery objectives, auditability, and access controls

### CLI or developer tool

Emphasize:

- command grammar, arguments, flags, defaults, and configuration precedence
- stdin/stdout/stderr behavior, output formats, exit codes, and non-interactive use
- idempotency, dry-run, cancellation, progress, partial completion, and recovery
- platform/runtime compatibility and backward compatibility
- diagnostics, logs, help text, examples, automation, and scripting stability

### Infrastructure or operational capability

Emphasize requirements rather than prematurely selecting topology:

- service levels, capacity, latency, availability, and recovery objectives
- tenancy, isolation, regions/zones, residency, and environment boundaries
- deploy, rollback, maintenance, backup/restore, disaster recovery, and change windows
- monitoring, alerts, runbooks, ownership, escalation, and cost controls
- security, access, audit, policy, and compliance constraints

### Workflow or automation

Emphasize:

- actors, triggers, states, transitions, approvals, and segregation of duties
- scheduling, concurrency, duplicate triggers, cancellation, retries, and compensation
- timeouts, escalation, manual override, resume/restart, and audit history
- notification requirements and operator visibility
- malformed input, unavailable dependency, and partial-completion behavior

### Compliance-, privacy-, or security-sensitive system

Emphasize:

- applicable jurisdiction, policy, control framework, and authoritative owner
- data classification, purpose limitation, consent/legal basis, minimization, and subject rights
- identity, privilege, audit, evidence retention, tamper resistance, and incident response
- threat/abuse cases, prohibited behavior, misuse controls, and break-glass behavior
- required reviews, approvers, attestations, and launch evidence

## Selection rules

- Infer a provisional primary profile and detail level from Refined Ask v0.
- Confirm both during the first Q&A round and explain the recommendation.
- Use the lowest detail level that safely supports the next decision or handoff.
- Combine profiles only when each adds material requirements. Avoid copying every profile checklist.
- Record omitted profile concerns as `Not applicable` only when omission could otherwise look accidental.
