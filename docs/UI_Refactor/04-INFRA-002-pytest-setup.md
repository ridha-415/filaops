# INFRA-002: Backend pytest Test Infrastructure

## Status: COMPLETED

---

## Overview

**Goal:** Configure pytest to run with PostgreSQL test database
**Outcome:** 129 tests pass with PostgreSQL, transaction rollback isolation for speed

---

## What Was Done

This ticket was an **enhancement** of existing test infrastructure, not a fresh setup.

### Pre-existing State
- `backend/tests/` directory already existed with 9 test files
- conftest.py already had 18 fixtures
- pytest was NOT in requirements.txt (ran via pip but not tracked)
- Tests used SQLite in-memory database

### Changes Made

1. **Added pytest dependencies to requirements.txt:**
   ```
   # Testing
   pytest>=7.4.0
   pytest-asyncio>=0.21.0
   pytest-cov>=4.1.0
   ```

2. **Created test database:**
   - Database: `filaops_test` on PostgreSQL 17.7
   - Created via Python/psycopg connection

3. **Updated conftest.py for PostgreSQL:**
   - Added `USE_POSTGRES` environment variable toggle
   - PostgreSQL as default (`TEST_USE_POSTGRES=true`)
   - SQLite fallback for quick local runs (`TEST_USE_POSTGRES=false`)
   - Transaction rollback isolation maintained

4. **Verified all tests pass:**
   - 129 passed, 21 skipped
   - Execution time: ~81 seconds with PostgreSQL

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_USE_POSTGRES` | `true` | Use PostgreSQL for tests |
| `TEST_DB_NAME` | `filaops_test` | Test database name |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | `Admin` | PostgreSQL password |

### Running Tests

```bash
# Default: PostgreSQL
cd backend
./venv/Scripts/python.exe -m pytest tests/ -v

# With coverage
pytest tests/ -v --cov=app --cov-report=term

# SQLite fallback (faster, no external DB needed)
TEST_USE_POSTGRES=false pytest tests/ -v

# Specific test markers
pytest tests/ -m unit -v        # Unit tests only
pytest tests/ -m integration -v # Integration tests only
```

---

## Files Modified

| File | Action |
|------|--------|
| `backend/requirements.txt` | Added pytest dependencies |
| `backend/tests/conftest.py` | Added PostgreSQL support with SQLite fallback |

---

## Existing Test Structure

```
backend/tests/
├── __init__.py
├── conftest.py              # 18 fixtures (db, client, auth, etc.)
├── integration/
│   ├── test_accounting_export.py
│   ├── test_admin_endpoints.py
│   ├── test_auth_endpoints.py
│   └── test_quote_endpoints.py
└── unit/
    ├── test_mrp_allocation.py
    ├── test_mrp_service.py
    ├── test_purchase_order_uom.py
    └── test_uom_service.py
```

---

## Key Fixtures (from existing conftest.py)

| Fixture | Scope | Purpose |
|---------|-------|---------|
| `engine` | session | Database engine, creates tables once |
| `db` | function | Session with transaction rollback |
| `client` | function | TestClient with db override |
| `admin_token` | function | JWT token for admin user |
| `sample_product` | function | Test product with BOM |
| `sample_customer` | function | Test customer |

---

## Verification

```bash
# Run all tests (should show 129 passed, 21 skipped)
cd backend
./venv/Scripts/python.exe -m pytest tests/ -v --tb=short

# Quick connection test
./venv/Scripts/python.exe -c "
from sqlalchemy import create_engine, text
engine = create_engine('postgresql+psycopg://postgres:Admin@localhost:5432/filaops_test')
with engine.connect() as conn:
    print(conn.execute(text('SELECT 1')).scalar())
"
```

---

## Commits

| Hash | Message |
|------|---------|
| `87d7284` | chore(INFRA-002): add pytest dependencies |
| (pending) | feat(INFRA-002): add PostgreSQL test database support |

---

## Next Steps

**INFRA-003: Test Data Factories**
- Create scenario seeding for E2E tests
- Add backend endpoint for `POST /api/v1/test/seed`
- Connect frontend `seedTestScenario()` to backend endpoint

---

## Notes

- The 21 skipped tests are quote-related tests that require specific file fixtures
- SQLite fallback uses in-memory database for fast CI runs without PostgreSQL
- Transaction rollback isolation means each test runs in its own transaction that gets rolled back, keeping tests fast and isolated
