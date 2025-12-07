# FilaOps Admin UI - Workflow Documentation

This document describes the main user workflows in the FilaOps admin interface, including step-by-step instructions and known issues.

---

## Navigation Structure

**Sidebar Menu (AdminLayout.jsx)**
- Dashboard (`/admin`)
- Orders (`/admin/orders`)
- Production (`/admin/production`)
- Items (`/admin/items`)
- Bill of Materials (`/admin/bom`)
- Purchasing (`/admin/purchasing`)
- Manufacturing (`/admin/manufacturing`)
- Shipping (`/admin/shipping`)

---

## 1. Sales Order Management

**Location:** `/admin/orders` (AdminOrders.jsx)

### Create a New Sales Order
1. Click **"+ Create Order"** button (top right)
2. Select a product from dropdown (shows products with has_bom or "Finished Goods" category)
3. Enter quantity
4. (Optional) Fill in shipping address
5. (Optional) Add notes
6. Click **"Create Order"**
7. Order appears in list with status "pending"

### View Order Details
1. Click **"View"** on any order row
2. Modal displays: Product, Material, Quantity, Prices, Source
3. Available actions:
   - **Generate Production Order** - Creates PO from sales order
   - **Status buttons** - Click to advance through workflow

### Order Status Flow
```
pending → confirmed → in_production → ready_to_ship → shipped → completed
```
- Click **"Advance"** in the list OR status buttons in detail modal
- Cancelled orders cannot be advanced

### Generate Production Order from Sales Order
1. View an order (click "View")
2. Click **"Generate Production Order"** button
3. System creates PO-YYYY-NNNN code
4. Alert shows created order code(s)
5. Navigate to Production page to see the order

---

## 2. Bill of Materials (BOM) Management

**Location:** `/admin/bom` (AdminBOM.jsx)

### View BOM List
- Shows all BOMs with: Code, Name, Product, Version, Components, Total Cost, Status
- **Total Cost** now shows combined Material + Process cost
- Filter by search or active status

### Create a New BOM
1. Click **"+ Create BOM"** button
2. Select a product (finished goods, not raw materials)
3. (Optional) Enter BOM name and revision
4. Click **"Create BOM"**
5. BOM opens in detail view to add components

### View/Edit BOM Details
1. Click **"View"** on any BOM row
2. Modal shows:
   - Header info (Code, Version, Product, Costs)
   - Component lines with inventory status
   - Process Path / Routing section

### Add Components to BOM
1. Open BOM detail view
2. Click **"Add Component"**
3. Select component from dropdown (raw materials only)
4. Enter quantity and optional scrap factor
5. Click **"Add Component"**
6. Line appears in table with cost calculated

### Recalculate BOM Cost
1. Open BOM detail view
2. Click **"Recalculate Cost"**
3. System recalculates using effective cost priority:
   - standard_cost → average_cost → last_cost → cost (legacy)

### Handle Material Shortages
1. View BOM lines - red "Need X" shows shortages
2. Click **"Create PO"** link on shortage line
3. Fill out Purchase Request modal:
   - Select vendor
   - Enter quantity and unit cost
4. Click **"Create Purchase Order"**
5. Click **"View in Purchasing"** to see the PO

### Create Production Order from BOM
1. Open BOM detail view
2. Click **"Create Production Order"** button
3. Enter quantity to produce
4. System shows inventory status and max producible
5. Click **"Create Production Order"**
6. Redirects to Production page with new order

### Explode BOM (Multi-Level)
1. Open BOM detail view
2. Click **"Explode BOM"** button
3. Modal shows all components flattened through sub-assemblies
4. Displays: Level, Component, Qty/Unit, Extended Qty, Costs, Stock status

### Apply Routing Template
1. Open BOM detail view
2. In "Process Path" section, select a routing template
3. Click **"Apply"** or **"Apply Template"**
4. Operations appear with editable run times
5. Process cost shows in header

---

## 3. Production Order Management

**Location:** `/admin/production` (AdminProduction.jsx)

### View Production Orders
- Kanban board with columns: Draft, Released, In Progress, Complete
- Stats bar shows counts and "Completed Today"
- Search by PO code, product, or sales order

### Create Production Order (Direct)
1. Click **"+ Create Production Order"**
2. Select product
3. Enter quantity, priority (1-5), due date
4. Click create
5. Order appears in Draft column

### Advance Production Order Status
```
draft → released → in_progress → complete
```
- **Draft column:** Click "Release" to move to Released
- **Released column:** Click "Start" to move to In Progress
- **In Progress column:** Click "Complete" to finish

---

## 4. Purchasing Management

**Location:** `/admin/purchasing` (AdminPurchasing.jsx)

### Tabs
- **Orders** - Purchase order list
- **Vendors** - Vendor management
- **Import** - Amazon order import
- **Low Stock** - Items below reorder point

### View Purchase Orders
1. Click "Orders" tab
2. List shows: PO#, Vendor, Items, Total, Status, Ordered Date
3. Filter by status or search

### Create Purchase Order
1. From BOM shortage: Click "Create PO" on shortage line
2. Or from low stock: Select items and create PO
3. Fill vendor, lines with products and quantities
4. Submit to create

### Purchase Order Status Flow
```
draft → ordered → shipped → received → closed
```

### Receive Purchase Order
1. Click on a PO to view details
2. Click "Receive" button
3. Enter received quantities
4. Inventory automatically updated

### Manage Vendors
1. Click "Vendors" tab
2. View list of vendors with contact info
3. Click "Add Vendor" to create new
4. Edit or delete existing vendors

### Low Stock Alert
1. Click "Low Stock" tab
2. Shows items where available_qty < reorder_point
3. Quick action to create PO for selected items

---

## 5. Items / Inventory Management

**Location:** `/admin/items` (AdminItems.jsx)

### View Items
- Left sidebar: Category tree (expandable)
- Main area: Item list with SKU, Name, Type, Costs, Stock
- Filter by category, item type, active status, search

### Item Types
- **Finished Good** - Products sold to customers
- **Component** - Parts used in BOMs
- **Supply** - Consumables (filament, packaging)
- **Service** - Non-physical items

### Create New Item
1. Click "Add Item" button
2. Fill required fields: SKU, Name, Item Type
3. Optional: Category, Costs, Dimensions, Reorder settings
4. Save

### Edit Item
1. Click on item row or edit button
2. Modify fields in modal
3. Save changes

### Recost All Items
1. Click "Recost All" button
2. Confirm the action
3. System updates standard costs:
   - Manufactured items: From BOM + Routing
   - Purchased items: From average purchase cost

---

## Known Issues / Bugs

### FIXED in this session:
1. **BOM.is_default error** - Changed to `BOM.active == True`
2. **Routing.is_default error** - Changed to `Routing.is_active == True`
3. **BOM cost showing $0.00** - Added `get_effective_cost()` helper
4. **"View in Purchasing" wrong URL** - Changed from `/admin?tab=purchasing` to `/admin/purchasing`
5. **BOM list only showing material cost** - Now shows combined material + process total

### Potential Issues to Monitor:

1. **Order Detail Modal - Quote-based orders**
   - `product_name`, `material_type`, `color` may be null for quote-based orders
   - Consider adding fallback display for line_item orders

2. **Create Sales Order - Product Filter**
   - Only shows products with `has_bom` or category "Finished Goods"
   - May miss valid products if not properly categorized

3. **Production Order from BOM - Inventory Check**
   - `calculateMaxProducible()` floors results - may lose fractional precision
   - Consider if decimal quantities are supported

4. **Purchasing - fetchProducts endpoint**
   - Uses `/api/v1/items` without auth header (line 105)
   - Should include Authorization header for consistency

5. **BOM Detail - Process Path**
   - `setShowProcessPath` is declared but never used (always true)
   - Could add toggle functionality or remove unused state

6. **AdminOrders - Product list**
   - Filter by `has_bom` may exclude new products without BOMs yet configured
   - Consider showing all active finished goods

---

## API Endpoints Used

### Sales Orders
- `GET /api/v1/sales-orders/` - List orders
- `POST /api/v1/sales-orders/` - Create order
- `PATCH /api/v1/sales-orders/{id}/status` - Update status
- `POST /api/v1/sales-orders/{id}/generate-production-orders` - Generate POs

### BOMs
- `GET /api/v1/admin/bom` - List BOMs
- `GET /api/v1/admin/bom/{id}` - Get BOM details
- `POST /api/v1/admin/bom` - Create BOM
- `POST /api/v1/admin/bom/{id}/lines` - Add line
- `PATCH /api/v1/admin/bom/{id}/lines/{line_id}` - Update line
- `DELETE /api/v1/admin/bom/{id}/lines/{line_id}` - Delete line
- `POST /api/v1/admin/bom/{id}/recalculate` - Recalculate costs
- `GET /api/v1/admin/bom/{id}/explode` - Explode multi-level BOM
- `GET /api/v1/admin/bom/{id}/cost-rollup` - Get cost rollup

### Production Orders
- `GET /api/v1/production-orders/` - List orders
- `POST /api/v1/production-orders/` - Create order
- `POST /api/v1/production-orders/{id}/release` - Release
- `POST /api/v1/production-orders/{id}/start` - Start
- `POST /api/v1/production-orders/{id}/complete` - Complete

### Purchasing
- `GET /api/v1/purchase-orders` - List POs
- `POST /api/v1/purchase-orders` - Create PO
- `GET /api/v1/purchase-orders/{id}` - Get PO details
- `POST /api/v1/purchase-orders/{id}/status` - Update status
- `GET /api/v1/vendors` - List vendors
- `POST /api/v1/vendors` - Create vendor

### Items
- `GET /api/v1/items` - List items
- `POST /api/v1/items` - Create item
- `PATCH /api/v1/items/{id}` - Update item
- `GET /api/v1/items/categories` - List categories
- `GET /api/v1/items/categories/tree` - Category tree
- `GET /api/v1/items/low-stock` - Low stock report
- `POST /api/v1/items/recost-all` - Recost all items

### Routings
- `GET /api/v1/routings` - List routings
- `GET /api/v1/routings/{id}` - Get routing details
- `POST /api/v1/routings/apply-template` - Apply template to product

---

## Quick Reference: Common Workflows

### Make-to-Order (MTO) Flow
1. **Orders** → Create Sales Order (or receive from Squarespace)
2. **Orders** → View Order → Generate Production Order
3. **Production** → Release → Start → Complete
4. **Shipping** → Create shipment → Buy label
5. **Orders** → Mark shipped → Mark completed

### Build-to-Stock Flow
1. **BOM** → View BOM for product
2. **BOM** → Check inventory status
3. **BOM** → Create Production Order (or handle shortages first)
4. **Production** → Release → Start → Complete
5. Inventory automatically updated on completion

### Reorder Materials Flow
1. **Purchasing** → Low Stock tab (or BOM shortage)
2. Create Purchase Order for vendor
3. Send PO → Mark as Ordered
4. Receive shipment → Mark as Received
5. Inventory automatically updated
