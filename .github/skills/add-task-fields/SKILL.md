---
name: add-task-fields
description: Use when adding new fields to task entities and propagating them safely across TaskModal, InitiativeDetail, ProjectDetail, Roadmap, Dashboard, and types.
---
# Skill: Add Task Fields Safely

## Use When
- A new task attribute is requested (example: priority, owner, SLA target).

## Steps
1. Update `src/types.ts` with the new field and optionality.
2. Update create/edit forms in `src/components/TaskModal.tsx`.
3. Update save/update handlers in initiative/project detail views.
4. Update read/render logic in Dashboard and Roadmap if needed.
5. Preserve backward compatibility for existing documents.
6. Validate TypeScript and run build checks.

## Output
- List of updated files
- Compatibility notes
- Validation result
