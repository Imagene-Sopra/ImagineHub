# ImagineHub - AI Agent Guide

## Purpose
This repository is a React + Firestore workspace for managing:
- Initiatives and projects
- Task kanban workflows
- Timeline roadmap with SLA-like scoring alerts
- Calendar sessions
- Mailbox collaboration with optional AI suggestions
- Imagine content posts

Use this guide as shared context for any AI assistant (Copilot, AI Studio, and other coding agents).

## Product Functional Domains
- Dashboard: executive summary, recent activity, pending task table with scoring.
- Initiatives: list, reorder, open detail, manage lifecycle.
- Projects: list, reorder, open detail, manage lifecycle.
- Initiative/Project Detail: kanban tasks (`todo`, `in_progress`, `done`) with drag and drop.
- Roadmap: gantt-like timeline for pending tasks with score ordering and warning/danger thresholds by task type.
- Calendar: create/edit/delete sessions by day and month.
- Mailbox: posts, threaded responses, optional AI solution suggestion.
- Imagine: content hub for article-like posts.

## Technical Architecture
- Frontend: React + TypeScript + Vite.
- Routing: `src/App.tsx` with nested layout routes.
- Shared shell: `src/components/Layout.tsx`.
- State/data: mostly Firestore real-time listeners (`onSnapshot`) in each view.
- Backend runtime: `server.ts` (Express + Vite middleware in dev, static dist in prod).
- Data access:
  - Client SDK in `src/firebase.ts`
  - Firestore collections/subcollections for domain entities
- AI integration: Gemini service in `src/services/geminiService.ts`.
- CI/CD: GitHub Actions workflow deploys to Azure Web App.

## Firestore Model (Current)
Top-level collections:
- `initiatives`
- `projects`
- `sessions`
- `mailbox`
- `v1imagine`
- `news`

Subcollections:
- `initiatives/{initiativeId}/tasks`
- `projects/{projectId}/tasks`
- `mailbox/{postId}/responses`

Task typing and status:
- `estado`: `todo | in_progress | done`
- `tipo`: `PoC | Presentation | Run | Build`

## Scoring and Alert Logic
Task score baseline by type:
- Run: 100
- Build: 90
- Presentation: 80
- PoC: 70

Then adjust by days to `fechaFin`:
- Future due date decreases score
- Overdue increases score

Roadmap/Dashboard warning thresholds:
- Run: warning 98-100, danger >100
- Build: warning 88-90, danger >90
- Presentation: warning 78-80, danger >80
- PoC: warning 68-70, danger >70

## Build and Validation Commands
- Install: `npm install`
- Dev server: `npm run dev`
- Type check: `npm run lint`
- Build: `npm run build`

## Change Guardrails for Agents
- Keep Firestore field names and enum values consistent with `src/types.ts`.
- Preserve existing route paths unless migration is explicit.
- Prefer shared logic extraction when duplicated between Dashboard and Roadmap.
- For UI changes, keep mobile behavior and table/timeline readability.
- Avoid introducing breaking schema changes without migration notes.

## Agent Handoff Guidance
If an AI tool supports specialized agents:
- Use a Functional Analyst role for product behavior, user flows, and acceptance criteria.
- Use a Technical Architect role for code structure, data model, performance, and integration decisions.

If no custom agent feature exists (for example, basic AI Studio sessions), use this file as the base system context.
