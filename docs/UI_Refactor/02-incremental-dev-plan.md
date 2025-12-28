# FilaOps Redesign: Incremental Development Plan
## Test-Driven, Stackable Implementation

---

## Philosophy

```
Each ticket follows this pattern:
1. Write failing test first (where applicable)
2. Implement the feature
3. Test passes
4. Create/update E2E test fragment
5. Combine with previous E2E fragments to test flow

Tests stack like this:
┌─────────────────────────────────────────────────────────┐
│ E2E Flow Test: Quote → Order → Production → Ship        │
├─────────────────────────────────────────────────────────┤
│ Integration Tests: API + Component combinations         │
├──────────────────┬──────────────────┬───────────────────┤
│ Unit: API        │ Unit: Component  │ Unit: Utils       │
└──────────────────┴──────────────────┴───────────────────┘
```

---

## Test Infrastructure Setup (Do First)

### INFRA-001: Setup Playwright for E2E Testing
**Time:** 2-3 hours
**Description:** Configure Playwright for frontend E2E tests

**Tasks:**
- [ ] Install Playwright: `npm install -D @playwright/test`
- [ ] Create `playwright.config.ts` with base URL config
- [ ] Create `tests/e2e/` directory structure
- [ ] Create test utility helpers (`login()`, `createTestData()`)
- [ ] Add npm scripts: `test:e2e`, `test:e2e:ui`

**Acceptance Criteria:**
- [ ] Can run `npm run test:e2e` 
- [ ] Sample test navigates to login and verifies page loads

**Test File:** `tests/e2e/setup.spec.ts`
```typescript
test('app loads and shows login', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
});
```

---

### INFRA-002: Setup pytest for Backend API Testing
**Time:** 1-2 hours
**Description:** Configure pytest with fixtures for API testing

**Tasks:**
- [ ] Create `tests/` directory in backend
- [ ] Create `conftest.py` with test client fixture
- [ ] Create test database fixture (SQLite in-memory or test schema)
- [ ] Create factory functions for test data (create_test_item, create_test_so, etc.)
- [ ] Add `pytest.ini` configuration

**Acceptance Criteria:**
- [ ] Can run `pytest` from backend directory
- [ ] Sample test hits health endpoint

**Test File:** `tests/test_health.py`
```python
def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
```

---

### INFRA-003: Create Test Data Factories
**Time:** 2-3 hours
**Description:** Build reusable test data creation utilities

**Backend Factories (`tests/factories.py`):**
```python
def create_test_customer(db, **overrides) -> Customer
def create_test_item(db, item_type="raw_material", **overrides) -> Item
def create_test_product(db, with_bom=False, **overrides) -> Product
def create_test_sales_order(db, customer=None, lines=[], **overrides) -> SalesOrder
def create_test_production_order(db, product=None, sales_order=None, **overrides) -> ProductionOrder
def create_test_purchase_order(db, vendor=None, lines=[], **overrides) -> PurchaseOrder
def create_test_inventory(db, item=None, qty=100, **overrides) -> InventoryTransaction
```

**Frontend Fixtures (`tests/e2e/fixtures/`):**
```typescript
// testData.ts
export async function seedTestScenario(scenario: 'empty' | 'basic' | 'full-workflow') 
export async function cleanupTestData()
```

**Acceptance Criteria:**
- [ ] Can create interconnected test data with one function call
- [ ] Test data cleans up after each test

---

## Epic 1: Demand Pegging Foundation

> **Goal:** Answer "Why is this item needed? What's consuming it?"

This is the foundational data relationship that makes everything else work.

---

### API-101: Item Allocation Query
**Time:** 1-2 hours
**Dependencies:** INFRA-002, INFRA-003
**Description:** Calculate how much of an item is allocated to production orders

**Tasks:**
- [ ] Create function `get_item_allocations(item_id)` in `services/inventory.py`
- [ ] Query production orders with status in ('released', 'in_progress')
- [ ] Join to BOM to get material requirements
- [ ] Return list of allocations with PO code, qty needed, date needed

**API Response Shape:**
```python
{
    "item_id": 123,
    "item_sku": "STEEL-SPRING-01",
    "total_allocated": 150.0,
    "allocations": [
        {
            "production_order_id": 456,
            "production_order_code": "PO-2025-0142",
            "product_name": "Widget Assembly",
            "quantity_needed": 100.0,
            "date_needed": "2025-01-15",
            "status": "in_progress",
            "sales_order_code": "SO-2025-0089",  # nullable
            "customer_name": "Acme Corp"  # nullable
        }
    ]
}
```

**Unit Tests:** `tests/test_inventory_allocations.py`
```python
def test_get_item_allocations_empty(db, client):
    """Item with no allocations returns empty list"""
    item = create_test_item(db)
    result = get_item_allocations(db, item.id)
    assert result["total_allocated"] == 0
    assert result["allocations"] == []

def test_get_item_allocations_single_po(db, client):
    """Item allocated to one PO returns correct data"""
    item = create_test_item(db)
    product = create_test_product(db, bom_items=[(item, 2.0)])  # 2 units per product
    po = create_test_production_order(db, product=product, qty=50, status="released")
    
    result = get_item_allocations(db, item.id)
    assert result["total_allocated"] == 100.0  # 50 * 2
    assert len(result["allocations"]) == 1
    assert result["allocations"][0]["production_order_code"] == po.code

def test_get_item_allocations_excludes_complete(db, client):
    """Completed POs don't count as allocations"""
    item = create_test_item(db)
    product = create_test_product(db, bom_items=[(item, 1.0)])
    po = create_test_production_order(db, product=product, qty=50, status="complete")
    
    result = get_item_allocations(db, item.id)
    assert result["total_allocated"] == 0

def test_get_item_allocations_with_sales_order(db, client):
    """Shows linked sales order when PO is MTO"""
    item = create_test_item(db)
    product = create_test_product(db, bom_items=[(item, 1.0)])
    so = create_test_sales_order(db, lines=[{"product": product, "qty": 25}])
    po = create_test_production_order(db, product=product, qty=25, sales_order=so)
    
    result = get_item_allocations(db, item.id)
    assert result["allocations"][0]["sales_order_code"] == so.code
    assert result["allocations"][0]["customer_name"] == so.customer.name
```

---

### API-102: Item Supply Situation Query
**Time:** 1-2 hours
**Dependencies:** API-101
**Description:** Calculate complete supply picture for an item

**Tasks:**
- [ ] Create function `get_item_supply_situation(item_id)` 
- [ ] Calculate: on_hand, allocated (from API-101), available (on_hand - allocated)
- [ ] Query open purchase orders for incoming supply
- [ ] Return complete supply picture

**API Response Shape:**
```python
{
    "item_id": 123,
    "item_sku": "STEEL-SPRING-01", 
    "item_name": "Spring Steel Sheet",
    "unit": "ea",
    "on_hand": 45.0,
    "allocated": 150.0,
    "available": -105.0,  # Can be negative!
    "on_order": 100.0,
    "reorder_point": 50.0,
    "incoming_supply": [
        {
            "purchase_order_id": 789,
            "purchase_order_code": "PO-0156",
            "vendor_name": "Amazon Business",
            "quantity": 100.0,
            "expected_date": "2025-01-14",
            "status": "shipped"
        }
    ],
    "net_position": -5.0  # available + on_order
}
```

**Unit Tests:** `tests/test_supply_situation.py`
```python
def test_supply_situation_basic(db):
    """Basic supply calculation with no allocations"""
    item = create_test_item(db)
    create_test_inventory(db, item=item, qty=100)
    
    result = get_item_supply_situation(db, item.id)
    assert result["on_hand"] == 100
    assert result["allocated"] == 0
    assert result["available"] == 100

def test_supply_situation_with_allocations(db):
    """Available = on_hand - allocated"""
    item = create_test_item(db)
    create_test_inventory(db, item=item, qty=45)
    product = create_test_product(db, bom_items=[(item, 1.0)])
    create_test_production_order(db, product=product, qty=100, status="released")
    
    result = get_item_supply_situation(db, item.id)
    assert result["on_hand"] == 45
    assert result["allocated"] == 100
    assert result["available"] == -55  # Negative = shortage

def test_supply_situation_with_incoming(db):
    """Shows incoming POs"""
    item = create_test_item(db)
    create_test_inventory(db, item=item, qty=45)
    vendor = create_test_vendor(db)
    po = create_test_purchase_order(db, vendor=vendor, 
        lines=[{"item": item, "qty": 100}], status="ordered")
    
    result = get_item_supply_situation(db, item.id)
    assert result["on_order"] == 100
    assert len(result["incoming_supply"]) == 1

def test_supply_situation_net_position(db):
    """Net position = available + on_order"""
    item = create_test_item(db)
    create_test_inventory(db, item=item, qty=45)
    # Allocate 100
    product = create_test_product(db, bom_items=[(item, 1.0)])
    create_test_production_order(db, product=product, qty=100, status="released")
    # Order 100
    vendor = create_test_vendor(db)
    create_test_purchase_order(db, vendor=vendor,
        lines=[{"item": item, "qty": 100}], status="ordered")
    
    result = get_item_supply_situation(db, item.id)
    assert result["available"] == -55
    assert result["on_order"] == 100
    assert result["net_position"] == 45  # -55 + 100
```

---

### API-103: Item Demand Pegging Endpoint
**Time:** 1 hour
**Dependencies:** API-101, API-102
**Description:** Expose demand pegging via REST API

**Tasks:**
- [ ] Create endpoint `GET /api/v1/items/{id}/demand-pegging`
- [ ] Combine allocation and supply data
- [ ] Add proper error handling for item not found

**Endpoint:** `GET /api/v1/items/{item_id}/demand-pegging`

**Unit Tests:** `tests/test_api_demand_pegging.py`
```python
def test_demand_pegging_endpoint(client, db):
    """Endpoint returns combined supply/demand data"""
    item = create_test_item(db)
    create_test_inventory(db, item=item, qty=50)
    
    response = client.get(f"/api/v1/items/{item.id}/demand-pegging")
    assert response.status_code == 200
    data = response.json()
    assert "on_hand" in data
    assert "allocations" in data

def test_demand_pegging_not_found(client, db):
    """Returns 404 for non-existent item"""
    response = client.get("/api/v1/items/99999/demand-pegging")
    assert response.status_code == 404
```

---

### UI-101: DemandPegging Component
**Time:** 2-3 hours
**Dependencies:** API-103
**Description:** Reusable component showing what's consuming an item

**Tasks:**
- [ ] Create `components/inventory/DemandPegging.jsx`
- [ ] Fetch data from demand-pegging endpoint
- [ ] Display allocations table with links to POs/SOs
- [ ] Show supply summary (on hand, allocated, available)
- [ ] Handle loading and error states

**Component Props:**
```typescript
interface DemandPeggingProps {
  itemId: number;
  onProductionOrderClick?: (poId: number) => void;
  onSalesOrderClick?: (soId: number) => void;
  compact?: boolean;  // For inline use vs. full panel
}
```

**Component Tests:** `components/inventory/DemandPegging.test.jsx`
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import { DemandPegging } from './DemandPegging';
import { rest } from 'msw';
import { server } from '../../tests/mocks/server';

describe('DemandPegging', () => {
  it('shows loading state initially', () => {
    render(<DemandPegging itemId={1} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays supply summary', async () => {
    server.use(
      rest.get('/api/v1/items/1/demand-pegging', (req, res, ctx) => {
        return res(ctx.json({
          on_hand: 45,
          allocated: 100,
          available: -55,
          allocations: []
        }));
      })
    );
    
    render(<DemandPegging itemId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument();  // on_hand
      expect(screen.getByText('-55')).toBeInTheDocument(); // available (shortage)
    });
  });

  it('displays allocation rows with PO links', async () => {
    server.use(
      rest.get('/api/v1/items/1/demand-pegging', (req, res, ctx) => {
        return res(ctx.json({
          on_hand: 45,
          allocated: 100,
          available: -55,
          allocations: [{
            production_order_code: 'PO-2025-0142',
            product_name: 'Widget',
            quantity_needed: 100,
            sales_order_code: 'SO-2025-0089',
            customer_name: 'Acme Corp'
          }]
        }));
      })
    );
    
    render(<DemandPegging itemId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('PO-2025-0142')).toBeInTheDocument();
      expect(screen.getByText('SO-2025-0089')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });
  });

  it('shows shortage warning when available is negative', async () => {
    server.use(
      rest.get('/api/v1/items/1/demand-pegging', (req, res, ctx) => {
        return res(ctx.json({
          on_hand: 45,
          allocated: 100,
          available: -55,
          allocations: []
        }));
      })
    );
    
    render(<DemandPegging itemId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText(/shortage/i)).toBeInTheDocument();
    });
  });

  it('handles empty allocations', async () => {
    server.use(
      rest.get('/api/v1/items/1/demand-pegging', (req, res, ctx) => {
        return res(ctx.json({
          on_hand: 100,
          allocated: 0,
          available: 100,
          allocations: []
        }));
      })
    );
    
    render(<DemandPegging itemId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText(/no allocations/i)).toBeInTheDocument();
    });
  });
});
```

---

### UI-102: Integrate DemandPegging into Low Stock Table
**Time:** 1-2 hours
**Dependencies:** UI-101
**Description:** Add expandable demand pegging to low stock items

**Tasks:**
- [ ] Add expand/collapse button to each low stock row
- [ ] When expanded, show DemandPegging component inline
- [ ] Remember expanded state during session

**Integration Test:** `tests/e2e/low-stock.spec.ts`
```typescript
test.describe('Low Stock Demand Pegging', () => {
  test.beforeEach(async ({ page }) => {
    // Seed test data with a low stock item
    await seedTestScenario('low-stock-with-allocations');
    await login(page);
    await page.goto('/admin/purchasing?tab=low-stock');
  });

  test('can expand item to see demand pegging', async ({ page }) => {
    // Find the low stock item
    const row = page.getByRole('row', { name: /STEEL-SPRING-01/i });
    await expect(row).toBeVisible();
    
    // Expand it
    await row.getByRole('button', { name: /expand/i }).click();
    
    // Verify demand pegging shows
    await expect(page.getByText('What\'s Driving This Need')).toBeVisible();
    await expect(page.getByText('PO-2025-0142')).toBeVisible();
  });

  test('shows linked sales order in demand pegging', async ({ page }) => {
    const row = page.getByRole('row', { name: /STEEL-SPRING-01/i });
    await row.getByRole('button', { name: /expand/i }).click();
    
    await expect(page.getByText('SO-2025-0089')).toBeVisible();
    await expect(page.getByText('Acme Corp')).toBeVisible();
  });

  test('can click through to production order', async ({ page }) => {
    const row = page.getByRole('row', { name: /STEEL-SPRING-01/i });
    await row.getByRole('button', { name: /expand/i }).click();
    
    await page.getByRole('link', { name: 'PO-2025-0142' }).click();
    
    // Should navigate to production order detail
    await expect(page).toHaveURL(/\/admin\/production.*PO-2025-0142/);
  });
});
```

---

### E2E-101: Demand Pegging Flow Test
**Time:** 1 hour
**Dependencies:** UI-102
**Description:** Complete E2E test for demand pegging flow

**Test File:** `tests/e2e/flows/demand-pegging-flow.spec.ts`
```typescript
test.describe('Demand Pegging Complete Flow', () => {
  test('user can trace shortage from low stock to sales order', async ({ page }) => {
    // Setup: Create SO -> PO -> Inventory shortage scenario
    await seedTestScenario('full-demand-chain');
    await login(page);
    
    // Step 1: Navigate to low stock
    await page.goto('/admin/purchasing?tab=low-stock');
    
    // Step 2: Find the item with shortage
    const itemRow = page.getByRole('row', { name: /STEEL-SPRING-01/i });
    await expect(itemRow).toBeVisible();
    await expect(itemRow.getByText('CRITICAL')).toBeVisible();
    
    // Step 3: Expand to see demand pegging
    await itemRow.getByRole('button', { name: /expand/i }).click();
    
    // Step 4: Verify we can see the full chain
    const peggingSection = page.getByTestId('demand-pegging');
    await expect(peggingSection.getByText('PO-2025-0142')).toBeVisible();
    await expect(peggingSection.getByText('SO-2025-0089')).toBeVisible();
    await expect(peggingSection.getByText('Acme Corp')).toBeVisible();
    
    // Step 5: Click through to production order
    await peggingSection.getByRole('link', { name: 'PO-2025-0142' }).click();
    await expect(page.getByRole('heading', { name: 'PO-2025-0142' })).toBeVisible();
    
    // Step 6: Verify production order shows the sales order link
    await expect(page.getByText('SO-2025-0089')).toBeVisible();
    
    // Step 7: Click through to sales order
    await page.getByRole('link', { name: 'SO-2025-0089' }).click();
    await expect(page.getByRole('heading', { name: 'SO-2025-0089' })).toBeVisible();
    await expect(page.getByText('Acme Corp')).toBeVisible();
  });
});
```

---

## Epic 2: Production Order Context

> **Goal:** Every production order shows WHY it exists and WHAT it needs

---

### API-201: Production Order Full Context Query
**Time:** 2-3 hours
**Dependencies:** API-101
**Description:** Get complete context for a production order

**Tasks:**
- [ ] Create `get_production_order_context(po_id)` function
- [ ] Include: linked sales order (if MTO)
- [ ] Include: machine assignment
- [ ] Include: BOM with material availability for each line
- [ ] Include: operation history (start, completions, scraps)

**API Response Shape:**
```python
{
    "id": 456,
    "code": "PO-2025-0142",
    "status": "in_progress",
    "product": {
        "id": 123,
        "sku": "WIDGET-01",
        "name": "Widget Assembly"
    },
    "quantity_ordered": 100,
    "quantity_completed": 45,
    "quantity_scrapped": 2,
    
    # Why does this exist?
    "demand_source": {
        "type": "sales_order",  # or "stock_replenishment"
        "sales_order_id": 789,
        "sales_order_code": "SO-2025-0089",
        "customer_name": "Acme Corp",
        "line_number": 2,
        "ship_date": "2025-01-15"
    },
    
    # Where is it being made?
    "scheduling": {
        "machine_id": 1,
        "machine_name": "P1S-01",
        "scheduled_start": "2025-01-12T09:00:00",
        "scheduled_end": "2025-01-14T17:00:00",
        "actual_start": "2025-01-12T09:15:00",
        "estimated_completion": "2025-01-14T18:30:00"
    },
    
    # What materials does it need?
    "material_requirements": [
        {
            "item_id": 101,
            "item_sku": "FIL-PLA-BLK-1KG",
            "item_name": "Black PLA 1kg",
            "quantity_required": 2.5,
            "quantity_available": 6.7,
            "status": "ok",  # ok, warning, shortage
            "unit": "kg"
        },
        {
            "item_id": 102,
            "item_sku": "STEEL-SPRING-01",
            "item_name": "Spring Steel Sheet",
            "quantity_required": 100,
            "quantity_available": -55,
            "status": "shortage",
            "shortage_qty": 55,
            "incoming_po": "PO-0156",
            "incoming_date": "2025-01-14",
            "unit": "ea"
        }
    ],
    
    # What's happened?
    "history": [
        {"timestamp": "2025-01-12T09:15:00", "action": "started", "user": "brandan"},
        {"timestamp": "2025-01-12T14:30:00", "action": "completed", "quantity": 10},
        {"timestamp": "2025-01-12T16:00:00", "action": "scrapped", "quantity": 1, "reason": "Layer adhesion"}
    ]
}
```

**Unit Tests:** `tests/test_production_context.py`
```python
def test_production_context_basic(db):
    """Returns basic production order data"""
    product = create_test_product(db)
    po = create_test_production_order(db, product=product, qty=100)
    
    result = get_production_order_context(db, po.id)
    
    assert result["code"] == po.code
    assert result["product"]["name"] == product.name
    assert result["quantity_ordered"] == 100

def test_production_context_with_sales_order(db):
    """Shows linked sales order for MTO orders"""
    customer = create_test_customer(db, name="Acme Corp")
    product = create_test_product(db)
    so = create_test_sales_order(db, customer=customer, 
        lines=[{"product": product, "qty": 50}])
    po = create_test_production_order(db, product=product, qty=50, 
        sales_order=so, sales_order_line=1)
    
    result = get_production_order_context(db, po.id)
    
    assert result["demand_source"]["type"] == "sales_order"
    assert result["demand_source"]["sales_order_code"] == so.code
    assert result["demand_source"]["customer_name"] == "Acme Corp"

def test_production_context_stock_replenishment(db):
    """Shows stock replenishment for MTS orders"""
    product = create_test_product(db)
    po = create_test_production_order(db, product=product, qty=50, sales_order=None)
    
    result = get_production_order_context(db, po.id)
    
    assert result["demand_source"]["type"] == "stock_replenishment"
    assert result["demand_source"]["sales_order_id"] is None

def test_production_context_material_availability(db):
    """Calculates material availability from BOM"""
    item1 = create_test_item(db, sku="MAT-001")
    item2 = create_test_item(db, sku="MAT-002")
    create_test_inventory(db, item=item1, qty=100)
    create_test_inventory(db, item=item2, qty=20)
    
    product = create_test_product(db, bom_items=[
        (item1, 2.0),  # Need 2 per unit
        (item2, 1.0),  # Need 1 per unit
    ])
    po = create_test_production_order(db, product=product, qty=50)
    
    result = get_production_order_context(db, po.id)
    
    # item1: need 100, have 100 = ok
    mat1 = next(m for m in result["material_requirements"] if m["item_sku"] == "MAT-001")
    assert mat1["quantity_required"] == 100
    assert mat1["status"] == "ok"
    
    # item2: need 50, have 20 = shortage
    mat2 = next(m for m in result["material_requirements"] if m["item_sku"] == "MAT-002")
    assert mat2["quantity_required"] == 50
    assert mat2["quantity_available"] == 20
    assert mat2["status"] == "shortage"

def test_production_context_with_machine(db):
    """Shows machine assignment"""
    product = create_test_product(db)
    machine = create_test_printer(db, name="P1S-01")
    po = create_test_production_order(db, product=product, qty=50, 
        printer=machine, scheduled_start="2025-01-12T09:00:00")
    
    result = get_production_order_context(db, po.id)
    
    assert result["scheduling"]["machine_name"] == "P1S-01"
    assert result["scheduling"]["scheduled_start"] == "2025-01-12T09:00:00"
```

---

### API-202: Production Order Context Endpoint
**Time:** 30 min
**Dependencies:** API-201
**Description:** Expose production context via REST API

**Tasks:**
- [ ] Create endpoint `GET /api/v1/production-orders/{id}/context`
- [ ] Return full context from API-201
- [ ] Handle not found

**Endpoint:** `GET /api/v1/production-orders/{po_id}/context`

---

### UI-201: ProductionOrderPanel Component
**Time:** 3-4 hours
**Dependencies:** API-202
**Description:** Slide-in panel with full production order context

**Tasks:**
- [ ] Create `components/production/ProductionOrderPanel.jsx`
- [ ] Create section: Demand Source (with links)
- [ ] Create section: Scheduling (machine, dates)
- [ ] Create section: Material Requirements (with availability status)
- [ ] Create section: Progress (completed/scrapped counts)
- [ ] Create section: Actions (complete, scrap, split, hold)

**Component Tests:** `components/production/ProductionOrderPanel.test.jsx`
```javascript
describe('ProductionOrderPanel', () => {
  it('displays demand source for MTO order', async () => {
    server.use(mockProductionContextMTO());
    render(<ProductionOrderPanel productionOrderId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('Demand Source')).toBeInTheDocument();
      expect(screen.getByText('SO-2025-0089')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });
  });

  it('displays stock replenishment for MTS order', async () => {
    server.use(mockProductionContextMTS());
    render(<ProductionOrderPanel productionOrderId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('Stock Replenishment')).toBeInTheDocument();
    });
  });

  it('shows material availability with status indicators', async () => {
    server.use(mockProductionContextWithShortage());
    render(<ProductionOrderPanel productionOrderId={1} />);
    
    await waitFor(() => {
      // OK material
      const okRow = screen.getByRole('row', { name: /FIL-PLA-BLK/i });
      expect(okRow.getByText('✓')).toBeInTheDocument();
      
      // Shortage material
      const shortageRow = screen.getByRole('row', { name: /STEEL-SPRING/i });
      expect(shortageRow.getByText('SHORTAGE')).toBeInTheDocument();
      expect(shortageRow.getByText('-55')).toBeInTheDocument();
    });
  });

  it('shows incoming PO for shortage material', async () => {
    server.use(mockProductionContextWithShortage());
    render(<ProductionOrderPanel productionOrderId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('PO-0156 arriving Jan 14')).toBeInTheDocument();
    });
  });

  it('shows machine assignment', async () => {
    server.use(mockProductionContextWithMachine());
    render(<ProductionOrderPanel productionOrderId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('P1S-01')).toBeInTheDocument();
    });
  });
});
```

---

### UI-202: Integrate Panel into Production Page
**Time:** 1-2 hours
**Dependencies:** UI-201
**Description:** Replace simple modal with slide panel

**Tasks:**
- [ ] Add SlidePanel wrapper component
- [ ] On kanban card click, open ProductionOrderPanel in slide panel
- [ ] Maintain current kanban functionality
- [ ] Add keyboard shortcut (Escape to close)

**Integration Test:** `tests/e2e/production-panel.spec.ts`
```typescript
test.describe('Production Order Panel', () => {
  test('clicking production card opens detail panel', async ({ page }) => {
    await seedTestScenario('production-in-progress');
    await login(page);
    await page.goto('/admin/production');
    
    // Click a production order card
    await page.getByText('PO-2025-0142').click();
    
    // Panel should slide in
    const panel = page.getByTestId('production-order-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Demand Source')).toBeVisible();
  });

  test('panel shows linked sales order', async ({ page }) => {
    await seedTestScenario('production-mto');
    await login(page);
    await page.goto('/admin/production');
    
    await page.getByText('PO-2025-0142').click();
    
    const panel = page.getByTestId('production-order-panel');
    await expect(panel.getByText('SO-2025-0089')).toBeVisible();
    await expect(panel.getByText('Acme Corp')).toBeVisible();
  });

  test('panel shows material shortage warning', async ({ page }) => {
    await seedTestScenario('production-with-shortage');
    await login(page);
    await page.goto('/admin/production');
    
    await page.getByText('PO-2025-0142').click();
    
    const panel = page.getByTestId('production-order-panel');
    await expect(panel.getByText('SHORTAGE')).toBeVisible();
    await expect(panel.getByText('Spring Steel Sheet')).toBeVisible();
  });

  test('escape key closes panel', async ({ page }) => {
    await seedTestScenario('production-in-progress');
    await login(page);
    await page.goto('/admin/production');
    
    await page.getByText('PO-2025-0142').click();
    await expect(page.getByTestId('production-order-panel')).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('production-order-panel')).not.toBeVisible();
  });
});
```

---

### UI-203: Add Context to Kanban Cards
**Time:** 1-2 hours
**Dependencies:** API-202
**Description:** Show key context directly on kanban cards

**Tasks:**
- [ ] Add linked SO code badge to card (if MTO)
- [ ] Add material availability indicator (✓ / ⚠ / ❌)
- [ ] Add due date with color coding (red if late, yellow if today)
- [ ] Add machine name if scheduled

**Before:**
```
┌─────────────────────┐
│ PO-0142             │
│ 100 units           │
│ Widget Assembly     │
│ [Complete]          │
└─────────────────────┘
```

**After:**
```
┌─────────────────────┐
│ PO-0142    ⚠ Mats  │
│ 100 units    P1S-01 │
│ Widget Assembly     │
│ SO-0089 │ Due: Jan15│
│ [Complete]          │
└─────────────────────┘
```

**Component Tests:** Add to existing kanban card tests
```javascript
it('shows linked sales order badge', () => {
  render(<ProductionCard order={mockOrderMTO} />);
  expect(screen.getByText('SO-0089')).toBeInTheDocument();
});

it('shows STOCK badge for MTS orders', () => {
  render(<ProductionCard order={mockOrderMTS} />);
  expect(screen.getByText('STOCK')).toBeInTheDocument();
});

it('shows material warning indicator when shortage', () => {
  render(<ProductionCard order={mockOrderWithShortage} />);
  expect(screen.getByTitle('Material shortage')).toBeInTheDocument();
});

it('shows due date in red when overdue', () => {
  render(<ProductionCard order={mockOrderOverdue} />);
  const dueDate = screen.getByText(/Jan 10/);
  expect(dueDate).toHaveClass('text-red-400');
});
```

---

### E2E-201: Production Order Context Flow Test
**Time:** 1 hour
**Dependencies:** UI-202, UI-203
**Description:** Complete E2E test for production order context

**Test File:** `tests/e2e/flows/production-context-flow.spec.ts`
```typescript
test.describe('Production Order Context Flow', () => {
  test('can see full context and trace to sales order', async ({ page }) => {
    await seedTestScenario('full-production-context');
    await login(page);
    await page.goto('/admin/production');
    
    // Step 1: Find production order with SO link visible on card
    const card = page.getByTestId('production-card-PO-2025-0142');
    await expect(card.getByText('SO-0089')).toBeVisible();
    await expect(card.getByText('P1S-01')).toBeVisible();
    
    // Step 2: Click to open panel
    await card.click();
    const panel = page.getByTestId('production-order-panel');
    
    // Step 3: Verify demand source section
    await expect(panel.getByText('Demand Source')).toBeVisible();
    await expect(panel.getByText('SO-2025-0089')).toBeVisible();
    await expect(panel.getByText('Acme Corp')).toBeVisible();
    await expect(panel.getByText('Ship By: Jan 15')).toBeVisible();
    
    // Step 4: Verify material requirements
    await expect(panel.getByText('Material Requirements')).toBeVisible();
    await expect(panel.getByText('Black PLA')).toBeVisible();
    await expect(panel.getByText('Spring Steel Sheet')).toBeVisible();
    
    // Step 5: Click through to sales order
    await panel.getByRole('link', { name: 'SO-2025-0089' }).click();
    await expect(page.getByRole('heading', { name: 'SO-2025-0089' })).toBeVisible();
  });

  test('can see material shortage and trace to incoming PO', async ({ page }) => {
    await seedTestScenario('production-with-shortage');
    await login(page);
    await page.goto('/admin/production');
    
    // Open order with shortage
    await page.getByTestId('production-card-PO-2025-0142').click();
    const panel = page.getByTestId('production-order-panel');
    
    // Find the shortage row
    const shortageRow = panel.getByRole('row', { name: /Spring Steel/i });
    await expect(shortageRow.getByText('SHORTAGE')).toBeVisible();
    await expect(shortageRow.getByText('PO-0156')).toBeVisible();
    
    // Click through to the incoming PO
    await shortageRow.getByRole('link', { name: 'PO-0156' }).click();
    await expect(page).toHaveURL(/\/admin\/purchasing/);
    await expect(page.getByText('PO-0156')).toBeVisible();
  });
});
```

---

## Epic 3: Sales Order Fulfillment Visibility

> **Goal:** See at a glance how complete each order is and what's blocking it

---

### API-301: Sales Order Fulfillment Status Query
**Time:** 2-3 hours
**Dependencies:** API-201
**Description:** Calculate fulfillment status for each SO line

**Tasks:**
- [ ] Create `get_sales_order_fulfillment(so_id)` function
- [ ] For each line, find linked production orders
- [ ] Calculate: ordered qty, completed qty, in_progress qty
- [ ] Identify blocking issues (material shortages, not started)
- [ ] Calculate overall fulfillment percentage

**API Response Shape:**
```python
{
    "id": 789,
    "code": "SO-2025-0089",
    "customer_name": "Acme Corp",
    "ship_date": "2025-01-15",
    "status": "in_production",
    
    "fulfillment_percent": 67,  # 2 of 3 lines ready
    "total_value": 2340.00,
    "fulfilled_value": 1565.00,
    
    "lines": [
        {
            "line_number": 1,
            "product_name": "Widget Assembly",
            "quantity_ordered": 75,
            "quantity_ready": 75,
            "status": "ready_to_ship",
            "production_orders": [
                {"code": "PO-0138", "status": "complete", "qty": 75}
            ]
        },
        {
            "line_number": 2,
            "product_name": "Gadget Pro",
            "quantity_ordered": 25,
            "quantity_ready": 0,
            "quantity_in_progress": 25,
            "status": "in_production",
            "production_orders": [
                {"code": "PO-0142", "status": "in_progress", "qty": 25, 
                 "completion_percent": 45, "estimated_completion": "2025-01-14"}
            ]
        },
        {
            "line_number": 3,
            "product_name": "Accessory Pack",
            "quantity_ordered": 10,
            "quantity_ready": 0,
            "status": "blocked",
            "blocking_reason": "Material shortage: Spring Steel Sheet (-55 ea)",
            "blocking_material_id": 102,
            "production_orders": [
                {"code": "PO-0148", "status": "released", "qty": 10}
            ]
        }
    ],
    
    "blocking_issues": [
        {
            "type": "material_shortage",
            "item_id": 102,
            "item_name": "Spring Steel Sheet",
            "shortage_qty": 55,
            "affects_lines": [3],
            "resolution": "PO-0156 arriving Jan 14"
        }
    ]
}
```

---

### API-302: Sales Order Fulfillment Endpoint
**Time:** 30 min
**Dependencies:** API-301
**Description:** Expose fulfillment status via REST API

---

### API-303: Enhance Sales Order List with Fulfillment Summary
**Time:** 1 hour
**Dependencies:** API-301
**Description:** Add fulfillment_percent to SO list response

---

### UI-301: SalesOrderCard with Fulfillment Progress
**Time:** 2 hours
**Dependencies:** API-303
**Description:** Card component showing SO with visual fulfillment status

---

### UI-302: SalesOrderDetailPage Redesign
**Time:** 3-4 hours
**Dependencies:** API-302, UI-301
**Description:** Full SO detail page with fulfillment visibility

---

### UI-303: Integrate into Sales Orders List
**Time:** 1-2 hours
**Dependencies:** UI-301
**Description:** Replace simple list with fulfillment-aware cards

---

### E2E-301: Sales Order Fulfillment Flow Test
**Time:** 1 hour
**Dependencies:** UI-302, UI-303
**Description:** Complete E2E test for SO fulfillment visibility

---

## Epic 4: Smart Production Queue

> **Goal:** Replace simple kanban with prioritized, actionable queue

---

### API-401: Production Queue with Readiness Status
**Time:** 2-3 hours
**Dependencies:** API-201
**Description:** Return production orders grouped by readiness

---

### UI-401: SmartProductionQueue Component
**Time:** 3-4 hours
**Dependencies:** API-401
**Description:** Main production queue view

---

### UI-402: Replace Kanban with Smart Queue
**Time:** 2 hours
**Dependencies:** UI-401
**Description:** Make Smart Queue the default production view

---

## Epic 5: Command Center Dashboard

> **Goal:** "What do I need to do RIGHT NOW?"

---

### API-501: Action Items Query
**Time:** 2-3 hours
**Description:** Identify all issues needing attention

---

### API-502: Today's Summary Query
**Time:** 1-2 hours
**Description:** Summary stats for current day

---

### UI-501: AlertCard Component
**Time:** 1 hour
**Description:** Reusable alert display card

---

### UI-502: MachineStatusGrid Component
**Time:** 2 hours
**Description:** Visual grid of machine status

---

### UI-503: CommandCenter Page
**Time:** 3-4 hours
**Dependencies:** API-501, API-502, UI-501, UI-502
**Description:** New dashboard focused on actions

---

## Epic 6: Complete Flow Integration

> **Goal:** Test entire Quote → Cash workflow

---

### E2E-601: Full Workflow Integration Test
**Time:** 2-3 hours
**Dependencies:** All previous epics
**Description:** Master E2E test covering complete workflow

---

## Implementation Order Summary

```
Week 1: Foundation
├── INFRA-001: Playwright setup
├── INFRA-002: Pytest setup  
├── INFRA-003: Test factories
└── Checkpoint: Can run tests ✓

Week 2: Demand Pegging
├── API-101: Item allocations
├── API-102: Supply situation
├── API-103: Demand pegging endpoint
├── UI-101: DemandPegging component
├── UI-102: Integrate into low stock
└── E2E-101: Demand pegging flow ✓

Week 3: Production Context
├── API-201: Production order context
├── API-202: Context endpoint
├── UI-201: ProductionOrderPanel
├── UI-202: Integrate panel
├── UI-203: Enhanced kanban cards
└── E2E-201: Production context flow ✓

Week 4: Sales Order Fulfillment
├── API-301: Fulfillment status
├── API-302: Fulfillment endpoint
├── API-303: Enhanced SO list
├── UI-301: SalesOrderCard
├── UI-302: SO detail redesign
├── UI-303: Integrate into list
└── E2E-301: Fulfillment flow ✓

Week 5: Smart Production Queue
├── API-401: Production queue
├── UI-401: SmartProductionQueue
├── UI-402: Replace kanban default
└── E2E: Update production tests ✓

Week 6: Command Center
├── API-501: Action items
├── API-502: Today's summary
├── UI-501: AlertCard
├── UI-502: MachineStatusGrid
├── UI-503: CommandCenter page
└── E2E: Dashboard tests ✓

Week 7: Integration & Polish
├── E2E-601: Full workflow test
├── Fix issues found in E2E
├── Performance optimization
└── Documentation
```

---

## Test Coverage Targets

| Area | Unit Test | Integration | E2E |
|------|-----------|-------------|-----|
| Demand Pegging API | ≥90% | ✓ | ✓ |
| Production Context API | ≥90% | ✓ | ✓ |
| Fulfillment API | ≥90% | ✓ | ✓ |
| UI Components | ≥80% | - | ✓ |
| Complete Flows | - | - | ✓ |

---

## Definition of Done (Each Ticket)

- [ ] Code complete
- [ ] Unit tests written and passing
- [ ] Integration test (if API) written and passing
- [ ] E2E test fragment written
- [ ] Combined E2E tests still pass
- [ ] No regressions in existing tests
- [ ] Code reviewed (if team)
- [ ] Documented (if public API or component)
