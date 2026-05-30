---
description: Use when touching build, lint, server runtime, workflows, deployment, or release-related settings.
---
# Testing and Deploy Instructions

## Commands
- Install: `npm install`
- Dev run: `npm run dev`
- Type check: `npm run lint`
- Build: `npm run build`

## Deployment Context
- Workflow located at `.github/workflows/azure-webapps-node.yml`.
- Build artifact is `dist`.

## Change Rules
- If build/runtime files change, verify command compatibility.
- Keep workflow assumptions (Node version, artifact path) in sync with project setup.
- Mention any required secrets/env updates when relevant.
