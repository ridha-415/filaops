"""
Invoice Import API Endpoints

Parse invoices and create purchase orders from them:
- Upload and parse PDF/CSV invoices
- Review and confirm product mappings
- Create PO with attached document
"""
import os
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.logging_config import get_logger
from app.models.vendor import Vendor
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder, PurchaseOrderLine
from app.models.purchase_order_document import PurchaseOrderDocument, VendorItem
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.services.invoice_parser import parse_invoice
from app.schemas.invoice_parsing import (
    InvoiceParseResponse,
    CreatePOFromInvoiceRequest,
)
from app.schemas.purchasing import PurchaseOrderResponse

router = APIRouter()
logger = get_logger(__name__)

# Max file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/invoices/parse", response_model=InvoiceParseResponse)
async def parse_invoice_file(
    file: UploadFile = File(..., description="PDF or CSV invoice file"),
    vendor_id: Optional[int] = Form(None, description="Pre-select vendor if known"),
    use_vision: bool = Form(False, description="Use vision mode for scanned PDFs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Parse an invoice file and return structured data with product matches.

    Upload a PDF or CSV invoice to extract:
    - Vendor information
    - Invoice number and date
    - Line items with quantities and costs
    - Automatic product matching from vendor SKU memory

    Returns parsed data for review before PO creation.
    """
    import time
    start_time = time.time()

    # Validate file type
    filename = file.filename or "unknown"
    ext = filename.lower().split('.')[-1] if '.' in filename else ''

    if ext not in ['pdf', 'csv']:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Please upload PDF or CSV."
        )

    # Read file
    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB."
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Verify vendor if provided
    if vendor_id:
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")

    try:
        parsed = parse_invoice(
            db=db,
            file_bytes=file_bytes,
            filename=filename,
            vendor_id=vendor_id,
            use_vision=use_vision,
        )

        processing_time_ms = int((time.time() - start_time) * 1000)

        logger.info(
            f"Parsed invoice '{filename}': {parsed.line_count} lines, "
            f"{parsed.matched_count} matched, {processing_time_ms}ms"
        )

        return InvoiceParseResponse(
            success=True,
            parsed_invoice=parsed,
            processing_time_ms=processing_time_ms,
        )

    except ValueError as e:
        logger.warning(f"Invoice parse validation error: {e}")
        return InvoiceParseResponse(
            success=False,
            error=str(e),
            processing_time_ms=int((time.time() - start_time) * 1000),
        )
    except Exception as e:
        logger.error(f"Invoice parsing failed: {e}")
        return InvoiceParseResponse(
            success=False,
            error=f"Failed to parse invoice: {str(e)}",
            processing_time_ms=int((time.time() - start_time) * 1000),
        )


@router.post("/invoices/create-po", response_model=PurchaseOrderResponse, status_code=201)
async def create_po_from_invoice(
    request: CreatePOFromInvoiceRequest,
    file: Optional[UploadFile] = File(None, description="Original invoice to attach"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a purchase order from a confirmed parsed invoice.

    After reviewing and confirming product mappings, call this endpoint to:
    1. Create the purchase order with all line items
    2. Save new vendor SKU mappings for future invoices
    3. Optionally attach the original invoice document
    """
    # Verify vendor
    vendor = db.query(Vendor).filter(Vendor.id == request.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    if not request.lines:
        raise HTTPException(status_code=400, detail="At least one line item is required")

    # Verify all products exist
    for line in request.lines:
        product = db.query(Product).filter(Product.id == line.product_id).first()
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Product {line.product_id} not found for SKU {line.vendor_sku}"
            )

    # Generate PO number
    today = datetime.utcnow()
    prefix = f"PO-{today.strftime('%Y%m%d')}"

    last_po = db.query(PurchaseOrder).filter(
        PurchaseOrder.po_number.like(f"{prefix}%")
    ).order_by(PurchaseOrder.id.desc()).first()

    if last_po and last_po.po_number.startswith(prefix):
        try:
            last_num = int(last_po.po_number.split('-')[-1])
            po_number = f"{prefix}-{last_num + 1:03d}"
        except (ValueError, IndexError):
            po_number = f"{prefix}-001"
    else:
        po_number = f"{prefix}-001"

    # Calculate totals
    subtotal = sum(line.quantity * line.unit_cost for line in request.lines)
    tax = request.tax or Decimal(0)
    shipping = request.shipping or Decimal(0)
    total = subtotal + tax + shipping

    # Build notes
    notes_parts = []
    if request.invoice_number:
        notes_parts.append(f"Invoice: {request.invoice_number}")
    if request.notes:
        notes_parts.append(request.notes)
    notes = " | ".join(notes_parts) if notes_parts else None

    # Create PO
    purchase_order = PurchaseOrder(
        po_number=po_number,
        vendor_id=request.vendor_id,
        status="draft",
        order_date=request.invoice_date or today.date(),
        subtotal=subtotal,
        tax=tax,
        shipping_cost=shipping,
        total=total,
        notes=notes,
        created_by=current_user.email if current_user else None,
    )
    db.add(purchase_order)
    db.flush()  # Get PO ID

    # Create PO lines and save mappings
    for idx, line in enumerate(request.lines, 1):
        product = db.query(Product).filter(Product.id == line.product_id).first()

        po_line = PurchaseOrderLine(
            purchase_order_id=purchase_order.id,
            product_id=line.product_id,
            quantity_ordered=line.quantity,
            unit_cost=line.unit_cost,
            purchase_unit=line.purchase_unit,
            line_total=line.quantity * line.unit_cost,
            notes=line.notes,
        )
        db.add(po_line)

        # Save vendor SKU mapping if requested
        if line.save_mapping and line.vendor_sku:
            existing_mapping = db.query(VendorItem).filter(
                VendorItem.vendor_id == request.vendor_id,
                VendorItem.vendor_sku == line.vendor_sku,
            ).first()

            if existing_mapping:
                # Update existing mapping
                existing_mapping.product_id = line.product_id
                existing_mapping.default_unit_cost = str(line.unit_cost)
                existing_mapping.default_purchase_unit = line.purchase_unit
                existing_mapping.last_seen_at = datetime.utcnow()
                existing_mapping.times_ordered = (existing_mapping.times_ordered or 0) + 1
            else:
                # Create new mapping
                vendor_item = VendorItem(
                    vendor_id=request.vendor_id,
                    vendor_sku=line.vendor_sku,
                    product_id=line.product_id,
                    default_unit_cost=str(line.unit_cost),
                    default_purchase_unit=line.purchase_unit,
                    last_seen_at=datetime.utcnow(),
                    times_ordered=1,
                )
                db.add(vendor_item)

    # Attach original document if provided
    if file and request.attach_document:
        file_bytes = await file.read()
        if file_bytes:
            # Save to local storage
            upload_dir = os.path.join("uploads", "po_documents", str(purchase_order.id))
            os.makedirs(upload_dir, exist_ok=True)

            ext = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
            safe_filename = f"{uuid.uuid4()}.{ext}"
            file_path = os.path.join(upload_dir, safe_filename)

            with open(file_path, 'wb') as f:
                f.write(file_bytes)

            document = PurchaseOrderDocument(
                purchase_order_id=purchase_order.id,
                document_type=request.document_type,
                file_name=safe_filename,
                original_file_name=file.filename,
                file_path=file_path,
                storage_type="local",
                file_size=len(file_bytes),
                mime_type=file.content_type,
                uploaded_by=current_user.email if current_user else None,
            )
            db.add(document)

    db.commit()
    db.refresh(purchase_order)

    logger.info(
        f"Created PO {po_number} from invoice with {len(request.lines)} lines, "
        f"total ${total:.2f}"
    )

    # Build response
    return PurchaseOrderResponse(
        id=purchase_order.id,
        po_number=purchase_order.po_number,
        vendor_id=purchase_order.vendor_id,
        vendor_name=vendor.name,
        vendor_code=vendor.code,
        status=purchase_order.status,
        order_date=purchase_order.order_date,
        expected_date=purchase_order.expected_date,
        received_date=purchase_order.received_date,
        subtotal=purchase_order.subtotal,
        tax=purchase_order.tax,
        shipping_cost=purchase_order.shipping_cost,
        total=purchase_order.total,
        notes=purchase_order.notes,
        created_by=purchase_order.created_by,
        created_at=purchase_order.created_at,
        updated_at=purchase_order.updated_at,
        lines=[],  # Not loading lines for response
        document_count=1 if (file and request.attach_document) else 0,
    )


@router.get("/invoices/check-anthropic")
async def check_anthropic_config(
    current_user: User = Depends(get_current_user),
):
    """
    Check if Anthropic API is configured correctly.

    Returns configuration status without exposing the actual key.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")

    if not api_key:
        return {
            "configured": False,
            "error": "ANTHROPIC_API_KEY environment variable not set",
        }

    # Mask the key for display
    masked_key = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "****"

    return {
        "configured": True,
        "key_preview": masked_key,
        "model": "claude-sonnet-4-20250514",
    }
