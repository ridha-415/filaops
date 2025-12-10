# GitHub Issues to Create

Copy-paste these into GitHub Issues. Issues #1 and #2 can be created and immediately closed since the work is done.

---

## Issue 1: Database Migrations with Alembic ✅ DONE

**Title:** `[Infra] Set up Alembic database migrations`

**Labels:** `infrastructure`, `core-release`

**Body:**
```markdown
## Summary
Set up Alembic for database schema migrations to enable safe, versioned database changes.

## Why This Matters
- Currently using `Base.metadata.create_all()` which doesn't handle schema changes
- Need migration tracking for production deployments
- Contributors need a standard way to modify the database schema

## Acceptance Criteria
- [x] Alembic installed and configured
- [x] `migrations/` directory with env.py configured for FilaOps models
- [x] Baseline migration stamped for existing database
- [x] Documentation for creating new migrations

## Implementation Notes
Completed Dec 9, 2025:
- `backend/alembic.ini` - Configuration
- `backend/migrations/env.py` - Configured with settings.database_url and Base.metadata
- `backend/migrations/versions/baseline_001_stamp_existing.py` - Baseline stamp
- Added `alembic==1.17.2` to requirements.txt

### Usage
```bash
cd backend

# Create new migration after model changes
alembic revision --autogenerate -m "add_field_to_table"

# Apply migrations
alembic upgrade head

# Check current state
alembic current
```
```

---

## Issue 2: CI/CD Pipeline ✅ DONE

**Title:** `[Infra] Set up GitHub Actions CI/CD pipeline`

**Labels:** `infrastructure`, `core-release`

**Body:**
```markdown
## Summary
Create automated CI/CD pipeline for testing and quality checks on every push/PR.

## Why This Matters
- No automated testing before merge
- Manual verification is error-prone
- Contributors need immediate feedback on their changes

## Acceptance Criteria
- [x] Backend tests run on push/PR
- [x] Backend linting (ruff)
- [x] Frontend build verification
- [x] Docker build verification
- [x] Uses SQLite for CI (no SQL Server dependency)

## Implementation Notes
Completed Dec 9, 2025:
- `.github/workflows/ci.yml` created

### Jobs
1. **backend-tests** - pytest with coverage, SQLite in-memory
2. **backend-lint** - ruff check
3. **frontend-tests** - npm build verification
4. **docker-build** - Dockerfile build test

### Triggers
- Push to `main` or `develop`
- Pull requests to `main`
```

---

## Issue 3: Fix Hardcoded API_URL in Frontend 🔄 OPEN

**Title:** `[Chore] Fix hardcoded localhost:8000 API URLs in frontend`

**Labels:** `good first issue`, `frontend`, `core-release`

**Body:**
```markdown
## Summary
Replace hardcoded `localhost:8000` API URLs with centralized configuration import across ~20 frontend files.

## Problem
Many frontend components define their own API_URL:
```javascript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
```

This causes issues:
- IPv6/IPv4 resolution problems on some systems
- Inconsistent behavior across components
- Harder to configure for different environments

## Solution
Import from the existing centralized config:
```javascript
import { API_URL } from "../../config/api";
```

## Files to Update (~20 files)

### Components
- [ ] `frontend/src/components/bom/BOMEditor.jsx`
- [ ] `frontend/src/components/items/ItemForm.jsx`
- [ ] `frontend/src/components/items/ItemWizard.jsx`
- [ ] `frontend/src/components/materials/MaterialForm.jsx`
- [ ] `frontend/src/components/production/ProductionScheduler.jsx`
- [ ] `frontend/src/components/production/ProductionSchedulingModal.jsx`
- [ ] `frontend/src/components/routing/RoutingEditor.jsx`
- [ ] `frontend/src/components/sales/SalesOrderWizard.jsx`

### Pages
- [ ] `frontend/src/pages/admin/AdminBOM.jsx`
- [ ] `frontend/src/pages/admin/AdminCustomers.jsx`
- [ ] `frontend/src/pages/admin/AdminDashboard.jsx` ✅ (already fixed)
- [ ] `frontend/src/pages/admin/AdminItems.jsx`
- [ ] `frontend/src/pages/admin/AdminLogin.jsx`
- [ ] `frontend/src/pages/admin/AdminManufacturing.jsx`
- [ ] `frontend/src/pages/admin/AdminOrderImport.jsx`
- [ ] `frontend/src/pages/admin/AdminOrders.jsx`
- [ ] `frontend/src/pages/admin/AdminPasswordResetApproval.jsx`
- [ ] `frontend/src/pages/admin/AdminProduction.jsx`
- [ ] `frontend/src/pages/admin/AdminPurchasing.jsx`
- [ ] `frontend/src/pages/admin/AdminShipping.jsx`

## How to Fix Each File

1. Remove the local API_URL definition:
```diff
- const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
```

2. Add import at top of file:
```diff
+ import { API_URL } from "../../config/api";  // adjust path as needed
```

3. Verify the import path is correct relative to the file location

## Verification
```bash
# Find any remaining hardcoded URLs
grep -r "localhost:8000" frontend/src/ --include="*.jsx"
# Should return empty after fix
```

## Good First Issue
This is a straightforward find-and-replace task, perfect for new contributors!
```

---

## Issue 4: Add Rate Limiting to Auth Endpoints 🔄 OPEN

**Title:** `[Security] Add rate limiting to authentication endpoints`

**Labels:** `security`, `core-release`

**Body:**
```markdown
## Summary
Add rate limiting to `/api/v1/auth/login` and related endpoints to prevent brute force attacks.

## Problem
Currently, there's no limit on authentication attempts. An attacker could:
- Brute force passwords
- Cause denial of service through repeated requests
- Enumerate valid usernames

## Solution
Use `slowapi` to add rate limiting:

```bash
pip install slowapi
```

```python
# backend/app/api/v1/endpoints/auth.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")  # 5 attempts per minute per IP
async def login(request: Request, ...):
    ...
```

## Acceptance Criteria
- [ ] Install `slowapi` and add to requirements.txt
- [ ] Rate limit `/api/v1/auth/login` to 5 requests/minute per IP
- [ ] Rate limit `/api/v1/auth/register` to 3 requests/minute per IP
- [ ] Rate limit `/api/v1/auth/forgot-password` to 3 requests/minute per IP
- [ ] Return appropriate 429 response with retry-after header
- [ ] Add tests for rate limiting behavior

## References
- [slowapi documentation](https://slowapi.readthedocs.io/)
- OWASP Authentication Cheat Sheet
```

---

## Issue 5: Remove Personal Address from Settings 🔄 OPEN

**Title:** `[Security] Remove personal address from default settings`

**Labels:** `security`, `good first issue`, `core-release`

**Body:**
```markdown
## Summary
Replace personal/business address in `backend/app/core/settings.py` with generic placeholder values.

## Problem
The settings file contains a real business address as default values for ship-from configuration. This should be replaced with placeholder values for the open-source release.

## File
`backend/app/core/settings.py`

## Current (Remove)
```python
SHIP_FROM_NAME: str = Field(default="BLB3D Printing")
SHIP_FROM_STREET1: str = Field(default="[REAL ADDRESS]")
SHIP_FROM_CITY: str = Field(default="[REAL CITY]")
# etc.
```

## Replace With
```python
SHIP_FROM_NAME: str = Field(default="Your Company Name")
SHIP_FROM_STREET1: str = Field(default="123 Main Street")
SHIP_FROM_CITY: str = Field(default="Your City")
SHIP_FROM_STATE: str = Field(default="ST")
SHIP_FROM_ZIP: str = Field(default="12345")
SHIP_FROM_COUNTRY: str = Field(default="US")
SHIP_FROM_PHONE: str = Field(default="555-555-5555")
```

## Acceptance Criteria
- [ ] All default address values replaced with placeholders
- [ ] Add comment noting these must be configured via environment variables
- [ ] Update `.env.example` with the required variables

## Good First Issue
Quick 5-minute fix, perfect for first-time contributors!
```

---

## Summary

| Issue | Status | Action |
|-------|--------|--------|
| Alembic migrations | ✅ Done | Create & close |
| CI/CD pipeline | ✅ Done | Create & close |
| API_URL hardcoding | 🔄 Open | Create as open |
| Rate limiting | 🔄 Open | Create as open |
| Personal address | 🔄 Open | Create as open |
