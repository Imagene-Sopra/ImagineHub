---
description: Use when implementing UI updates in Dashboard, Roadmap, Initiatives, Projects, Mailbox, Calendar, or Imagine views.
applyTo: src/views/**
---
# UI Views Instructions

## Visual Consistency
- Keep current Tailwind utility style and spacing rhythm.
- Preserve chip styles and existing color semantics by task type.
- Keep hover/focus states accessible and coherent.

## Interaction Patterns
- Prefer inline edit affordances that match existing style.
- Do not regress mobile/table responsiveness.
- Keep timeline and table readability as first priority.

## Performance
- Avoid heavy computations inside JSX when reusable helpers are possible.
- Memoize only if needed; prefer simple readable code first.
