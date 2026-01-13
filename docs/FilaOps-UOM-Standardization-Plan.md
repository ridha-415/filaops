# FilaOps UOM Standardization - Complete Implementation Plan v2

## Document Purpose

This document provides a complete implementation plan for standardizing Unit of Measure (UOM) handling in FilaOps. It is intended for implementation by an AI coding assistant (VS Code Claude) and includes full context, logic explanations, and step-by-step instructions.

**Version 2 Changes:**
- Relaxed validation to support future CNC/laser materials (not just filament)
- Renamed `MATERIAL_UOM` → `DEFAULT_MATERIAL_UOM` (it's a default, not a requirement)
- Added cost conversion helper functions
- Fixed frontend double-configuration risk
- Conservative migration (Option A) - only fix clearly broken configs
- Added placeholder for future "material profile" selector

---

## Problem Statement

FilaOps has persistent UOM-related bugs causing incorrect inventory quantities and cost calculations. The root causes are:

1. **Scattered UOM logic** - Conversion factors and material detection are duplicated across 6+ files
2. **Missing `purchase_factor`** - Materials created via `material_service.py` don't set `purchase_factor`, causing PO receiving to guess conversions
3. **Inconsistent material detection** - Some code checks `material_type_id`, other code checks `item_type`, leading to missed cases
4. **No single source of truth** - When a value needs to change, multiple files must be updated

---

## Solution Architecture

### Core Principle: Single Source of Truth

All UOM configuration for materials will live in ONE file: `backend/app/core/uom_config.py`

Every other file that needs UOM information will import from this file. No more scattered constants.

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Default storage unit = Grams (G) | Precision for 3D printing consumption tracking |
| Default purchase unit = Kilograms (KG) | How vendors typically sell filament |
| Default purchase factor = 1000 | 1 KG = 1000 G |
| Cost stored per purchase_uom (KG) | Industry standard, matches vendor pricing |
| New `item_type='material'` | Explicit identification without relying on SKU prefixes |
| **Flexible validation** | Validates consistency, not specific values (supports CNC/laser materials) |
| **Defaults are suggestions** | Auto-populate G/KG/1000 but allow full override |

### Cost Storage Convention

**Costs are stored per purchase_uom (KG for filament):**
- Matches vendor invoices ($25/KG, not $0.025/G)
- PO line items naturally display in this unit
- Human-readable for operators

**Inventory valuation formula:**
```
inventory_value = quantity_in_storage_unit × (cost_per_purchase_uom / purchase_factor)
Example: 500 G × ($25/KG / 1000) = 500 × $0.025 = $12.50
```

### Roll Size Clarification

The `purchase_factor` is the **unit conversion**, not the package size:

| Roll Size | PO Quantity | purchase_uom | unit | purchase_factor | Inventory Added |
|-----------|-------------|--------------|------|-----------------|-----------------|
| 250g roll | 0.25 KG | KG | G | 1000 | 250 G |
| 500g roll | 0.5 KG | KG | G | 1000 | 500 G |
| 1kg roll | 1 KG | KG | G | 1000 | 1000 G |
| 3kg roll | 3 KG | KG | G | 1000 | 3000 G |

### Detection Priority (Most Specific to Least)

When determining if an item is a material:

1. `item_type == 'material'` (explicit, new way)
2. `item_type == 'supply' AND material_type_id IS NOT NULL` (legacy filaments)
3. Category is filament category (category-based detection)
4. SKU starts with `MAT-` or `FIL-` (legacy SKU-based detection)

### Future Extensibility

FilaOps may be used for CNC and laser operations. The architecture supports different material profiles:

| Material Type | Storage Unit | Purchase Unit | Factor | Example |
|---------------|--------------|---------------|--------|---------|
| Filament (default) | G | KG | 1000 | 3D printing filament |
| Sheet stock | EA | EA | 1 | Plywood, acrylic sheets |
| Bar/rod stock | IN | FT | 12 | Aluminum bar |
| Resin | ML | L | 1000 | SLA/resin printing |

**For v1:** Default to filament profile (G/KG/1000), allow manual override.
**Future:** Add material profile dropdown selector.

---

## Current File Inventory

These files contain UOM-related code that will be modified:

| File | Current State | Changes Needed |
|------|--------------|----------------|
| `backend/app/core/uom_config.py` | Does not exist | CREATE - Central config |
| `backend/app/services/uom_service.py` | Good, has conversions | Minor - Import centralized config |
| `backend/app/services/product_uom_service.py` | Missing purchase_factor | UPDATE - Use centralized config |
| `backend/app/services/inventory_helpers.py` | Only checks material_type_id | UPDATE - Add item_type check |
| `backend/app/services/material_service.py` | Missing purchase_factor | UPDATE - Use centralized config |
| `backend/app/api/v1/endpoints/items.py` | Duplicated UOM dict | UPDATE - Import from uom_service |
| `backend/app/api/v1/endpoints/purchase_orders.py` | Hardcoded conversions | UPDATE - Use centralized config |
| `backend/app/schemas/item.py` | Missing MATERIAL enum | UPDATE - Add enum value |
| `backend/tests/factories.py` | Wrong defaults for materials | UPDATE - Use centralized config |
| `frontend/src/lib/uom.js` | Duplicated (acceptable) | No change needed |
| `frontend/src/components/BOMEditor.jsx` | Wrong default unit logic | UPDATE - Fix material detection |
| `frontend/src/components/ItemForm.jsx` | Missing material type | UPDATE - Add material option |
| `frontend/src/components/ItemWizard.jsx` | Missing material type | UPDATE - Add material option |
| `frontend/src/pages/admin/AdminItems.jsx` | Missing material filter | UPDATE - Add material option |

---

## Implementation Phases

### Phase 0: Create Central Configuration (Foundation)

**This phase creates the single source of truth. All subsequent phases depend on it.**

#### 0.1 Create `backend/app/core/uom_config.py`

```python
"""
UOM Configuration - Single Source of Truth

This module defines ALL UOM-related constants and logic for materials.
Every other file that needs UOM information MUST import from here.

DO NOT duplicate these values elsewhere. If you need to change material UOM
behavior, change it HERE and it will propagate everywhere.

DEFAULT RULES FOR MATERIALS (Filament):
- Storage unit: G (grams) - for precision tracking of consumption
- Purchase unit: KG (kilograms) - how vendors sell filament
- Purchase factor: 1000 - conversion from KG to G (1 KG = 1000 G)
- Cost reference: KG - costs (standard_cost, last_cost) are stored as $/KG
- is_raw_material: True - materials are consumed in production

NOTE: These are DEFAULTS for filament. CNC/laser users may use different
UOM configurations (e.g., sheets as EA/EA/1, bar stock as IN/FT/12).
Validation checks consistency, not specific values.

COST CALCULATION EXAMPLE:
- Filament purchased at $25/KG
- Inventory shows 500 G on hand
- Inventory value = 500 G × ($25/KG ÷ 1000) = 500 × $0.025 = $12.50

ROLL SIZE CLARIFICATION:
- purchase_factor is the UNIT CONVERSION, not package size
- A 500g roll is simply 0.5 KG on the PO line
- purchase_factor stays at 1000 regardless of roll size
"""
from decimal import Decimal
from typing import NamedTuple, Optional, List


class UOMConfig(NamedTuple):
    """Configuration for a product's unit of measure settings."""
    unit: str                    # Storage/consumption unit (G for filament)
    purchase_uom: str            # How vendors sell it (KG for filament)
    purchase_factor: Decimal     # Conversion: purchase_uom -> unit (1000 for KG->G)
    is_raw_material: bool        # Whether this is consumed in production
    cost_reference_unit: str     # What unit costs are stored per (KG for filament)


# =============================================================================
# MATERIAL UOM PROFILES
# =============================================================================
# These are named profiles for common material types.
# DEFAULT_MATERIAL_UOM is used when creating new materials.
# Users can override these values for CNC/laser/other applications.

# Filament profile - default for 3D printing (most FilaOps users)
FILAMENT_UOM = UOMConfig(
    unit="G",                           # Store and consume in grams
    purchase_uom="KG",                  # Buy in kilograms
    purchase_factor=Decimal("1000"),    # 1 KG = 1000 G
    is_raw_material=True,               # Consumed in production
    cost_reference_unit="KG"            # Costs are $/KG
)

# Sheet stock profile - for CNC/laser (placeholder for future)
SHEET_UOM = UOMConfig(
    unit="EA",                          # Store in each (per sheet)
    purchase_uom="EA",                  # Buy in each
    purchase_factor=Decimal("1"),       # No conversion
    is_raw_material=True,               # Consumed in production
    cost_reference_unit="EA"            # Costs are $/EA
)

# Linear stock profile - for CNC (placeholder for future)
LINEAR_UOM = UOMConfig(
    unit="IN",                          # Store in inches
    purchase_uom="FT",                  # Buy in feet
    purchase_factor=Decimal("12"),      # 1 FT = 12 IN
    is_raw_material=True,               # Consumed in production
    cost_reference_unit="FT"            # Costs are $/FT
)

# Resin profile - for SLA printing (placeholder for future)
RESIN_UOM = UOMConfig(
    unit="ML",                          # Store in milliliters
    purchase_uom="L",                   # Buy in liters
    purchase_factor=Decimal("1000"),    # 1 L = 1000 ML
    is_raw_material=True,               # Consumed in production
    cost_reference_unit="L"             # Costs are $/L
)

# Default for item_type='material' - filament for 3D printing
# Users can override when creating materials for CNC/laser/etc.
DEFAULT_MATERIAL_UOM = FILAMENT_UOM

# Default for non-material items
DEFAULT_UOM = UOMConfig(
    unit="EA",                          # Store in each
    purchase_uom="EA",                  # Buy in each
    purchase_factor=Decimal("1"),       # No conversion
    is_raw_material=False,              # Not a raw material
    cost_reference_unit="EA"            # Costs are $/EA
)

# Future: Material profile selector options
# This will be used by a dropdown in the UI to pre-fill UOM values
MATERIAL_PROFILES = {
    "filament": FILAMENT_UOM,
    "sheet": SHEET_UOM,
    "linear": LINEAR_UOM,
    "resin": RESIN_UOM,
    # "custom" would use user-entered values
}


# =============================================================================
# MATERIAL DETECTION FUNCTIONS
# =============================================================================

def is_material_item_type(item_type: Optional[str]) -> bool:
    """
    Check if item_type indicates a material product.
    
    Handles both enum values and plain strings.
    
    Args:
        item_type: The item_type value (string or enum)
        
    Returns:
        True if item_type is 'material'
    """
    if not item_type:
        return False
    # Handle both enum and string values
    item_type_str = item_type.value if hasattr(item_type, 'value') else str(item_type)
    return item_type_str.lower() == 'material'


def is_material(
    item_type: Optional[str] = None,
    material_type_id: Optional[int] = None,
) -> bool:
    """
    Determine if a product is a material (filament, sheet stock, etc.).
    
    Detection priority:
    1. item_type == 'material' (explicit, preferred)
    2. material_type_id is not None (legacy filament detection)
    
    Args:
        item_type: The product's item_type field
        material_type_id: The product's material_type_id field
        
    Returns:
        True if the product is a material
    """
    # Priority 1: Explicit item_type='material'
    if is_material_item_type(item_type):
        return True
    
    # Priority 2: Legacy detection via material_type_id
    if material_type_id is not None:
        return True
    
    return False


def get_uom_config(
    item_type: Optional[str] = None,
    material_type_id: Optional[int] = None,
    category_is_filament: bool = False,
    sku: Optional[str] = None,
) -> UOMConfig:
    """
    Get the UOM configuration for a product.
    
    This is the SINGLE FUNCTION that determines UOM settings.
    All UOM decisions should flow through this function.
    
    Detection priority (most specific to least):
    1. item_type == 'material' (explicit)
    2. item_type == 'supply' AND material_type_id IS NOT NULL (legacy)
    3. category_is_filament == True (category-based)
    4. SKU starts with 'MAT-' or 'FIL-' (SKU-based fallback)
    
    Args:
        item_type: Product's item_type field
        material_type_id: Product's material_type_id field
        category_is_filament: Whether product's category is a filament category
        sku: Product's SKU (for fallback detection)
        
    Returns:
        UOMConfig with appropriate settings (DEFAULT_MATERIAL_UOM for materials)
    """
    # Normalize item_type to lowercase string
    item_type_str = None
    if item_type:
        item_type_str = item_type.value if hasattr(item_type, 'value') else str(item_type)
        item_type_str = item_type_str.lower()
    
    # Priority 1: Explicit item_type='material'
    if item_type_str == 'material':
        return DEFAULT_MATERIAL_UOM
    
    # Priority 2: Legacy - supply with material_type_id
    if item_type_str == 'supply' and material_type_id is not None:
        return DEFAULT_MATERIAL_UOM
    
    # Priority 3: Category-based detection
    if category_is_filament:
        return DEFAULT_MATERIAL_UOM
    
    # Priority 4: SKU prefix fallback
    if sku:
        sku_upper = sku.upper()
        if sku_upper.startswith(('MAT-', 'FIL-')):
            return DEFAULT_MATERIAL_UOM
    
    return DEFAULT_UOM


def get_uom_config_for_product(product) -> UOMConfig:
    """
    Convenience function to get UOM config directly from a Product model.
    
    Args:
        product: A Product model instance
        
    Returns:
        UOMConfig with appropriate settings
    """
    return get_uom_config(
        item_type=getattr(product, 'item_type', None),
        material_type_id=getattr(product, 'material_type_id', None),
        sku=getattr(product, 'sku', None),
    )


# =============================================================================
# COST CALCULATION HELPERS
# =============================================================================

def get_cost_per_storage_unit(
    cost: Decimal,
    purchase_factor: Decimal,
) -> Decimal:
    """
    Convert cost from purchase_uom to storage unit for inventory valuation.
    
    Example: $25/KG with factor 1000 → $0.025/G
    
    Args:
        cost: Cost per purchase_uom (e.g., $/KG)
        purchase_factor: Conversion factor (e.g., 1000 for KG→G)
        
    Returns:
        Cost per storage unit (e.g., $/G)
    """
    if not cost or not purchase_factor:
        return Decimal("0")
    return cost / purchase_factor


def get_inventory_value(
    quantity_in_storage_unit: Decimal,
    cost_per_purchase_uom: Decimal,
    purchase_factor: Decimal,
) -> Decimal:
    """
    Calculate inventory value given quantity and cost.
    
    Example: 500 G × ($25/KG ÷ 1000) = $12.50
    
    Args:
        quantity_in_storage_unit: Quantity in storage units (e.g., grams)
        cost_per_purchase_uom: Cost per purchase UOM (e.g., $/KG)
        purchase_factor: Conversion factor (e.g., 1000 for KG→G)
        
    Returns:
        Inventory value in dollars
    """
    cost_per_unit = get_cost_per_storage_unit(cost_per_purchase_uom, purchase_factor)
    return quantity_in_storage_unit * cost_per_unit


def get_inventory_value_for_product(
    product,
    quantity_in_storage_unit: Decimal,
) -> Decimal:
    """
    Calculate inventory value for a product.
    
    Uses product's cost fields (standard_cost, average_cost, last_cost) in priority order.
    
    Args:
        product: Product model instance
        quantity_in_storage_unit: Quantity in storage units
        
    Returns:
        Inventory value in dollars
    """
    cost = (
        getattr(product, 'standard_cost', None) or
        getattr(product, 'average_cost', None) or
        getattr(product, 'last_cost', None) or
        Decimal("0")
    )
    purchase_factor = getattr(product, 'purchase_factor', None) or Decimal("1")
    
    return get_inventory_value(quantity_in_storage_unit, cost, purchase_factor)


# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

def validate_material_uom(
    unit: Optional[str],
    purchase_uom: Optional[str],
    purchase_factor: Optional[Decimal],
) -> List[str]:
    """
    Validate that a material's UOM configuration is INTERNALLY CONSISTENT.
    
    Does NOT require specific values (G/KG/1000) - allows CNC/laser materials
    with different UOM configurations (e.g., EA/EA/1 for sheets).
    
    Validates:
    - All three fields are present
    - purchase_factor is positive
    - If unit == purchase_uom, factor should be 1
    
    Args:
        unit: The product's storage unit
        purchase_uom: The product's purchase UOM
        purchase_factor: The product's purchase factor
        
    Returns:
        List of error messages (empty list = valid)
    """
    errors = []
    
    # Must have all three fields
    if not unit:
        errors.append("Material must have a storage unit (e.g., G, EA, IN)")
    
    if not purchase_uom:
        errors.append("Material must have a purchase UOM (e.g., KG, EA, FT)")
    
    if not purchase_factor or purchase_factor <= 0:
        errors.append("Material must have a positive purchase factor")
    
    # If same unit, factor should be 1
    if unit and purchase_uom and purchase_factor:
        if unit.upper() == purchase_uom.upper() and purchase_factor != Decimal("1"):
            errors.append(
                f"When unit and purchase_uom are both '{unit}', "
                f"purchase_factor should be 1, not {purchase_factor}"
            )
    
    return errors


def validate_uom_consistency(
    unit: Optional[str],
    purchase_uom: Optional[str],
    purchase_factor: Optional[Decimal],
) -> List[str]:
    """
    Validate UOM configuration for any product (not just materials).
    
    Less strict than validate_material_uom - allows missing values
    for non-material products.
    
    Args:
        unit: The product's storage unit
        purchase_uom: The product's purchase UOM
        purchase_factor: The product's purchase factor
        
    Returns:
        List of error messages (empty list = valid)
    """
    errors = []
    
    # If purchase_factor is set, it should be positive
    if purchase_factor is not None and purchase_factor <= 0:
        errors.append("purchase_factor must be positive")
    
    # If unit and purchase_uom are the same, factor should be 1 (if set)
    if unit and purchase_uom and purchase_factor:
        if unit.upper() == purchase_uom.upper() and purchase_factor != Decimal("1"):
            errors.append(
                f"When unit and purchase_uom are both '{unit}', "
                f"purchase_factor should be 1"
            )
    
    return errors


def get_material_sku_prefixes() -> tuple:
    """Return valid SKU prefixes for materials."""
    return ('MAT-', 'FIL-')


def get_default_material_sku_prefix() -> str:
    """Return the default SKU prefix for new materials."""
    return 'MAT'
```

#### 0.2 Create `backend/app/core/__init__.py` (if it doesn't exist)

```python
"""Core application configuration and constants."""
```

---

### Phase 1: Fix Critical Backend Bugs

**These fixes address the immediate causes of UOM bugs.**

#### 1.1 Update `backend/app/services/inventory_helpers.py`

**Current code has a bug:** It only checks `material_type_id`, missing items with `item_type='material'`.

**Replace the entire file with:**

```python
"""
Inventory Helper Functions

Utilities for handling material vs. non-material items in the inventory system.

IMPORTANT: This module uses the centralized UOM config. Do not hardcode
material detection logic here - use the functions from uom_config.py
"""
from decimal import Decimal
from app.models.product import Product
from app.core.uom_config import (
    is_material as _is_material,
    get_uom_config_for_product,
    get_inventory_value_for_product,
    DEFAULT_MATERIAL_UOM,
)


def is_material(product: Product) -> bool:
    """
    Check if a product is a material (filament, sheet stock, etc.).
    
    Materials are identified by:
    1. item_type == 'material' (explicit, preferred)
    2. material_type_id is not None (legacy filaments)
    
    Args:
        product: Product model instance
    
    Returns:
        True if product is a material, False otherwise
    """
    return _is_material(
        item_type=product.item_type,
        material_type_id=product.material_type_id,
    )


def get_transaction_unit(product: Product) -> str:
    """
    Get the unit to use for inventory transactions.
    
    Uses the product's configured unit, falling back to defaults.
    
    Args:
        product: Product model instance
    
    Returns:
        Unit string (product.unit or "EA" as fallback)
    """
    return product.unit or "EA"


def convert_to_transaction_unit(quantity: float, from_unit: str, product: Product) -> float:
    """
    Convert quantity to the transaction unit for a product.
    
    For materials: Converts to storage unit using standard conversion factors
    For others: Returns quantity as-is (no conversion)
    
    Args:
        quantity: Quantity in from_unit
        from_unit: Source unit (KG, LB, EA, etc.)
        product: Product model instance
    
    Returns:
        Quantity in transaction unit
    """
    if not is_material(product):
        # Non-materials: no conversion needed
        return quantity
    
    # Materials: Convert to storage unit
    from_unit_upper = (from_unit or '').upper().strip()
    to_unit_upper = (product.unit or 'G').upper().strip()
    
    # If same unit, no conversion
    if from_unit_upper == to_unit_upper:
        return quantity
    
    # Conversion factors to grams (for mass-based materials)
    conversion_to_grams = {
        'G': 1.0,
        'KG': 1000.0,
        'LB': 453.592,
        'OZ': 28.3495,
    }
    
    # Conversion factors to milliliters (for volume-based materials like resin)
    conversion_to_ml = {
        'ML': 1.0,
        'L': 1000.0,
        'GAL': 3785.41,
    }
    
    # Conversion factors to inches (for linear materials)
    conversion_to_inches = {
        'IN': 1.0,
        'FT': 12.0,
        'M': 39.3701,
        'CM': 0.393701,
    }
    
    # Try mass conversion (most common for filament)
    if from_unit_upper in conversion_to_grams and to_unit_upper in conversion_to_grams:
        from_factor = conversion_to_grams[from_unit_upper]
        to_factor = conversion_to_grams[to_unit_upper]
        return quantity * from_factor / to_factor
    
    # Try volume conversion (for resin)
    if from_unit_upper in conversion_to_ml and to_unit_upper in conversion_to_ml:
        from_factor = conversion_to_ml[from_unit_upper]
        to_factor = conversion_to_ml[to_unit_upper]
        return quantity * from_factor / to_factor
    
    # Try linear conversion (for bar stock)
    if from_unit_upper in conversion_to_inches and to_unit_upper in conversion_to_inches:
        from_factor = conversion_to_inches[from_unit_upper]
        to_factor = conversion_to_inches[to_unit_upper]
        return quantity * from_factor / to_factor
    
    # Unknown unit - log warning and return original
    import logging
    logging.warning(
        f"Unknown unit conversion '{from_unit}' to '{product.unit}' "
        f"for product {product.sku}, returning original quantity"
    )
    return quantity


def get_purchase_factor(product: Product) -> float:
    """
    Get the purchase factor for a product.
    
    The purchase factor converts from purchase_uom to unit.
    Uses product's configured value, falling back to defaults.
    
    Args:
        product: Product model instance
        
    Returns:
        Purchase factor as float
    """
    if product.purchase_factor:
        return float(product.purchase_factor)
    
    # Fallback for legacy materials without purchase_factor
    if is_material(product):
        return float(DEFAULT_MATERIAL_UOM.purchase_factor)
    
    return 1.0


def calculate_inventory_value(product: Product, quantity: Decimal) -> Decimal:
    """
    Calculate inventory value for a given quantity.
    
    Args:
        product: Product model instance
        quantity: Quantity in storage units
        
    Returns:
        Inventory value in dollars
    """
    return get_inventory_value_for_product(product, quantity)
```

#### 1.2 Update `backend/app/services/material_service.py`

**Current bug:** Missing `purchase_factor` when creating material products.

**Find the `create_material_product` function (around line 240-280) and update it:**

```python
def create_material_product(
    db: Session,
    material_type_code: str,
    color_code: str,
    commit: bool = True
) -> Product:
    """
    Creates a 'material' type Product for a given material and color.

    This function is the single source for creating material products, ensuring
    that a corresponding Inventory record is also created.
    
    UOM Configuration (from centralized config):
    - unit: G (grams) - storage/consumption unit
    - purchase_uom: KG (kilograms) - how vendors sell it
    - purchase_factor: 1000 - conversion factor (1 KG = 1000 G)
    - is_raw_material: True
    
    Cost is stored per purchase_uom ($/KG), matching vendor pricing.

    Args:
        db: Database session
        material_type_code: The code of the material type (e.g., 'PLA_BASIC')
        color_code: The code of the color (e.g., 'BLK')
        commit: Whether to commit the transaction

    Returns:
        The newly created Product object.
    """
    # Import centralized config
    from app.core.uom_config import DEFAULT_MATERIAL_UOM
    
    material_type = get_material_type(db, material_type_code)
    color = get_color(db, color_code)

    # Generate SKU from material and color
    sku = f"MAT-{material_type.code}-{color.code}"

    # Check if product already exists
    existing_product = db.query(Product).filter(Product.sku == sku).first()
    if existing_product:
        return existing_product

    # Create the new product with centralized UOM config
    new_product = Product(
        sku=sku,
        name=f"{material_type.name} - {color.name}",
        description=f"Filament material: {material_type.name} in {color.name}",
        item_type='material',  # Use explicit material type
        procurement_type='buy',
        unit=DEFAULT_MATERIAL_UOM.unit,  # G (from config)
        purchase_uom=DEFAULT_MATERIAL_UOM.purchase_uom,  # KG (from config)
        purchase_factor=DEFAULT_MATERIAL_UOM.purchase_factor,  # 1000 (from config)
        standard_cost=material_type.base_price_per_kg,  # Cost is $/KG
        is_raw_material=DEFAULT_MATERIAL_UOM.is_raw_material,  # True (from config)
        material_type_id=material_type.id,
        color_id=color.id,
        active=True
    )
    db.add(new_product)
    db.flush()  # To get the product ID

    # Ensure an inventory record exists for the new product
    # Get default location
    location = db.query(InventoryLocation).filter(InventoryLocation.code == 'MAIN').first()
    if not location:
        location = InventoryLocation(name="Main Warehouse", code="MAIN", type="warehouse")
        db.add(location)
        db.flush()

    inventory_record = Inventory(
        product_id=new_product.id,
        location_id=location.id,
        on_hand_quantity=0,
        allocated_quantity=0
    )
    db.add(inventory_record)

    if commit:
        db.commit()

    return new_product
```

**Also add the import at the top of the file:**

```python
from app.models.inventory import Inventory, InventoryLocation
```

---

### Phase 2: Update Schema to Add Material Item Type

#### 2.1 Update `backend/app/schemas/item.py`

**Find the `ItemType` enum (around line 21-26) and add the MATERIAL value:**

```python
class ItemType(str, Enum):
    """Types of items in the system"""
    FINISHED_GOOD = "finished_good"  # Sellable products
    COMPONENT = "component"          # Parts used in assembly
    SUPPLY = "supply"                # Consumables and supplies
    SERVICE = "service"              # Non-physical services
    MATERIAL = "material"            # Raw materials (filament, sheet stock, etc.) - auto-configures UOM
```

---

### Phase 3: Update Product UOM Service

#### 3.1 Update `backend/app/services/product_uom_service.py`

**Replace the entire file to use centralized config:**

```python
"""
Product UOM Service

Provides validation and auto-configuration for product units of measure.
Uses centralized configuration from app.core.uom_config.

IMPORTANT: All UOM constants come from uom_config.py - do not hardcode here.
"""
from typing import Optional, Tuple
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.item_category import ItemCategory
from app.core.uom_config import (
    DEFAULT_MATERIAL_UOM,
    DEFAULT_UOM,
    get_uom_config,
    is_material,
    validate_material_uom,
    validate_uom_consistency,
    get_material_sku_prefixes,
)


# Category codes that indicate filament (continuous materials)
FILAMENT_CATEGORY_CODES = {
    'FILAMENT', 'PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'NYLON',
    'PLA_BASIC', 'PLA_MATTE', 'PLA_SILK', 'PLA_SILK_MULTI',
    'PETG_BASIC', 'PETG_HF', 'PETG_CF', 'PETG_TRANSLUCENT',
    'ABS_GF', 'TPU_68D', 'TPU_95A', 'MATERIAL', 'MATERIALS',
}


def is_filament_category(db: Session, category_id: Optional[int]) -> bool:
    """
    Check if a category (or its parent) is a filament category.
    
    Walks up the category tree to check for filament indicators.
    """
    if not category_id:
        return False
    
    # Walk up the category tree
    category = db.query(ItemCategory).filter(ItemCategory.id == category_id).first()
    while category:
        if category.code and category.code.upper() in FILAMENT_CATEGORY_CODES:
            return True
        if category.parent_id:
            category = db.query(ItemCategory).filter(ItemCategory.id == category.parent_id).first()
        else:
            break
    
    return False


def is_filament_sku(sku: Optional[str]) -> bool:
    """Check if SKU indicates a filament/material product."""
    if not sku:
        return False
    return sku.upper().startswith(get_material_sku_prefixes())


def is_hardware_sku(sku: Optional[str]) -> bool:
    """Check if SKU indicates a hardware product."""
    if not sku:
        return False
    return sku.upper().startswith(('HW-',))


def get_recommended_uoms(
    db: Session,
    sku: Optional[str] = None,
    category_id: Optional[int] = None,
    item_type: Optional[str] = None,
) -> Tuple[str, str, bool, Decimal]:
    """
    Get recommended UOM settings based on SKU, category, and item_type.
    
    Returns:
        Tuple of (purchase_uom, unit, is_raw_material, purchase_factor)
        
    Detection priority:
    1. item_type == 'material' (explicit)
    2. Category is filament category
    3. SKU starts with material prefix
    """
    # Use centralized config
    uom_config = get_uom_config(
        item_type=item_type,
        category_is_filament=is_filament_category(db, category_id),
        sku=sku,
    )
    
    return (
        uom_config.purchase_uom,
        uom_config.unit,
        uom_config.is_raw_material,
        uom_config.purchase_factor,
    )


def validate_product_uoms(
    db: Session,
    product: Product,
) -> Tuple[bool, Optional[str]]:
    """
    Validate that a product's UOMs are correctly configured.
    
    For materials: Validates consistency (all fields present, factor positive)
    For others: Basic validation only
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Determine if this should be a material
    is_mat = is_material(
        item_type=product.item_type,
        material_type_id=product.material_type_id,
    )
    
    if not is_mat:
        # Also check by SKU and category
        if is_filament_sku(product.sku) or is_filament_category(db, product.category_id):
            is_mat = True
    
    if is_mat:
        # Validate material UOM configuration (consistency check)
        errors = validate_material_uom(
            unit=product.unit,
            purchase_uom=product.purchase_uom,
            purchase_factor=product.purchase_factor,
        )
        
        # Additional validation: is_raw_material should be True
        if not product.is_raw_material:
            errors.append("Material products should have is_raw_material=True")
        
        if errors:
            return (False, "; ".join(errors))
    else:
        # Non-material: basic consistency check
        errors = validate_uom_consistency(
            unit=product.unit,
            purchase_uom=product.purchase_uom,
            purchase_factor=product.purchase_factor,
        )
        
        if errors:
            return (False, "; ".join(errors))
    
    return (True, None)


def auto_configure_product_uoms(
    db: Session,
    product: Product,
    force: bool = False,
) -> bool:
    """
    Auto-configure a product's UOMs based on detection logic.
    
    Uses DEFAULT_MATERIAL_UOM (filament profile: G/KG/1000) for materials.
    Users can override after creation for CNC/laser materials.
    
    Args:
        db: Database session
        product: Product to configure
        force: If True, overwrite existing values. If False, only set if not already set.
    
    Returns:
        True if changes were made
    """
    purchase_uom, unit, is_raw_material, purchase_factor = get_recommended_uoms(
        db,
        sku=product.sku,
        category_id=product.category_id,
        item_type=product.item_type,
    )
    
    changed = False
    
    # Update purchase_uom
    if force or not product.purchase_uom:
        if product.purchase_uom != purchase_uom:
            product.purchase_uom = purchase_uom
            changed = True
    
    # Update unit
    if force or not product.unit or product.unit == 'EA':
        if product.unit != unit:
            product.unit = unit
            changed = True
    
    # Update purchase_factor
    if force or not product.purchase_factor:
        if product.purchase_factor != purchase_factor:
            product.purchase_factor = purchase_factor
            changed = True
    
    # Update is_raw_material
    if force or not product.is_raw_material:
        if product.is_raw_material != is_raw_material and is_raw_material:
            product.is_raw_material = is_raw_material
            changed = True
    
    return changed


def get_cost_display_info(product: Product) -> dict:
    """
    Get display information for product cost.
    
    Returns dict with:
        - cost: The effective cost value
        - cost_unit: What the cost is per (e.g., 'KG', 'EA')
        - storage_unit: What inventory is tracked in
        - needs_conversion: Whether cost conversion is needed
    """
    purchase_uom = (product.purchase_uom or product.unit or 'EA').upper()
    storage_unit = (product.unit or 'EA').upper()
    cost = product.standard_cost or product.average_cost or product.last_cost
    
    return {
        'cost': float(cost) if cost else None,
        'cost_unit': purchase_uom,
        'storage_unit': storage_unit,
        'needs_conversion': purchase_uom != storage_unit,
        'cost_display': f"${float(cost):.2f}/{purchase_uom}" if cost else None,
    }
```

---

### Phase 4: Update Items API Endpoint

#### 4.1 Update `backend/app/api/v1/endpoints/items.py`

**Make these specific changes:**

##### 4.1.1 Remove the duplicated `UOM_CONVERSIONS` dictionary (around line 40-70).

Delete this entire block:

```python
# DELETE THIS ENTIRE BLOCK
UOM_CONVERSIONS = {
    'G': {'base': 'KG', 'factor': Decimal('0.001')},
    # ... etc
}
```

##### 4.1.2 Remove the `convert_uom_inline` function (around line 75-95).

Delete this entire function.

##### 4.1.3 Add imports at the top of the file:

```python
from app.core.uom_config import (
    DEFAULT_MATERIAL_UOM,
    get_uom_config,
    is_material,
    get_default_material_sku_prefix,
)
from app.services.uom_service import convert_quantity_safe
```

##### 4.1.4 Update the `create_item` function to auto-configure materials:

Find the `create_item` function and update the item creation logic. After the SKU generation and before creating the Product, add:

```python
@router.post("", response_model=ItemResponse, status_code=201)
async def create_item(
    request: ItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new item"""
    # Auto-generate SKU if not provided
    if not request.sku or request.sku.strip() == "":
        # Get item_type as string
        item_type_value = request.item_type.value if hasattr(request.item_type, 'value') else str(request.item_type)
        
        # Generate SKU based on item type
        item_type_prefix = {
            "finished_good": "FG",
            "component": "COMP",
            "supply": "SUP",
            "service": "SRV",
            "material": get_default_material_sku_prefix(),  # "MAT"
        }.get(item_type_value, "ITM")
        
        # Find the highest existing SKU with this prefix
        existing_skus = db.query(Product.sku).filter(
            Product.sku.like(f"{item_type_prefix}-%")
        ).all()
        
        max_num = 0
        for (sku,) in existing_skus:
            try:
                parts = sku.split("-")
                if len(parts) >= 2:
                    num = int(parts[-1])
                    max_num = max(max_num, num)
            except (ValueError, IndexError):
                pass
        
        new_num = max_num + 1
        request.sku = f"{item_type_prefix}-{new_num:03d}"
    
    # Check for duplicate SKU
    existing = db.query(Product).filter(Product.sku == request.sku.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"SKU '{request.sku}' already exists")

    # Validate category if provided
    if request.category_id:
        category = db.query(ItemCategory).filter(ItemCategory.id == request.category_id).first()
        if not category:
            raise HTTPException(status_code=400, detail=f"Category {request.category_id} not found")

    # Get item_type value for UOM configuration
    item_type_value = request.item_type.value if hasattr(request.item_type, 'value') else str(request.item_type)
    
    # Auto-configure UOM for materials (default to filament profile: G/KG/1000)
    # Users can override these values for CNC/laser materials
    if item_type_value == 'material':
        # Use request values if provided, otherwise use defaults
        final_unit = request.unit if request.unit else DEFAULT_MATERIAL_UOM.unit  # G
        final_purchase_uom = request.purchase_uom if request.purchase_uom else DEFAULT_MATERIAL_UOM.purchase_uom  # KG
        final_purchase_factor = request.purchase_factor if hasattr(request, 'purchase_factor') and request.purchase_factor else DEFAULT_MATERIAL_UOM.purchase_factor  # 1000
        final_is_raw_material = True  # Materials are always raw materials
    else:
        # Use provided values or defaults
        final_unit = request.unit or "EA"
        final_purchase_uom = request.purchase_uom or request.unit or "EA"
        final_purchase_factor = request.purchase_factor if hasattr(request, 'purchase_factor') else None
        final_is_raw_material = request.is_raw_material or False

    item = Product(
        sku=request.sku.upper(),
        name=request.name,
        description=request.description,
        unit=final_unit,
        purchase_uom=final_purchase_uom,
        purchase_factor=final_purchase_factor,
        item_type=item_type_value,
        procurement_type=request.procurement_type.value if request.procurement_type else "buy",
        category_id=request.category_id,
        cost_method=request.cost_method.value if request.cost_method else "average",
        standard_cost=request.standard_cost,
        selling_price=request.selling_price,
        weight_oz=request.weight_oz,
        length_in=request.length_in,
        width_in=request.width_in,
        height_in=request.height_in,
        lead_time_days=request.lead_time_days,
        min_order_qty=request.min_order_qty,
        reorder_point=request.reorder_point,
        stocking_policy=request.stocking_policy.value if request.stocking_policy else "on_demand",
        upc=request.upc,
        legacy_sku=request.legacy_sku,
        is_raw_material=final_is_raw_material,
        track_lots=request.track_lots or False,
        track_serials=request.track_serials or False,
        active=True,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    logger.info(f"Created item: {item.sku}")

    return _build_item_response(item, db)
```

##### 4.1.5 Update the `list_items` function to handle material type filtering:

Find the item_type filtering logic (around line 350-380) and update:

```python
    if item_type:
        if item_type == "filament":
            # Filaments are items with material_type_id (legacy) OR item_type='material'
            query = query.filter(
                or_(
                    Product.material_type_id.isnot(None),
                    Product.item_type == "material"
                )
            )
        elif item_type == "material":
            # Material type - includes both new item_type='material' and legacy filaments
            query = query.filter(
                or_(
                    Product.item_type == "material",
                    Product.material_type_id.isnot(None)
                )
            )
        else:
            query = query.filter(Product.item_type == item_type)
```

##### 4.1.6 Update the CSV import valid item types:

Find the line where item types are validated in the CSV import (around line 1400) and add "material":

```python
item_type_map = {
    "simple": "finished_good",
    "variable": "finished_good",
    "finished_good": "finished_good",
    "component": "component",
    "supply": "supply",
    "service": "service",
    "material": "material",      # NEW
    "filament": "material",      # Map filament to material
    "raw_material": "material",  # Map raw_material to material
}
```

##### 4.1.7 Update the `_recalculate_bom_cost` function to use centralized conversion:

Find the `_recalculate_bom_cost` function and update the UOM conversion to use the service:

```python
def _recalculate_bom_cost(bom: BOM, db: Session) -> Decimal:
    """
    Recalculate BOM total cost from component standard_costs.
    """
    from app.services.uom_service import convert_quantity_safe
    
    total = Decimal("0")

    lines = db.query(BOMLine).filter(BOMLine.bom_id == bom.id).all()

    for line in lines:
        component = db.query(Product).filter(Product.id == line.component_id).first()
        if component:
            component_cost = component.standard_cost or component.average_cost or component.last_cost
            if component_cost:
                qty = line.quantity or Decimal("0")
                scrap = line.scrap_factor or Decimal("0")
                effective_qty = qty * (1 + scrap / 100)

                component_unit = component.unit
                line_unit = line.unit

                if line_unit and component_unit and line_unit.upper() != component_unit.upper():
                    # Use service for conversion
                    converted_qty, success = convert_quantity_safe(
                        db, effective_qty, line_unit, component_unit
                    )
                    if success:
                        total += Decimal(str(component_cost)) * converted_qty
                    else:
                        # Conversion failed, use original qty
                        total += Decimal(str(component_cost)) * effective_qty
                else:
                    total += Decimal(str(component_cost)) * effective_qty

    bom.total_cost = total
    bom.updated_at = datetime.utcnow()

    return total
```

---

### Phase 5: Update Purchase Order Receiving

#### 5.1 Update `backend/app/api/v1/endpoints/purchase_orders.py`

**Add import at the top:**

```python
from app.core.uom_config import (
    get_uom_config_for_product,
    is_material,
    DEFAULT_MATERIAL_UOM,
    get_cost_per_storage_unit,
)
```

**Find the `receive_purchase_order` function and update the material detection logic.**

Around line 850-950, there's code that determines if a product is a material. Update to use centralized config:

**Replace:**

```python
# Check if this is a material (for cost handling)
is_mat = is_material(product)
```

**With:**

```python
# Check if this is a material using centralized detection
from app.core.uom_config import is_material as is_material_check
is_mat = is_material_check(
    item_type=product.item_type,
    material_type_id=product.material_type_id
)
```

**Also update the lot creation condition (around line 939):**

```python
# Create lot for materials - check both item_type and material_type_id
if product.item_type in ('supply', 'component', 'material') or product.material_type_id:
```

**Document the cost calculation flow in a comment:**

```python
# COST CALCULATION FOR MATERIALS:
# - PO line: quantity in purchase_uom (e.g., 1 KG), unit_price in $/purchase_uom (e.g., $25/KG)
# - Inventory: quantity converted to storage unit (e.g., 1000 G)
# - Cost storage: last_cost/standard_cost remain in $/purchase_uom (e.g., $25/KG)
# - Inventory value: quantity_in_G × (cost_per_KG / 1000)
#   Example: 1000 G × ($25/KG / 1000) = $25.00
```

---

### Phase 6: Update Test Factories

#### 6.1 Update `backend/tests/factories.py`

**Find the `create_test_material` function and update it:**

```python
from app.core.uom_config import DEFAULT_MATERIAL_UOM

def create_test_material(
    db: Session,
    sku: str = "TEST-MAT-001",
    name: str = "Test Material",
    material_type_id: Optional[int] = None,
    color_id: Optional[int] = None,
    standard_cost: Decimal = Decimal("25.00"),  # $/KG (costs stored per purchase_uom)
    on_hand_quantity: Decimal = Decimal("0"),
    **kwargs
) -> Product:
    """
    Create a test material product with correct UOM configuration.
    
    Uses centralized DEFAULT_MATERIAL_UOM config for consistency.
    Default is filament profile: G/KG/1000.
    
    Cost is stored per purchase_uom ($/KG), matching vendor pricing.
    """
    product = Product(
        sku=sku,
        name=name,
        item_type="material",  # Use explicit material type
        procurement_type="buy",
        unit=DEFAULT_MATERIAL_UOM.unit,  # G
        purchase_uom=DEFAULT_MATERIAL_UOM.purchase_uom,  # KG
        purchase_factor=DEFAULT_MATERIAL_UOM.purchase_factor,  # Decimal('1000')
        is_raw_material=DEFAULT_MATERIAL_UOM.is_raw_material,  # True
        standard_cost=standard_cost,  # $/KG
        material_type_id=material_type_id,
        color_id=color_id,
        active=True,
        **kwargs
    )
    db.add(product)
    db.flush()
    
    # Create inventory record if quantity provided
    if on_hand_quantity > 0:
        from app.models.inventory import Inventory, InventoryLocation
        
        location = db.query(InventoryLocation).filter(
            InventoryLocation.code == 'MAIN'
        ).first()
        
        if not location:
            location = InventoryLocation(
                name="Main Warehouse",
                code="MAIN",
                type="warehouse"
            )
            db.add(location)
            db.flush()
        
        inventory = Inventory(
            product_id=product.id,
            location_id=location.id,
            on_hand_quantity=on_hand_quantity,  # In storage unit (G)
            allocated_quantity=Decimal("0")
        )
        db.add(inventory)
    
    return product
```

---

### Phase 7: Frontend Updates

#### 7.1 Update `frontend/src/components/ItemForm.jsx`

**Find the ITEM_TYPES constant (around line 18-23) and add material:**

```javascript
const ITEM_TYPES = [
  { value: "finished_good", label: "Finished Good" },
  { value: "component", label: "Component" },
  { value: "supply", label: "Supply" },
  { value: "service", label: "Service" },
  { value: "material", label: "Material (Filament, etc.)" },  // NEW
];
```

**Add a useEffect to auto-configure material UOM (add after other useEffects):**

**IMPORTANT: Only trigger for NEW materials, not edits (prevents overwriting user changes)**

```javascript
// Auto-configure UOM when item_type changes to 'material' for NEW items only
useEffect(() => {
  // Only auto-configure for new items (no id) and not in edit mode
  if (formData.item_type === 'material' && !isEditMode && !formData.id) {
    setFormData(prev => ({
      ...prev,
      unit: prev.unit || 'G',           // Only set if not already set
      purchase_uom: prev.purchase_uom || 'KG',
      purchase_factor: prev.purchase_factor || 1000,
      is_raw_material: true,
      procurement_type: 'buy'
    }));
  }
}, [formData.item_type, isEditMode, formData.id]);
```

**Add a hint below the item_type select (in the JSX):**

```jsx
{formData.item_type === 'material' && (
  <div className="text-xs mt-1">
    <p className="text-blue-400">
      ℹ️ Default config for filament: Unit=G (grams), Purchase=KG, Factor=1000
    </p>
    <p className="text-gray-500">
      Adjust for other materials (sheets, bar stock, resin, etc.)
    </p>
  </div>
)}
```

#### 7.2 Update `frontend/src/components/ItemWizard.jsx`

**Find the ITEM_TYPES constant and add material:**

```javascript
const ITEM_TYPES = [
  { value: "finished_good", label: "Finished Good", color: "blue", defaultProcurement: "make" },
  { value: "component", label: "Component", color: "purple", defaultProcurement: "buy" },
  { value: "supply", label: "Supply", color: "green", defaultProcurement: "buy" },
  { value: "service", label: "Service", color: "gray", defaultProcurement: "buy" },
  { value: "material", label: "Material (Filament, etc.)", color: "orange", defaultProcurement: "buy" },  // NEW
];
```

**Find the SKU prefix generation logic and add material:**

```javascript
const skuPrefix = 
  item.item_type === "finished_good" ? "FG" :
  item.item_type === "component" ? "COMP" :
  item.item_type === "supply" ? "SUP" :
  item.item_type === "service" ? "SRV" :
  item.item_type === "material" ? "MAT" :  // NEW
  "ITM";
```

#### 7.3 Update `frontend/src/pages/admin/AdminItems.jsx`

**Find the ITEM_TYPES constant and add material:**

```javascript
const ITEM_TYPES = [
  { value: "finished_good", label: "Finished Good", color: "blue" },
  { value: "component", label: "Component", color: "purple" },
  { value: "supply", label: "Supply", color: "green" },
  { value: "service", label: "Service", color: "gray" },
  { value: "material", label: "Material", color: "orange" },  // NEW
];
```

**Find the stats calculation and add materials count:**

```javascript
const stats = {
  total: items.length,
  finishedGoods: items.filter((i) => i.item_type === "finished_good").length,
  components: items.filter((i) => i.item_type === "component").length,
  supplies: items.filter((i) => i.item_type === "supply").length,
  services: items.filter((i) => i.item_type === "service").length,
  materials: items.filter((i) => i.item_type === "material" || i.material_type_id).length,  // NEW
};
```

#### 7.4 Update `frontend/src/components/BOMEditor.jsx`

**Find the default unit logic (around line 290-295) and fix it:**

```javascript
// Set unit based on component - use component's configured unit
// Materials default to G (grams) for filament, but user may have customized
const defaultUnit = component.unit || 
  (component.item_type === "material" ? "G" :
   (component.item_type === "supply" && component.material_type_id) ? "G" :  // Legacy filaments
   "EA");
```

**Also update in the add component section (around line 470):**

```javascript
onChange={(e) => {
  const selectedId = e.target.value;
  const selected = allComponents.find(
    (c) => c.id === parseInt(selectedId)
  );
  
  // Use component's configured unit, with sensible fallbacks
  let defaultUnit = selected?.unit || "EA";
  if (!selected?.unit) {
    // Fallback for items without unit set
    if (selected?.item_type === "material" || 
        (selected?.item_type === "supply" && selected?.material_type_id)) {
      defaultUnit = "G";  // Default for materials
    }
  }
  
  setNewLine({
    ...newLine,
    component_id: selectedId,
    unit: defaultUnit,
  });
}}
```

#### 7.5 Update `frontend/src/components/purchasing/QuickCreateItemModal.jsx`

**Find the item_type select and add material option:**

```jsx
<select ...>
  <option value="finished_good">Finished Good</option>
  <option value="component">Component</option>
  <option value="supply">Supply</option>
  <option value="service">Service</option>
  <option value="material">Material (Filament, etc.)</option>  {/* NEW */}
</select>
```

---

### Phase 8: Data Migration (Conservative - Option A)

Create an Alembic migration to fix **only clearly broken configs**.

This migration is conservative:
- Only fixes products with `unit=G AND purchase_uom=KG AND purchase_factor IS NULL`
- Does NOT change products with intentionally different UOM configs
- Does NOT auto-migrate legacy supply+material_type_id to item_type='material'

#### 8.1 Create migration file

Run: `alembic revision -m "fix_material_uom_configuration"`

Then edit the generated file:

```python
"""fix_material_uom_configuration

Revision ID: xxxx
Revises: yyyy
Create Date: 2025-01-xx

This migration fixes UOM configuration for existing material/filament products.

CONSERVATIVE APPROACH (Option A):
- Only fixes products with CLEARLY broken config (G+KG but missing factor)
- Does NOT touch products with intentionally different UOM configs
- Does NOT auto-migrate legacy supply+material_type_id to item_type='material'

Users can manually adjust any incorrectly categorized items.
"""
from alembic import op
from decimal import Decimal

# revision identifiers
revision = 'xxxx'
down_revision = 'yyyy'
branch_labels = None
depends_on = None


def upgrade():
    # CONSERVATIVE FIX: Only fix products with clearly broken config
    # Criteria: unit=G AND purchase_uom=KG AND purchase_factor IS NULL (or 0)
    # This is the most common broken state from the missing purchase_factor bug
    
    op.execute("""
        UPDATE products 
        SET 
            purchase_factor = 1000,
            is_raw_material = TRUE
        WHERE material_type_id IS NOT NULL 
        AND unit = 'G'
        AND purchase_uom = 'KG'
        AND (purchase_factor IS NULL OR purchase_factor = 0)
    """)
    
    # Log what was NOT changed for manual review
    # Users with intentionally different configs (unit=KG, etc.) are left untouched
    
    # OPTIONAL: Migrate legacy supply+material_type_id to item_type='material'
    # DISABLED by default - uncomment if you want automatic migration
    # Users can manually change item_type if they prefer
    # op.execute("""
    #     UPDATE products 
    #     SET item_type = 'material' 
    #     WHERE item_type = 'supply' 
    #     AND material_type_id IS NOT NULL
    # """)


def downgrade():
    # No downgrade - these are data fixes
    # If needed, users can manually adjust
    pass
```

---

## Verification Steps

After implementation, verify with these tests:

### Backend Tests

```bash
cd backend
python -m pytest tests/ -v -k "material or uom" --tb=short
```

### Manual API Tests

**1. Create a material item (default filament profile):**

```bash
curl -X POST http://localhost:8000/api/v1/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test PLA Blue", "item_type": "material"}'
```

Expected response should show:
- `unit: "G"`
- `purchase_uom: "KG"`
- `purchase_factor: 1000`
- `is_raw_material: true`
- `sku` starting with `MAT-`

**2. Create a material with custom UOM (CNC sheet stock):**

```bash
curl -X POST http://localhost:8000/api/v1/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Plywood Sheet 4x8", "item_type": "material", "unit": "EA", "purchase_uom": "EA", "purchase_factor": 1}'
```

Expected response should show the overridden values:
- `unit: "EA"`
- `purchase_uom: "EA"`
- `purchase_factor: 1`

**3. Create a purchase order and receive it:**
- Create PO with 1 KG of filament at $25/KG
- Receive the PO
- Verify inventory shows 1000 G
- Verify unit cost is stored as $25/KG (not converted)
- Verify inventory value calculation: 1000 G × ($25/1000) = $25.00

**4. Filter items by type:**

```bash
curl http://localhost:8000/api/v1/items?item_type=material
```

Should return both new `item_type='material'` items AND legacy filaments with `material_type_id`.

### Frontend Tests

1. Go to Admin > Items > Create
2. Select "Material (Filament, etc.)" as type
3. Verify unit auto-populates to "G"
4. Verify hint text appears showing defaults and override option
5. Save and verify item is created correctly
6. Edit the item - verify values are NOT overwritten by useEffect

---

## File Summary

**Files to CREATE:**
- `backend/app/core/uom_config.py`
- `backend/app/core/__init__.py` (if doesn't exist)

**Files to MODIFY:**
- `backend/app/schemas/item.py`
- `backend/app/services/inventory_helpers.py`
- `backend/app/services/material_service.py`
- `backend/app/services/product_uom_service.py`
- `backend/app/api/v1/endpoints/items.py`
- `backend/app/api/v1/endpoints/purchase_orders.py`
- `backend/tests/factories.py`
- `frontend/src/components/ItemForm.jsx`
- `frontend/src/components/ItemWizard.jsx`
- `frontend/src/pages/admin/AdminItems.jsx`
- `frontend/src/components/BOMEditor.jsx`
- `frontend/src/components/purchasing/QuickCreateItemModal.jsx`

---

## Key Logic Summary

1. **Default materials use:** G (storage), KG (purchase), 1000 (factor), $/KG (cost)
2. **Validation is consistency-based** - not locked to specific values (supports CNC/laser)
3. **Detection priority:** `item_type='material'` > `material_type_id` > category > SKU prefix
4. **All UOM constants come from `uom_config.py`** - never hardcode elsewhere
5. **Backwards compatible:** Legacy filaments (`supply` + `material_type_id`) continue to work
6. **Frontend auto-populates defaults** but allows full override for CNC/laser materials
7. **Conservative migration** - only fixes clearly broken configs

---

## Future Enhancements (Placeholders)

1. **Material Profile Selector** - UI dropdown to select profile (Filament/Sheet/Linear/Resin/Custom)
2. **Profile-based auto-fill** - Each profile pre-fills appropriate UOM values
3. **Material type categories** - Group materials by type (filament, sheet, linear, etc.)
4. **UOM conversion service** - Centralized conversion handling for all unit types