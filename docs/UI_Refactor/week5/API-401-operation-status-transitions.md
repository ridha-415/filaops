# API-401: Operation Status Transitions

## Overview
Enable starting and completing individual operations within a production order. The PO status is derived from its operations' collective state.

## Endpoints

### POST /api/v1/production-orders/{po_id}/operations/{op_id}/start
Start an operation (set to running).

**Validations:**
- Operation must be in `pending` or `queued` status
- Previous operation (by sequence) must be `complete` or `skipped`
- Resource must not have conflicting scheduled operation (double-booking)
- Materials required for THIS operation must be available

**Request:**
`json
{
  "resource_id": 5,           // Optional: assign to specific resource
  "operator_name": "John D",  // Optional: who's doing it
  "notes": "Starting batch"   // Optional
}
`

**Response (200):**
`json
{
  "id": 42,
  "sequence": 10,
  "operation_code": "PRINT",
  "operation_name": "3D Print",
  "status": "running",
  "actual_start": "2025-12-29T14:30:00Z",
  "resource_id": 5,
  "resource_code": "PRINTER-01",
  "planned_run_minutes": 240,
  "production_order": {
    "id": 15,
    "code": "PO-2025-0042",
    "status": "in_progress"
  }
}
`

**Error Responses:**
- `400`: Previous operation not complete
- `400`: Resource double-booked
- `400`: Materials not available for this operation
- `404`: Operation not found

---

### POST /api/v1/production-orders/{po_id}/operations/{op_id}/complete
Complete an operation.

**Validations:**
- Operation must be in `running` status
- Quantity completed must be specified

**Request:**
`json
{
  "quantity_completed": 50,
  "quantity_scrapped": 0,
  "actual_run_minutes": 235,  // Optional: override calculated
  "notes": "Clean print, no issues"
}
`

**Response (200):**
`json
{
  "id": 42,
  "sequence": 10,
  "operation_code": "PRINT",
  "status": "complete",
  "actual_start": "2025-12-29T14:30:00Z",
  "actual_end": "2025-12-29T18:25:00Z",
  "actual_run_minutes": 235,
  "quantity_completed": 50,
  "quantity_scrapped": 0,
  "next_operation": {
    "id": 43,
    "sequence": 20,
    "operation_code": "CLEAN",
    "operation_name": "Post-Print Clean",
    "status": "pending",
    "work_center": "Finishing"
  },
  "production_order": {
    "id": 15,
    "code": "PO-2025-0042",
    "status": "in_progress",
    "current_operation_sequence": 20
  }
}
`

**Side Effects:**
- Consume materials for this operation (based on BOM consume_stage)
- Update resource status to `available`
- If last operation → set PO status to `complete`

---

### POST /api/v1/production-orders/{po_id}/operations/{op_id}/skip
Skip an operation (e.g., QC not required for trusted product).

**Request:**
`json
{
  "reason": "Customer waived QC requirement"
}
`

**Response (200):**
`json
{
  "id": 44,
  "sequence": 40,
  "operation_code": "QC",
  "status": "skipped",
  "notes": "Customer waived QC requirement",
  "next_operation": { ... }
}
`

---

## PO Status Derivation Logic
`python
def derive_po_status(operations):
    statuses = [op.status for op in operations]
    
    if all(s == 'pending' for s in statuses):
        return 'released'
    elif all(s in ('complete', 'skipped') for s in statuses):
        return 'complete'
    elif any(s in ('running', 'complete', 'skipped') for s in statuses):
        return 'in_progress'
    else:
        return 'released'
`

## Database Changes

None - using existing `ProductionOrderOperation` model.

Add helper property to `ProductionOrder`:
`python
@property
def current_operation(self):
    """First non-complete operation in sequence order"""
    for op in sorted(self.operations, key=lambda x: x.sequence):
        if op.status not in ('complete', 'skipped'):
            return op
    return None

@property  
def current_operation_sequence(self):
    op = self.current_operation
    return op.sequence if op else None
`

## Implementation Notes

1. Use database transaction for complete - consume materials atomically
2. Emit event for status changes (future: real-time UI updates)
3. Log operation transitions in `order_events` table

