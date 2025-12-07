# Session Handoff - BLB3D ERP

> **AI ASSISTANTS: READ THIS FILE AT THE START OF EVERY SESSION.**
> This file captures critical context that must not be lost between sessions.
> Update this file at the END of every session with what was done and what's next.

## Last Updated

**Date:** December 7, 2025 (Session 6)
**Session Summary:** Customer Management module, overhead calculator, Git workflow docs

---

## CRITICAL BUSINESS CONTEXT

### Three Repositories Work Together

```
C:\Users\brand\OneDrive\Documents\blb3d-erp       → ERP Backend (port 8000)
C:\Users\brand\OneDrive\Documents\quote-portal    → Customer + Admin UI (port 5173)
C:\Users\brand\OneDrive\Documents\bambu-print-suite → ML Dashboard (port 8001)
```

**IMPORTANT:**

- Admin UI is at `localhost:5173/admin` (quote-portal), NOT the ML Dashboard
- ML Dashboard reads from ERP via `/api/v1/internal/*` endpoints
- All three repos need to stay in sync

### Revenue-Critical Integrations NOT YET BUILT

| Integration | Why It Matters | Status |
|-------------|----------------|--------|
| **Squarespace** | 80%+ of revenue comes from here. Orders must sync to ERP. | NOT STARTED |
| **QuickBooks** | Accounting compliance. Invoices/payments must sync. | NOT STARTED |
| **B2B Parts Portal** | Retail partners need wholesale ordering | NOT STARTED |

### Current Payment/Shipping Status

- **Stripe**: Works but in TEST MODE only
- **EasyPost**: Works but in TEST MODE only
- Need production API keys before go-live

---

## WHAT WAS COMPLETED THIS SESSION

### Customer Management & Manufacturing Tools (Dec 7, 2025 - Session 6)

**New Features:**

1. **Customer Management Module** - Full CRUD for customer records
   - Backend: `backend/app/api/v1/endpoints/admin/customers.py`
   - Frontend: `frontend/src/pages/admin/AdminCustomers.jsx`
   - Auto-generated customer numbers (CUST-001, CUST-002, etc.)
   - Customer details modal with order history
   - Search functionality for dropdowns

2. **Overhead Rate Calculator** - In Work Center modal
   - Added to `AdminManufacturing.jsx` Work Center modal
   - Calculates: Depreciation + Electricity + Maintenance = Hourly rate
   - "Apply Rate" button populates work center overhead_rate_per_hour

3. **Printer Cost Calculator Documentation**
   - `docs/PRINTER_COST_CALCULATOR.md`
   - Intentionally "skewed" public numbers (protects competitive advantage)
   - Real: ~$0.09/hr | Published: ~$0.125/hr

**Bug Fixes:**

- **Customer grid not displaying** - API returns array directly, frontend expected wrapped object
  - Fixed in `AdminCustomers.jsx`: `setCustomers(Array.isArray(data) ? data : [])`

**Documentation:**

- **CONTRIBUTING.md** - Enhanced with detailed Git workflow
  - Branch naming conventions (feature/, fix/, docs/)
  - Commit message format (conventional commits)
  - Step-by-step workflow for features
  - Quick commit guide for same-day work

### Previous Sessions

- Session 5: Documentation overhaul, fresh_database_setup.py
- Session 4: GitHub public repo live, clean history
- Session 3: FilaOps rebrand, SAAS_TIERING_PLAN.md
- Session 2: Security audit, .gitignore updates
- Session 1: Phase 6B traceability, production order modal

---

## WHAT NEEDS TO BE DONE NEXT

### Open Source Polish - IN PROGRESS

1. [x] **Documentation overhaul** - GETTING_STARTED.md, HOW_IT_WORKS.md
2. [x] **Fresh database setup script** - `fresh_database_setup.py`
3. [x] **Customer Management** - Full CRUD module added
4. [x] **Overhead calculator** - Work center cost calculation tool
5. [ ] **Test frontend admin UI** - Verify all pages work with fresh database
6. [ ] **GitHub Issues** - Address open issues (#6-#11)

### Immediate (This Week)

1. [ ] **Smart SO Entry Phase 2** - Customer dropdown in Orders page
2. [ ] **Test full workflow** - Product → BOM → Order → Production → Ship
3. [ ] **Verify admin UI** - All 12 admin pages working (added Customers)
4. [ ] **API documentation** - Create ERP_API_REFERENCE.md for core endpoints

### Short Term (Pro Features - Not Open Source)

1. [ ] Squarespace integration (order webhook receiver)
2. [ ] QuickBooks integration (OAuth2 flow, invoice sync)
3. [ ] Switch Stripe/EasyPost to production keys

### Known Issues

- Port 8000 conflict when testing (production backend running)
- Need to test fresh install experience on clean machine
- GitHub Issues #6-#11 need attention (3D viewer, multi-material UX, docs)

---

## HOW TO PREVENT CONTEXT LOSS

### For the Human

1. **At session start**: Tell the AI to read `SESSION_HANDOFF.md` and `AI_CONTEXT.md`
2. **During session**: If discussing something important, ask AI to update these docs
3. **At session end**: Ask AI to update this file with what was done

### For the AI

1. **Always read** `AI_CONTEXT.md` → Integration Roadmap section
2. **Always read** this file (`SESSION_HANDOFF.md`)
3. **Update this file** at the end of every session
4. **Commit changes** before session ends to preserve work

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Quick AI context | `AI_CONTEXT.md` |
| This handoff doc | `SESSION_HANDOFF.md` |
| **New user setup guide** | `GETTING_STARTED.md` |
| **How the system works** | `HOW_IT_WORKS.md` |
| **Database setup script** | `scripts/fresh_database_setup.py` |
| Full architecture | `ARCHITECTURE.md` |
| Project roadmap | `ROADMAP.md` |
| ERP main entry | `backend/app/main.py` |
| Admin UI | `frontend/src/pages/admin/` |
| **Customer API** | `backend/app/api/v1/endpoints/admin/customers.py` |
| **Customer UI** | `frontend/src/pages/admin/AdminCustomers.jsx` |
| Production orders API | `backend/app/api/v1/endpoints/production_orders.py` |
| Traceability API | `backend/app/api/v1/endpoints/admin/traceability.py` |
| **Cost Calculator Docs** | `docs/PRINTER_COST_CALCULATOR.md` |

---

## Environment Setup

```bash
# Start all services
cd blb3d-erp/backend && python -m uvicorn app.main:app --reload --port 8000
cd quote-portal && npm run dev
cd bambu-print-suite/ml-dashboard/backend && python main.py

# URLs
http://localhost:5173/admin    # Admin dashboard
http://localhost:8000/docs     # ERP API docs
http://localhost:8001/docs     # ML Dashboard docs
```
