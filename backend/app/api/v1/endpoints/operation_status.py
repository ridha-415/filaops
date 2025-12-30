"""
API endpoints for operation status transitions.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.schemas.operation_status import (
    OperationStartRequest,
    OperationCompleteRequest,
    OperationSkipRequest,
    OperationResponse,
    OperationListItem,
    ProductionOrderSummary,
    NextOperationInfo,
)
from app.services.operation_status import (
    OperationError,
    start_operation,
    complete_operation,
    skip_operation,
    list_operations,
    get_next_operation,
)
from app.models.production_order import ProductionOrder


router = APIRouter()


def build_operation_response(op, po, next_op=None) -> OperationResponse:
    """Build response from operation model."""
    resource_code = None
    if op.resource:
        resource_code = op.resource.code

    # Get current operation sequence for PO
    current_seq = None
    for o in sorted(po.operations, key=lambda x: x.sequence):
        if o.status not in ('complete', 'skipped'):
            current_seq = o.sequence
            break

    next_op_info = None
    if next_op:
        next_op_info = NextOperationInfo(
            id=next_op.id,
            sequence=next_op.sequence,
            operation_code=next_op.operation_code,
            operation_name=next_op.operation_name,
            status=next_op.status,
            work_center_code=next_op.work_center.code if next_op.work_center else None,
            work_center_name=next_op.work_center.name if next_op.work_center else None,
        )

    return OperationResponse(
        id=op.id,
        sequence=op.sequence,
        operation_code=op.operation_code,
        operation_name=op.operation_name,
        status=op.status,
        resource_id=op.resource_id,
        resource_code=resource_code,
        planned_run_minutes=op.planned_run_minutes,
        actual_start=op.actual_start,
        actual_end=op.actual_end,
        actual_run_minutes=op.actual_run_minutes,
        quantity_completed=op.quantity_completed,
        quantity_scrapped=op.quantity_scrapped,
        notes=op.notes,
        production_order=ProductionOrderSummary(
            id=po.id,
            code=po.code,
            status=po.status,
            current_operation_sequence=current_seq,
        ),
        next_operation=next_op_info,
    )


@router.get(
    "/{po_id}/operations",
    response_model=List[OperationListItem],
    summary="List operations for a production order"
)
def get_operations(
    po_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Get all operations for a production order, ordered by sequence.
    """
    try:
        ops = list_operations(db, po_id)
    except OperationError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))

    result = []
    for op in ops:
        result.append(OperationListItem(
            id=op.id,
            sequence=op.sequence,
            operation_code=op.operation_code,
            operation_name=op.operation_name,
            status=op.status,
            work_center_id=op.work_center_id,
            work_center_code=op.work_center.code if op.work_center else None,
            work_center_name=op.work_center.name if op.work_center else None,
            resource_id=op.resource_id,
            resource_code=op.resource.code if op.resource else None,
            planned_setup_minutes=op.planned_setup_minutes,
            planned_run_minutes=op.planned_run_minutes,
            actual_start=op.actual_start,
            actual_end=op.actual_end,
            quantity_completed=op.quantity_completed,
            quantity_scrapped=op.quantity_scrapped,
        ))

    return result


@router.post(
    "/{po_id}/operations/{op_id}/start",
    response_model=OperationResponse,
    summary="Start an operation"
)
def start_operation_endpoint(
    po_id: int,
    op_id: int,
    request: OperationStartRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Start an operation.

    Validations:
    - Operation must be in pending or queued status
    - Previous operation must be complete or skipped
    - Resource must not have conflicting scheduled operation
    """
    try:
        op = start_operation(
            db=db,
            po_id=po_id,
            op_id=op_id,
            resource_id=request.resource_id,
            operator_name=request.operator_name,
            notes=request.notes,
        )
        db.commit()
    except OperationError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))

    po = db.get(ProductionOrder, po_id)
    next_op = get_next_operation(db, po, op)

    return build_operation_response(op, po, next_op)


@router.post(
    "/{po_id}/operations/{op_id}/complete",
    response_model=OperationResponse,
    summary="Complete an operation"
)
def complete_operation_endpoint(
    po_id: int,
    op_id: int,
    request: OperationCompleteRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Complete an operation.

    Validations:
    - Operation must be in running status

    Side effects:
    - Updates PO status if this is the last operation
    - Consumes materials for this operation stage
    """
    try:
        op = complete_operation(
            db=db,
            po_id=po_id,
            op_id=op_id,
            quantity_completed=request.quantity_completed,
            quantity_scrapped=request.quantity_scrapped,
            actual_run_minutes=request.actual_run_minutes,
            notes=request.notes,
        )
        db.commit()
    except OperationError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))

    po = db.get(ProductionOrder, po_id)
    next_op = get_next_operation(db, po, op)

    return build_operation_response(op, po, next_op)


@router.post(
    "/{po_id}/operations/{op_id}/skip",
    response_model=OperationResponse,
    summary="Skip an operation"
)
def skip_operation_endpoint(
    po_id: int,
    op_id: int,
    request: OperationSkipRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Skip an operation with a reason.

    Use cases:
    - Customer waived QC requirement
    - Operation not applicable for this product variant
    """
    try:
        op = skip_operation(
            db=db,
            po_id=po_id,
            op_id=op_id,
            reason=request.reason,
        )
        db.commit()
    except OperationError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))

    po = db.get(ProductionOrder, po_id)
    next_op = get_next_operation(db, po, op)

    return build_operation_response(op, po, next_op)
