## [ERR-20260401-001] prisma-generate-windows-file-lock

**Logged**: 2026-04-01T23:33:30+08:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
Standard `prisma generate` can fail on Windows when the Prisma query engine DLL is locked by a running process.

### Error
```text
EPERM: operation not permitted, rename '...query_engine-windows.dll.node.tmp...' -> '...query_engine-windows.dll.node'
```

### Context
- Command attempted: `pnpm db:generate`
- Repository: `web`
- Environment: Windows local development with an already-running process likely holding the Prisma engine DLL

### Suggested Fix
Use `PRISMA_GENERATE_NO_ENGINE=1` for local client regeneration when only TypeScript types and client metadata are needed, then keep `pnpm db:init` as the schema bootstrap step for SQLite on this machine.

### Metadata
- Reproducible: yes
- Related Files: `package.json`, `prisma/schema.prisma`

---

## [ERR-20260402-002] sqlite-add-column-default-and-index-order

**Logged**: 2026-04-02T02:26:30+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
`scripts/init-db.mjs` cannot create indexes against newly introduced columns before existing SQLite tables have been altered, and `ALTER TABLE ... ADD COLUMN` cannot use `CURRENT_TIMESTAMP` as a non-constant default.

### Error
```text
Error: no such column: "updatedAt" - should this be a string literal in single-quotes?
Error: Cannot add a column with non-constant default
```

### Context
- Command attempted: `pnpm db:push`
- Repository: `web`
- Change in progress: add `updatedAt`, `paidAt`, `closedAt`, and `paymentReference` to order tables
- Existing local SQLite database already had older `MembershipOrder` and `ContentOrder` tables

### Suggested Fix
For evolving SQLite tables in `init-db.mjs`, add columns first, backfill data second, and only then create indexes that depend on the new columns. For `updatedAt`, add a plain `DATETIME` column and backfill from `createdAt` or `CURRENT_TIMESTAMP` instead of trying to add a non-constant default during `ALTER TABLE`.

### Metadata
- Reproducible: yes
- Related Files: `scripts/init-db.mjs`, `prisma/schema.prisma`
- See Also: ERR-20260401-001

---

## [ERR-20260402-003] prisma-generate-lock-recurrence

**Logged**: 2026-04-02T02:26:30+08:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
`prisma generate` hit the known Windows file-lock issue again while the local dev server was running.

### Error
```text
EPERM: operation not permitted, rename '...query_engine-windows.dll.node.tmp...' -> '...query_engine-windows.dll.node'
```

### Context
- Command attempted: `pnpm db:generate`
- Repository: `web`
- Local dev server on port `3000` was still running and holding the Prisma engine DLL

### Suggested Fix
Stop the local Next.js dev server before regenerating the Prisma client on Windows, then restart the server after generation completes.

### Metadata
- Reproducible: yes
- Related Files: `package.json`, `prisma/schema.prisma`
- See Also: ERR-20260401-001

---
