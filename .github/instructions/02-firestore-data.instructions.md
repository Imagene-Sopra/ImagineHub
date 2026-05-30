---
description: Use when editing Firestore reads/writes, listeners, collection paths, task fields, or rules-related behavior.
---
# Firestore Data Instructions

## Data Model Keys
- initiatives/{initiativeId}/tasks/{taskId}
- projects/{projectId}/tasks/{taskId}
- mailbox/{postId}/responses/{responseId}
- sessions, news, v1imagine at top-level collections

## Rules
- Keep field names exactly as in `src/types.ts`.
- Keep `estado` and `tipo` values consistent.
- Use `updatedAt` on updates.
- Preserve `createdAt` semantics on create.

## Listener Guidelines
- Prefer `onSnapshot` for realtime pages.
- Ensure cleanup returns are present in `useEffect`.
- Avoid unnecessary duplicate listeners.

## Safety
- If changing schema, include migration steps and compatibility notes.
