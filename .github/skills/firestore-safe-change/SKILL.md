---
name: firestore-safe-change
description: Use when making potentially risky Firestore changes (schema, paths, query filters, collectionGroup assumptions) requiring compatibility and rollback discipline.
---
# Skill: Firestore Safe Change

## Use When
- Query paths or filters are modified.
- Collection/subcollection shape changes.
- Enum values or required fields are altered.

## Steps
1. Identify all affected queries/listeners and write paths.
2. Check compatibility with existing documents.
3. Plan migration strategy (if required).
4. Define rollback strategy.
5. Update relevant instructions/tests/docs snippets.
6. Validate impacted views and build/type checks.

## Output
- Impact matrix (collection -> files)
- Migration plan
- Rollback plan
- Validation checklist
