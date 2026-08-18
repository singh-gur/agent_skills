---
name: cybersec-review
description: Performs a deep, threat-driven cybersecurity review of a software repository and produces a layered Markdown report for leaders and engineers. Use when asked for a deep security review, secure code review, repository security audit, vulnerability assessment, or review of source, dependencies, CI/CD, infrastructure-as-code, containers, and configuration. Not for unauthorized live penetration testing, incident response, compliance certification, or automatic remediation.
compatibility: Requires repository read access and permission to write a Markdown report. Deeper validation benefits from local build, test, and security tools. Network-backed research or advisory checks require explicit user approval.
metadata:
  author: gurbakhshish
  sources: OWASP, MITRE CWE, FIRST CVSS, and NIST SSDF
  spec: https://agentskills.io/specification
---

# Cybersecurity Review

Perform a deep, threat-driven review of a software repository and produce an
evidence-based report. Review only: do not modify application source,
configuration, infrastructure, tests, or dependencies while this skill is
active.

The only repository file this workflow may create or modify is the approved
report file.

## Outcomes

Produce:

1. a concise decision layer for leaders
2. detailed, reproducible findings for engineers
3. a coverage ledger showing what was reviewed, limited, excluded, or not
   applicable
4. a prioritized remediation roadmap
5. explicit assumptions, unresolved questions, and residual risks

A repository review is point-in-time evidence, not proof that vulnerabilities
do not exist.

## Non-negotiable behavior

- Confirm the review target and authorization when they are not already clear.
  A user-provided local repository normally establishes authorization for
  repository-only analysis, but never for deployed systems or external
  accounts.
- Never access live applications, cloud accounts, clusters, third-party
  services, or production data as part of this skill.
- Never retrieve, validate, reuse, transmit, or print credentials or secret
  values.
- Do not read known sensitive local files such as `.env` files, credential
  stores, private keys, kubeconfig files, or cloud authentication files.
- Do not upload repository content, findings, hashes, or artifacts to external
  services.
- Ask before installing a tool, downloading dependencies, enabling package
  install hooks, or using a network-backed advisory or research service.
- Inspect unfamiliar commands before running them. Do not execute commands
  that may deploy, publish, alter external state, destroy data, or invoke
  untrusted install hooks.
- Treat scanner output as leads, not findings.
- Do not claim compliance, certification, exhaustive coverage, or absence of
  vulnerabilities.
- Do not fix findings during the review. Finish the report first; remediation
  requires a separate user request.

If safe review cannot continue within these boundaries, stop and explain the
limitation instead of weakening them.

## Intake

Before reviewing, establish or infer:

- repository root and requested revision, branch, or commit
- included and excluded paths
- intended deployment model and exposed interfaces
- sensitive assets and important business operations
- authentication, authorization, tenancy, and trust assumptions
- known concerns or prior findings
- available build, test, lint, and security commands
- whether network-backed research and advisory checks are permitted
- report destination

Ask only for information that cannot be learned safely from the repository.
State assumptions when the user cannot provide an answer.

Default the report path to `SECURITY_REVIEW.md`. Ask before overwriting an
existing file.

## Review workflow

### 1. Record the review snapshot

Record:

- repository name and root
- commit hash when version control is available
- branch or revision
- whether the working tree contains uncommitted changes
- review date
- relevant languages, frameworks, package managers, and build systems
- tool and time limitations
- approved network access
- explicit exclusions

Do not inspect unrelated machine configuration or authentication state.

### 2. Map the repository

Identify the security-relevant shape of the system:

- executable entry points and externally reachable interfaces
- services, packages, modules, and trust boundaries
- authentication, session, authorization, and tenant-isolation controls
- data stores, queues, caches, filesystems, and sensitive data flows
- parsers, serializers, templates, interpreters, and command execution
- outbound network access and third-party integrations
- dependencies, lockfiles, build scripts, and generated artifacts
- CI/CD workflows, release automation, containers, IaC, and deployment
  configuration
- logging, audit, monitoring, and error handling
- tests covering important controls

Distinguish observed repository facts from assumptions about runtime
configuration or production behavior.

### 3. Build a lightweight threat model

Capture:

- assets and sensitive operations
- legitimate actors and likely attacker capabilities
- entry points and externally controlled inputs
- components and data flows
- trust boundaries
- important security controls
- prioritized abuse cases
- deployment assumptions that affect reachability or impact

Use whichever lightweight method best fits the repository, such as STRIDE,
abuse cases, attack trees, or direct asset–entry point–trust boundary analysis.
The method matters less than making the reasoning explicit.

### 4. Create the coverage plan

Create a coverage ledger before reporting findings. Mark each relevant area as
`Not reviewed`, `In progress`, `Reviewed`, `Limited`, or `Not applicable`.

Evaluate at least these areas when applicable:

- attack surface and trust-boundary crossings
- authentication, account recovery, and session management
- authorization, object access, role enforcement, and tenant isolation
- business workflows, state transitions, replay, races, and abuse resistance
- input validation, injection, output encoding, and unsafe interpretation
- serialization, parsing, file handling, process execution, and outbound
  requests
- secrets, key handling, randomness, cryptography, and certificate validation
- sensitive-data storage, transport, retention, logging, and privacy
- error handling, fail-open behavior, availability, and resource limits
- dependency, build, provenance, and software supply-chain risks
- CI/CD permissions, artifact handling, and release controls
- container, IaC, cloud, and deployment security
- auditability, monitoring, and security-control tests

Prioritize externally reachable paths, privilege boundaries, cross-tenant
operations, sensitive state changes, money movement, credential handling,
untrusted parsing, and deployment controls.

Do not force irrelevant checks onto a repository merely to complete a generic
checklist.

### 5. Perform the manual review

Use multiple focused passes:

1. **Architecture and control pass**
   - Check whether security controls exist at the correct trust boundaries.
   - Look for bypass paths, inconsistent enforcement, unsafe defaults, and
     controls implemented only in clients.

2. **Data-flow pass**
   - Trace attacker-controlled input from entry points through validation and
     transformation to sensitive sinks.
   - Trace callers and sibling paths before concluding that a guard is
     effective or missing.
   - Check filesystem, process, query, template, serialization, redirect,
     network, and logging sinks as applicable.

3. **Identity and business-logic pass**
   - Trace authentication, authorization, session, tenant, workflow, and
     state-transition behavior end to end.
   - Review negative cases, replay, ordering, concurrency, approval boundaries,
     ownership changes, and recovery flows.

4. **Platform and supply-chain pass**
   - Review dependencies, build scripts, CI/CD, containers, IaC, deployment
     defaults, secret references, release provenance, and privileged
     automation.

5. **Failure and abuse pass**
   - Consider malformed input, unexpected sequencing, unavailable
     dependencies, partial failure, excessive resource use, and malicious but
     syntactically valid behavior.

Search for sibling instances whenever a root cause is found. Deduplicate
findings by root cause while listing all confirmed affected locations.

### 6. Use automation carefully

Use existing local tools only when they materially improve evidence:

- project tests and security-focused tests
- compiler and type checks
- existing linters or static analyzers
- existing secret, dependency, container, or IaC scanners
- lockfile and package-manager audit commands
- repository history when it can be inspected without exposing sensitive data

Before execution:

- inspect the command and project scripts it invokes
- identify possible network, install-hook, deployment, or mutation behavior
- obtain permission for network access or dependency installation
- configure redaction when output could contain sensitive values

Never convert raw tool output directly into report findings. Validate
reachability, context, compensating controls, and false positives manually.

If optional read-only helper agents are available, assign distinct review
domains and require evidence with exact paths. Keep one primary reviewer
responsible for threat modeling, reconciliation, severity, final findings, and
the report. Use a fresh challenge review for proposed Critical or High
findings when practical. Otherwise perform the same workflow sequentially.

### 7. Validate and classify candidates

Classify each candidate as one of:

- **Confirmed security finding** — concrete affected behavior, a plausible
  attack or failure path, sufficient evidence, and explicit assumptions
- **Needs validation** — potentially important, but runtime, configuration, or
  reachability evidence is missing
- **Defense-in-depth or quality concern** — worthwhile hardening that does not
  currently establish a security vulnerability
- **False positive** — the suspected path is blocked or inapplicable, with the
  reason recorded

Only confirmed findings belong in confirmed-finding counts. Keep unresolved
items in a separate `Needs validation` section.

For every proposed Critical or High finding, re-check:

- all relevant callers and guards
- attacker control and prerequisites
- runtime and deployment assumptions
- compensating controls
- the claimed impact
- sibling instances
- whether the evidence reveals sensitive data

Downgrade or reclassify rather than overstating uncertainty.

### 8. Assign severity, confidence, and mappings

Keep these concepts separate:

- **Severity** — technical impact and exploitability
- **Confidence** — strength and completeness of the evidence
- **Remediation priority** — repository-specific urgency, exposure, business
  impact, and effort

Use `Critical`, `High`, `Medium`, `Low`, or `Informational` severity and explain
the rationale.

Apply the selected practical standards mapping:

- Map the root cause to the most precise applicable CWE. Do not map merely to
  an impact, category, or broad view.
- Use CVSS v4.0 only when evidence supports the required metrics. Include both
  the score and full vector. Otherwise use qualitative severity rather than
  false precision.
- Cite versioned OWASP ASVS requirement identifiers only for applicable
  web-application controls.
- Use NIST SSDF practices for systemic development, verification, artifact,
  and root-cause themes rather than forcing them onto every finding.

When network-backed research is approved, verify current standard versions and
identifiers against official sources before citing them. Without network
permission, disclose version uncertainty and omit mappings that cannot be
verified safely.

Relevant primary sources:

- OWASP Secure Code Review Cheat Sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html
- OWASP Threat Modeling Cheat Sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html
- OWASP ASVS:
  https://owasp.org/www-project-application-security-verification-standard/
- OWASP WSTG Reporting:
  https://owasp.org/www-project-web-security-testing-guide/latest/5-Reporting/01-Reporting_Structure
- MITRE CWE mapping guidance:
  https://cwe.mitre.org/documents/cwe_usage/guidance.html
- FIRST CVSS v4.0:
  https://www.first.org/cvss/v4.0/specification-document
- NIST Secure Software Development Framework:
  https://csrc.nist.gov/pubs/sp/800/218/final

### 9. Produce the report

Read `references/report-template.md` before drafting.

For each confirmed finding, include:

- stable ID and concise title
- severity, confidence, and remediation priority
- affected components and exact `path:line` evidence
- root cause
- reachable control or data-flow explanation
- prerequisites and configuration assumptions
- technical and business impact
- safe reproduction steps or reasoning
- CWE and applicable standards mappings
- root-cause remediation
- validation and regression-test guidance
- sibling locations
- redacted supporting evidence

Use minimal code excerpts and redact sensitive material. Never include secret
values, access tokens, personal data, or weaponized live-target instructions.

Write the approved report path only after the review is complete. If writing
fails or is not possible, return the complete report in the conversation and
state why.

Then provide a concise chat summary containing:

- overall risk
- confirmed finding counts by severity
- the top three actions
- important limitations
- the report path

## Report quality gate

Before finishing, verify:

- the report target, revision, scope, exclusions, and limitations are explicit
- the threat model and coverage ledger agree with the reviewed repository
- confirmed counts match the detailed findings
- every confirmed finding has concrete repository evidence
- severity, confidence, and priority are not conflated
- uncertain candidates are not presented as confirmed vulnerabilities
- findings are deduplicated by root cause with sibling locations retained
- remediation addresses root causes and includes retest guidance
- no secret values or sensitive local data appear in the report
- scanner output has been interpreted rather than pasted
- residual risks and unreviewed areas are visible
- the report does not claim certification, exhaustive assurance, or proof of
  safety
- no repository file other than the approved report was modified

## Edge cases

- **No confirmed findings:** Say `No confirmed findings within the reviewed
  scope`; never say the repository is secure.
- **Large monorepository:** Preserve deep mode, prioritize by threat and trust
  boundary, and mark incomplete areas explicitly rather than pretending full
  coverage.
- **Missing runtime context:** Move affected candidates to `Needs validation`
  and explain what evidence would resolve them.
- **Unavailable build or scanner:** Continue manual review and record the
  limitation.
- **Dirty working tree:** Record that the report covers the observed working
  tree and identify the commit separately.
- **Generated or vendored code:** Review its provenance and exposure, but avoid
  line-by-line review unless it is modified locally or directly security
  critical.
- **Possible embedded secret:** Do not open or print it. Report only the type,
  location, context, and heavily redacted or non-reversible identifier when
  safely available.
- **Existing report path:** Ask before overwriting it.
