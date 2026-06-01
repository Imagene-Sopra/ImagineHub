---
name: Technical Design and Impact
description: Create a technical implementation plan with file-level impact, data considerations, risks, and validation steps.
argument-hint: Describe the technical change, constraints, and expected quality attributes.
agent: "Technical Architect"
---
Design the implementation approach for this change in ImagineHub.

Change request:
{{input}}

Return the output in this exact structure:
1. Technical approach summary
2. File-level impact map
3. Data model/query impact
4. Reuse/refactor opportunities
5. Risks and mitigations
6. Validation checklist (commands + manual checks)

Requirements:
- Keep compatibility with current `src/types.ts` contracts unless change is explicitly requested.
- Minimize regressions in realtime listeners and routing.
- For UI changes, preserve responsive behavior.
- If duplicated logic exists, propose a shared helper extraction.
