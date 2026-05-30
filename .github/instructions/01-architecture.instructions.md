---
description: Use when changing app structure, routing, component boundaries, state ownership, or cross-view behavior in ImagineHub.
---
# Architecture Instructions

## Current Structure
- Routing: `src/App.tsx`
- Layout shell: `src/components/Layout.tsx`
- Views grouped in `src/views/`
- Shared helpers in `src/lib/`
- Domain contracts in `src/types.ts`

## Rules
- Keep routes and navigation labels synchronized.
- Avoid moving domain logic into UI-only components.
- Keep reusable logic close to domain, not duplicated across views.
- Preserve existing UX flows unless change is requested.

## Deliverables for Architecture Changes
- Brief impact summary.
- List of touched files.
- Rationale for new boundaries.
