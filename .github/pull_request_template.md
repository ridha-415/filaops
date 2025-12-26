## Summary
Postgres migration + scheduler hardening

## Changes
- DB: SQL Server → Postgres (`DATABASE_URL`, Alembic heads)
- UI: unified time/calendar + API client, error boundary, toasts
- E2E: Playwright smoke tests

## Migration
- `alembic upgrade head`
- Verify indices: `resource_id`, `scheduled_start`
- Backup first: `pg_dump -Fc -d erp -f erp.backup`

## QA
- Drag/Drop respects 15-min snap + work hours
- Auto-push overlaps / compact gaps
- Number/Currency fields parse/format correctly

## Risks
- Timezone conversion
- Numeric precision
