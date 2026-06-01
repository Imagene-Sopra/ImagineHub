---
name: Functional Analysis Brief
description: Analyze a feature request from a product perspective and return clear behavior, acceptance criteria, edge cases, and impacted views.
argument-hint: Describe the feature request and expected user outcome.
agent: "Functional Analyst"
---
Analyze the requested feature in ImagineHub from a functional perspective.

Request:
{{input}}

Produce the result in this exact structure:
1. Functional goal
2. User-facing behavior
3. Acceptance criteria (numbered)
4. Edge cases and risks
5. Impacted views/components
6. Open questions to clarify before implementation

Constraints:
- Keep behavior consistent with existing flows in Dashboard, Initiatives, Projects, Roadmap, Calendar, Mailbox, and Imagine.
- Prefer incremental changes over broad redesigns.
- If the request affects task scoring or warning thresholds, explicitly call out Roadmap and Dashboard sync needs.
