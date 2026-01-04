"""
Invoice Parser Service

Uses Claude API to extract structured data from invoices (PDF/CSV).
"""
import os
import csv
import json
import time
import io
from decimal import Decimal, InvalidOperation
from datetime import datetime
from typing import Optional, Tuple, List
import base64

from sqlalchemy.orm import Session

from app.logging_config import get_logger
from app.models.vendor import Vendor
from app.models.product import Product
from app.models.purchase_order_document import VendorItem
from app.schemas.invoice_parsing import (
    ParsedInvoice,
    ParsedInvoiceLine,
    MatchConfidence,
)

logger = get_logger(__name__)


# Claude API prompt for invoice extraction
INVOICE_EXTRACTION_PROMPT = '''You are an invoice parser. Extract structured data from this invoice.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "vendor_name": "Company Name from invoice",
  "invoice_number": "INV-12345 or similar",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "lines": [
    {
      "line_number": 1,
      "vendor_sku": "Part number/SKU exactly as shown",
      "description": "Item description",
      "quantity": 10.00,
      "unit": "EA or KG or LB etc",
      "unit_cost": 5.99,
      "line_total": 59.90
    }
  ],
  "subtotal": 100.00,
  "tax": 8.00,
  "shipping": 5.00,
  "total": 113.00
}

Rules:
- Extract vendor SKU/part numbers exactly as shown (case-sensitive)
- Preserve original units (don't convert)
- Use null for missing fields, not empty strings
- Quantities and costs should be numbers, not strings
- If multiple pages, include all line items
'''


def _get_anthropic_client():
    """Get Anthropic client, raising clear error if not configured."""
    try:
        import anthropic
    except ImportError:
        raise RuntimeError("anthropic package not installed. Run: pip install anthropic")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable not set")

    return anthropic.Anthropic(api_key=api_key)


def _extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF using pypdf."""
    try:
        from pypdf import PdfReader
    except ImportError:
        raise RuntimeError("pypdf package not installed. Run: pip install pypdf")

    reader = PdfReader(io.BytesIO(pdf_bytes))
    text_parts = []

    for page_num, page in enumerate(reader.pages, 1):
        text = page.extract_text()
        if text:
            text_parts.append(f"--- Page {page_num} ---\n{text}")

    return "\n\n".join(text_parts)


def _parse_csv_invoice(csv_bytes: bytes) -> dict:
    """Parse CSV invoice directly without AI."""
    content = csv_bytes.decode('utf-8-sig')  # Handle BOM
    reader = csv.DictReader(io.StringIO(content))

    lines = []
    line_num = 0

    # Common column name variations
    sku_cols = ['sku', 'part', 'part_number', 'item', 'item_number', 'product_code']
    desc_cols = ['description', 'desc', 'name', 'product', 'item_description']
    qty_cols = ['quantity', 'qty', 'amount', 'units']
    cost_cols = ['unit_cost', 'cost', 'price', 'unit_price', 'rate']
    total_cols = ['total', 'line_total', 'amount', 'extended', 'ext_price']

    def find_col(row: dict, candidates: list) -> Optional[str]:
        row_lower = {k.lower().strip(): k for k in row.keys()}
        for c in candidates:
            if c in row_lower:
                return row_lower[c]
        return None

    for row in reader:
        line_num += 1

        sku_col = find_col(row, sku_cols)
        desc_col = find_col(row, desc_cols)
        qty_col = find_col(row, qty_cols)
        cost_col = find_col(row, cost_cols)
        total_col = find_col(row, total_cols)

        if not sku_col:
            continue

        try:
            qty = Decimal(str(row.get(qty_col, 1) or 1).replace(',', ''))
            cost = Decimal(str(row.get(cost_col, 0) or 0).replace(',', '').replace('$', ''))
            total = Decimal(str(row.get(total_col, 0) or 0).replace(',', '').replace('$', ''))

            if total == 0 and qty > 0 and cost > 0:
                total = qty * cost

            lines.append({
                "line_number": line_num,
                "vendor_sku": str(row.get(sku_col, '')).strip(),
                "description": str(row.get(desc_col, '')).strip() if desc_col else '',
                "quantity": float(qty),
                "unit": "EA",
                "unit_cost": float(cost),
                "line_total": float(total),
            })
        except (InvalidOperation, ValueError) as e:
            logger.warning(f"Skipping CSV row {line_num}: {e}")
            continue

    return {
        "vendor_name": "Unknown (CSV Import)",
        "invoice_number": "",
        "invoice_date": None,
        "lines": lines,
        "subtotal": sum(item["line_total"] for item in lines),
        "total": sum(item["line_total"] for item in lines),
    }


def _parse_with_claude(text: str) -> dict:
    """Send text to Claude for structured extraction."""
    client = _get_anthropic_client()

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": f"{INVOICE_EXTRACTION_PROMPT}\n\nInvoice text:\n{text}"
            }
        ]
    )

    response_text = message.content[0].text

    # Clean up response - Claude sometimes wraps in markdown
    response_text = response_text.strip()
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        # Remove first and last lines if they're markdown fences
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        response_text = "\n".join(lines)

    return json.loads(response_text)


def _parse_with_claude_vision(pdf_bytes: bytes) -> dict:
    """Send PDF as image to Claude for extraction (for scanned invoices)."""
    client = _get_anthropic_client()

    # Encode PDF as base64
    pdf_b64 = base64.standard_b64encode(pdf_bytes).decode('utf-8')

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": INVOICE_EXTRACTION_PROMPT,
                    }
                ]
            }
        ]
    )

    response_text = message.content[0].text

    # Clean up response
    response_text = response_text.strip()
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        response_text = "\n".join(lines)

    return json.loads(response_text)


def _match_vendor(db: Session, vendor_name: str) -> Tuple[Optional[int], MatchConfidence]:
    """Try to match vendor name to existing vendor."""
    if not vendor_name:
        return None, MatchConfidence.NONE

    # Exact match
    vendor = db.query(Vendor).filter(
        Vendor.name.ilike(vendor_name)
    ).first()

    if vendor:
        return vendor.id, MatchConfidence.EXACT

    # Fuzzy match - check if name contains vendor name or vice versa
    vendors = db.query(Vendor).filter(Vendor.active.is_(True)).all()
    for v in vendors:
        if vendor_name.lower() in v.name.lower() or v.name.lower() in vendor_name.lower():
            return v.id, MatchConfidence.FUZZY

    return None, MatchConfidence.NONE


def _match_products(
    db: Session,
    lines: List[dict],
    vendor_id: Optional[int]
) -> List[ParsedInvoiceLine]:
    """Match invoice lines to products using vendor_items and similarity."""
    result = []

    for line in lines:
        vendor_sku = line.get("vendor_sku", "")
        description = line.get("description", "")

        parsed_line = ParsedInvoiceLine(
            line_number=line.get("line_number", 0),
            vendor_sku=vendor_sku,
            description=description,
            quantity=Decimal(str(line.get("quantity", 0))),
            unit=line.get("unit", "EA"),
            unit_cost=Decimal(str(line.get("unit_cost", 0))),
            line_total=Decimal(str(line.get("line_total", 0))),
        )

        # Try vendor_items first (if we have vendor_id)
        if vendor_id and vendor_sku:
            vendor_item = db.query(VendorItem).filter(
                VendorItem.vendor_id == vendor_id,
                VendorItem.vendor_sku == vendor_sku,
                VendorItem.product_id.isnot(None),
            ).first()

            if vendor_item and vendor_item.product:
                parsed_line.matched_product_id = vendor_item.product_id
                parsed_line.matched_product_sku = vendor_item.product.sku
                parsed_line.matched_product_name = vendor_item.product.name
                parsed_line.match_confidence = MatchConfidence.EXACT
                parsed_line.match_source = "vendor_items"
                result.append(parsed_line)
                continue

        # Try SKU similarity
        if vendor_sku:
            product = db.query(Product).filter(
                Product.sku.ilike(f"%{vendor_sku}%"),
                Product.active.is_(True),
            ).first()

            if product:
                parsed_line.matched_product_id = product.id
                parsed_line.matched_product_sku = product.sku
                parsed_line.matched_product_name = product.name
                parsed_line.match_confidence = MatchConfidence.FUZZY
                parsed_line.match_source = "sku_similarity"
                result.append(parsed_line)
                continue

        # Try description match
        if description:
            words = description.split()[:2]
            for word in words:
                if len(word) >= 4:
                    product = db.query(Product).filter(
                        Product.name.ilike(f"%{word}%"),
                        Product.active.is_(True),
                    ).first()

                    if product:
                        parsed_line.matched_product_id = product.id
                        parsed_line.matched_product_sku = product.sku
                        parsed_line.matched_product_name = product.name
                        parsed_line.match_confidence = MatchConfidence.FUZZY
                        parsed_line.match_source = f"description_contains_{word}"
                        break

        result.append(parsed_line)

    return result


def parse_invoice(
    db: Session,
    file_bytes: bytes,
    filename: str,
    vendor_id: Optional[int] = None,
    use_vision: bool = False,
) -> ParsedInvoice:
    """
    Parse an invoice file and return structured data.

    Args:
        db: Database session
        file_bytes: Raw file content
        filename: Original filename (for type detection)
        vendor_id: Pre-selected vendor ID (optional)
        use_vision: Use Claude vision for PDFs (slower but better for scanned docs)

    Returns:
        ParsedInvoice with matched products
    """
    start_time = time.time()
    warnings = []

    # Determine file type
    ext = filename.lower().split('.')[-1] if '.' in filename else ''

    try:
        if ext == 'csv':
            # Direct CSV parsing
            raw_data = _parse_csv_invoice(file_bytes)
            raw_text = file_bytes.decode('utf-8-sig')[:2000]

        elif ext == 'pdf':
            if use_vision:
                # Use Claude vision for scanned/image PDFs
                raw_data = _parse_with_claude_vision(file_bytes)
                raw_text = "(PDF processed via vision)"
            else:
                # Extract text and use Claude
                text = _extract_text_from_pdf(file_bytes)
                if len(text.strip()) < 50:
                    warnings.append("PDF has minimal text - may be scanned. Consider re-parsing with vision mode.")
                raw_data = _parse_with_claude(text)
                raw_text = text[:2000]
        else:
            raise ValueError(f"Unsupported file type: {ext}")

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude response: {e}")
        raise ValueError(f"Failed to parse invoice structure: {e}")
    except Exception as e:
        logger.error(f"Invoice parsing failed: {e}")
        raise

    # Match vendor
    vendor_name = raw_data.get("vendor_name", "Unknown")
    if not vendor_id:
        vendor_id, vendor_confidence = _match_vendor(db, vendor_name)
    else:
        vendor_confidence = MatchConfidence.EXACT

    # Match products
    lines = _match_products(db, raw_data.get("lines", []), vendor_id)

    # Parse dates
    invoice_date = None
    due_date = None
    try:
        if raw_data.get("invoice_date"):
            invoice_date = datetime.strptime(raw_data["invoice_date"], "%Y-%m-%d").date()
        if raw_data.get("due_date"):
            due_date = datetime.strptime(raw_data["due_date"], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        warnings.append("Could not parse invoice date")

    # Calculate stats
    matched_count = sum(1 for item in lines if item.matched_product_id)
    unmapped_count = len(lines) - matched_count

    processing_time_ms = int((time.time() - start_time) * 1000)
    logger.info(f"Parsed invoice in {processing_time_ms}ms: {len(lines)} lines, {matched_count} matched")

    return ParsedInvoice(
        vendor_name=vendor_name,
        vendor_id=vendor_id,
        vendor_confidence=vendor_confidence,
        invoice_number=raw_data.get("invoice_number", ""),
        invoice_date=invoice_date,
        due_date=due_date,
        subtotal=Decimal(str(raw_data.get("subtotal") or 0)),
        tax=Decimal(str(raw_data.get("tax") or 0)),
        shipping=Decimal(str(raw_data.get("shipping") or 0)),
        total=Decimal(str(raw_data.get("total") or 0)),
        lines=lines,
        line_count=len(lines),
        matched_count=matched_count,
        unmapped_count=unmapped_count,
        warnings=warnings,
        raw_text=raw_text,
    )
