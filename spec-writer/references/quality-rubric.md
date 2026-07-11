# Specification Quality Rubric

Use this rubric during synthesis, delegated verification, confirmation, and the final completion check.

## Requirement quality

Every requirement must be:

- **Necessary:** supports an approved goal, constraint, risk control, or user need.
- **Atomic:** contains one independently testable behavior or quality condition.
- **Unambiguous:** has one reasonable interpretation and uses defined domain terms.
- **Feasible:** does not conflict with verified constraints; uncertainty is labeled.
- **Testable:** has observable pass/fail evidence.
- **Traceable:** links to a source or confirmed decision and applicable acceptance criteria.
- **Consistent:** does not contradict scope, non-goals, or another requirement.
- **Solution-neutral:** describes required behavior or outcome unless a specific implementation is an approved constraint.

Avoid `fast`, `secure`, `scalable`, `easy`, `seamless`, `robust`, `user-friendly`, `real-time`, `appropriate`, and similar subjective terms unless the specification defines a measurable threshold or observable meaning.

## Requirement record

Each `FR-###` and `NFR-###` should contain:

- normative statement using **must**, **should**, or **may**
- priority: Must / Should / Could / Won't for this scope
- rationale or user value
- driver IDs: one or more `G-###`, `CON-###`, or `RISK-###`
- source IDs: raw/refined request item, `DEC-###`, or `EVD-###`
- linked acceptance criterion IDs
- dependencies or conflicts when material
- verification method or evidence type

## Acceptance-criteria quality

Every Must requirement needs at least one measurable acceptance criterion. Add the following when applicable rather than mechanically duplicating criteria:

- happy-path result
- negative, invalid-input, or permission result
- boundary/limit result
- dependency-failure and recovery result
- cancellation, retry, duplicate, timeout, or partial-completion result
- measurable quality threshold for an NFR

An acceptance criterion must state:

- precondition or relevant state
- action/event/condition
- observable expected result
- measurement window, environment, or dataset when relevant
- verification method: automated test, manual scenario, inspection, measurement, audit evidence, or other named method

Use Given/When/Then when it makes state and behavior clearer, not as mandatory ceremony.

## Quantitative NFR rule

A Must or Should NFR must define, when applicable:

- metric and unit
- target and allowable tolerance
- percentile or aggregation method
- measurement window
- workload, environment, or dataset
- verification method

If a number cannot yet be justified, record it as an assumption or open decision with an owner/validation path; do not invent a target.

## Assumption and open-question quality

Every assumption must include:

- what is believed
- why it matters
- owner or authoritative resolver
- validation method
- decision deadline or trigger when material
- impacted requirement IDs

Every open question must be classified:

- **Blocking:** prevents confirmation or finalization.
- **Non-blocking:** may remain in an approved spec with owner, due point, and affected IDs.

## Verification severity

Verifier findings use:

- **Blocker:** unresolved contradiction, missing product decision, unsafe claim, or untestable Must requirement that prevents approval.
- **Major:** material completeness, traceability, ambiguity, or edge-case gap that must be fixed before confirmation.
- **Minor:** localized clarity or consistency issue that does not change scope.
- **Suggestion:** optional improvement; never block approval.

Each finding must name affected IDs, evidence, impact, and the smallest safe correction. Reviewers do not make product decisions.

## Approval gates

The confirmation brief cannot be approved until all gates pass:

- zero Blocker or unresolved Major verification findings
- zero unresolved blocking questions
- 100% of Must requirements link to at least one source and acceptance criterion
- every requirement has a driver link to a `G-###`, `CON-###`, or `RISK-###`
- every Must/Should NFR has a measurable threshold and verification method, or is explicitly recorded as an approved assumption/open decision
- no goal, non-goal, scope item, or requirement contradicts another
- no undefined term changes the interpretation of a requirement
- every assumption has an owner or validation path
- all citations support the attached claims and time-sensitive evidence includes an access/publication date
- the traceability matrix has no orphan Must requirement or acceptance criterion

## Final document checks

- Metadata identifies profile, detail level, status, version, owner/approver, and update date.
- Revision history explains material changes.
- Deferred design decisions are separated from requirements.
- Optional sections are omitted cleanly; required review areas use `Not applicable` only with a reason.
- The final file matches the approved confirmation brief.
- Markdown headings, internal ID references, links, and tables are valid and readable.
