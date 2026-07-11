# Research and Evidence Protocol

Use this protocol for subagent research, parent synthesis, evidence verification, and citation in `SPECS.md`.

## Evidence levels

- **E1 — Direct/primary:** observed repository behavior, executable schema/interface, user-confirmed decision, law/regulation text, official standard, or first-party API contract.
- **E2 — Authoritative supporting:** official documentation, release notes, vendor limits, maintained project documentation, or authoritative domain guidance.
- **E3 — Reputable secondary:** credible analysis, established industry guidance, benchmark, or expert synthesis that is not the primary authority.
- **E4 — Inference:** reasoned implication, convention, or hypothesis not directly established by stronger evidence.

Use E1/E2 for mandatory requirements whenever available. E3 can provide context. E4 must be labeled as an assumption or user decision candidate, never as a confirmed fact.

## Source precedence and conflicts

Resolve conflicts using this order while respecting product authority:

1. explicit, current user/stakeholder decision for desired behavior
2. binding law, regulation, policy, or contractual constraint
3. observed current system behavior and executable contracts
4. current official documentation or standard
5. reputable secondary evidence
6. inference

A user can choose desired behavior but cannot override an undisclosed binding constraint or change an observed fact by preference. Record current behavior separately from desired behavior. When authoritative sources conflict, preserve the contradiction, investigate version/scope differences, and ask the correct authority rather than averaging claims.

## Freshness

For time-sensitive evidence, record:

- publication/update date when available
- access date
- applicable product/API/version/region
- whether the claim is expected to change

Recheck pricing, quotas, supported versions, API behavior, regulations, and vendor capabilities close to confirmation.

## Research ledger schema

Assign each source or finding a stable `EVD-###` ID and record:

| Field | Meaning |
|---|---|
| Evidence ID | Stable `EVD-###` identifier |
| Finding | Atomic claim supported by the evidence |
| Level | E1 / E2 / E3 / E4 |
| Source | URL, file path/range, user decision ID, or supplied artifact |
| Product/version/region | Applicable product, API, version, jurisdiction, or region |
| Publication/update date | Source publication or last-update date when available |
| Access date | Date the source was checked |
| Volatility | Stable / Change-prone, with recheck trigger when relevant |
| Confidence | High / Medium / Low with reason |
| Scope | Where the finding applies and does not apply |
| Requirement implication | Candidate requirement/constraint IDs |
| Contradictions | Conflicting evidence or `None` |
| Remaining question | What still requires research or user decision |

Do not cite a source for a broader claim than it supports.

## Structured subagent research output

When structured output is supported, require an array matching this conceptual schema:

```json
{
  "track": "repository | external | product | risk | domain-specific",
  "findings": [
    {
      "claim": "Atomic finding",
      "evidenceLevel": "E1 | E2 | E3 | E4",
      "sources": [
        {
          "location": "URL or file path/range",
          "title": "Source title when applicable",
          "productVersionRegion": "Applicable product/API/version/jurisdiction/region",
          "publicationOrUpdateDate": "Source date when available",
          "accessDate": "YYYY-MM-DD",
          "volatility": "stable | change-prone, plus recheck trigger when relevant"
        }
      ],
      "confidence": "high | medium | low",
      "scope": "Applicability boundaries",
      "requirementImplication": "Potential requirement or constraint",
      "contradictions": [],
      "remainingQuestions": []
    }
  ],
  "gaps": [],
  "stopReason": "Why further research is unlikely to change the spec"
}
```

If structured output is unavailable, require the same headings in Markdown. Reject outputs that provide recommendations without evidence or fail to distinguish fact from inference.

## Research budgets

Adapt research to detail and risk:

- **Concept:** usually 2 distinct tracks; verify only facts that influence scope or feasibility.
- **Build Ready:** usually 2–4 tracks covering current state, external/domain facts, and risk/testability.
- **High Assurance:** broader domain/control research and at least one independent authority check for critical claims.

Stop when:

- material questions have authoritative evidence or are correctly routed to user/authority decisions
- additional sources repeat established findings
- remaining uncertainty is explicitly represented as an assumption, risk, or open question
- the research budget is reached without a safety/compliance blocker

Continue or escalate when a binding constraint, security/privacy issue, contradiction, or unsupported Must requirement remains.

## Verification packet

Fresh verifiers receive only what they need:

- Refined Ask
- selected profile and detail level
- confirmed `DEC-###` decisions
- goals, non-goals, scope, requirements, and acceptance criteria
- research ledger with evidence references
- assumptions, risks, and open questions

Withhold the drafting agent's conclusions and persuasive reasoning. Ask verifiers to inspect cited repository files or primary sources directly where possible.

## Verification output

Require:

- finding ID
- severity: Blocker / Major / Minor / Suggestion
- affected requirement/decision/evidence IDs
- exact evidence
- why it matters
- smallest safe correction
- whether user input is required

The parent resolves objective defects, records rejected findings with rationale when material, and routes product/scope decisions to the user.
