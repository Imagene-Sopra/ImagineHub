---
name: Firestore Safe Migration Plan
description: Build a safe Firestore migration plan with compatibility strategy, rollout phases, rollback, and verification steps.
argument-hint: Describe the current schema, target schema, and compatibility constraints.
agent: "Firestore Migration Specialist"
---
Create a safe migration strategy for this Firestore change in ImagineHub.

Migration request:
{{input}}

Return the output in this exact structure:
1. Schema delta
2. Impact matrix (collection/query -> files)
3. Compatibility strategy
4. Phased rollout plan
5. Rollback plan
6. Verification plan

Safety rules:
- Preserve existing enum compatibility (`estado`, `tipo`) unless migration explicitly includes enum changes.
- Identify all affected collection paths and collectionGroup queries.
- Call out all UI views that may break during rollout.
- Include a fallback path if partial migration occurs.
