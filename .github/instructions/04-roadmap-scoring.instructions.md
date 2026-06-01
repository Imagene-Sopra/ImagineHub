---
description: Use when changing task scoring, warning icon thresholds, roadmap ordering, dashboard pending score behavior, or SLA risk indicators.
---
# Roadmap Scoring Instructions

## Baseline Scores
- Run: 100
- Build: 90
- Presentation: 80
- PoC: 70

## Date Adjustment
- Score decreases by remaining days if due date is in the future.
- Score increases by overdue days if due date is in the past.

## Warning Thresholds
- Run: warning 98-100, danger >100
- Build: warning 88-90, danger >90
- Presentation: warning 78-80, danger >80
- PoC: warning 68-70, danger >70

## Consistency Rule
Any scoring or threshold change must be mirrored in:
- `src/views/Roadmap.tsx`
- `src/views/Dashboard.tsx`
