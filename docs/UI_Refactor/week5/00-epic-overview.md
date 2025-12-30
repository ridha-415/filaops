# Week 5: Operation-Level Production Tracking

## Status: IN PROGRESS

---

## Epic Overview

Transform FilaOps from single-step production orders to true multi-operation routing execution. This enables real manufacturing workflows like Print → Clean → Assemble → QC → Pack/Ship.

---

## Problem Statement

**Current State:**
- Production orders treated as single task
- Completing PO marks everything done (skips intermediate ops)
- Scheduler books entire PO to one resource
- Material blocking checks ALL BOM items upfront
- Double-booking resources is possible
- No progress visibility during production
- 2-hour hardcoded duration ignores BOM/routing times

**Real World Workflow:**
`
PO: Make Gadget Pro (50 units)
├── Op 10: Print       → Printer-01, 4 hrs, consumes PLA
├── Op 20: Clean       → Finishing, 30 min
├── Op 30: Assemble    → Assembly, 1 hr, consumes hardware kit
├── Op 40: QC Inspect  → QC Station, 15 min
└── Op 50: Pack/Ship   → Shipping, 10 min, consumes boxes
`

**Key Insight:** Shipping boxes not received yet? **Start printing anyway** - they'll arrive by the time we get to Op 50.

---

## Existing Data Model (Already Built!)

### Routing (Template) - `backend/app/models/manufacturing.py`
| Model | Purpose |
|-------|---------|
| `Routing` | Linked to Product, defines HOW to make it |
| `RoutingOperation` | Sequence, work_center, run_time_minutes, predecessor |

### Production Order (Execution) - `backend/app/models/production_order.py`
| Model | Purpose |
|-------|---------|
| `ProductionOrder` | The work order |
| `ProductionOrderOperation` | Copied from routing, has status, times, resource assignment |

### BOM Material Consumption - `backend/app/models/bom.py`
| Field | Current Values | Extend To |
|-------|---------------|-----------|
| `BOMLine.consume_stage` | 'production', 'shipping' | Operation codes: 'PRINT', 'ASSEMBLE', 'PACK' |

---

## Week 5 Deliverables

| Ticket | Type | Description | Agent |
|--------|------|-------------|-------|
| API-401 | Backend | Operation status transitions (start/complete/skip) | Backend |
| API-402 | Backend | Blocking check per operation (not whole PO) | Backend |
| API-403 | Backend | Double-booking validation on schedule | Backend |
| API-404 | Backend | Copy routing → PO operations on release | Backend |
| UI-401 | Frontend | PO detail shows operation sequence | Frontend |
| UI-402 | Frontend | Scheduler shows operations, not POs | Frontend |
| UI-403 | Frontend | Progress bar (elapsed vs estimated) | Frontend |
| UI-404 | Frontend | "Ready to Start" queue per work center | Frontend |
| E2E-401 | Test | Operation flow E2E tests | Test |

---

## Success Criteria

1. Can define routing with 5 operations for a product
2. Releasing PO creates 5 operation records  
3. Starting Op 1 sets PO to in_progress
4. Completing Op 1 auto-advances current to Op 2
5. Materials for Op 3 don't block starting Op 1
6. Cannot schedule two operations on same resource at same time
7. Progress bar shows "2 hrs into 4 hr print"
8. PO only complete when final operation complete

---

## Operation Status Flow
`
pending → queued → running → complete
                      ↓
                   skipped (optional bypass)
`

## PO Status Derived from Operations

| Condition | PO Status |
|-----------|-----------|
| All ops `pending` | `released` |
| Any op `running`, not all done | `in_progress` |
| All ops `complete` or `skipped` | `complete` |

---

## Out of Scope (Future)

- Parallel operations (print two parts simultaneously)
- Operation-level labor time tracking  
- Automated Bambu status sync to operation progress
- Rework routing (failed QC → back to earlier op)
- Gantt drag-drop rescheduling

---

## Dependencies

- Routing data exists for test products
- Work centers configured with resources
- UOM table seeded (completed Week 4)

