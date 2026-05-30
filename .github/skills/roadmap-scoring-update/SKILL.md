---
name: roadmap-scoring-update
description: Use when changing score formulas, thresholds, or warning/danger icon behavior and synchronizing logic between Roadmap and Dashboard.
---
# Skill: Roadmap and Dashboard Scoring Update

## Use When
- Score baseline/threshold rules change.
- Warning icon conditions change.

## Steps
1. Update shared scoring logic in target view(s).
2. Synchronize thresholds in both `src/views/Roadmap.tsx` and `src/views/Dashboard.tsx`.
3. Verify chips/icons remain visually consistent by task type.
4. Confirm ordering behavior still uses descending score where required.
5. Validate TypeScript and review visual regressions.

## Output
- Updated threshold table
- List of changed files
- Consistency check status (Roadmap vs Dashboard)
