# Copilot Instructions for ImagineHub

Use this repository as a product-oriented web app with realtime Firestore data.

## Always Keep Consistent
- Routes declared in `src/App.tsx`.
- Shared shell and navigation in `src/components/Layout.tsx`.
- Domain contracts in `src/types.ts`.
- Firestore access patterns used by existing views.

## Preferred Behavior
- Implement small, focused changes.
- Preserve current naming conventions in Spanish domain fields.
- Keep roadmap/dashboard scoring thresholds aligned.
- Run type error checks for touched files.

## When Refactoring
- Extract shared logic when duplicated in Dashboard and Roadmap.
- Avoid broad rewrites unless explicitly requested.
- Keep responsive behavior intact (tables and timeline readability).

## Deployment and Runtime
- Dev/start via `npm run dev` (server wrapper).
- Build via `npm run build`.
- CI/CD pipeline is defined under `.github/workflows`.
