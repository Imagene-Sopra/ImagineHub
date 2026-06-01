# ImagineHub Workspace Agent Guide

## Scope
These instructions apply to the entire repository.

## Product Map
- Dashboard: summary metrics, pending tasks, recent activity.
- Initiatives and Projects: list pages plus detail kanban boards.
- Roadmap: timeline/gantt with task scoring and risk icons.
- Calendar: session planning and day/month views.
- Mailbox: collaboration posts, responses, optional AI suggestion.
- Imagine: markdown-based content hub.

## Core Technical Stack
- React + TypeScript + Vite
- Firestore realtime listeners (`onSnapshot`)
- Firebase Auth/Firestore client config in `src/firebase.ts`
- Express runtime wrapper in `server.ts`

## Data Contracts
- Keep Firestore field names aligned with `src/types.ts`.
- Task status enum: `todo | in_progress | done`.
- Task type enum: `PoC | Presentation | Run | Build`.

## Scoring Model
Baseline score by task type:
- Run: 100
- Build: 90
- Presentation: 80
- PoC: 70

Adjust by due date (`fechaFin`):
- Future due date decreases score by remaining days.
- Overdue increases score by overdue days.

Alert thresholds used in roadmap/dashboard:
- Run: warning 98-100, danger >100
- Build: warning 88-90, danger >90
- Presentation: warning 78-80, danger >80
- PoC: warning 68-70, danger >70

## Change Guardrails
- Prefer minimal diffs and preserve existing UX patterns.
- Reuse existing logic when duplicated between views.
- Validate TypeScript errors after edits.
- Avoid schema changes without migration notes.
