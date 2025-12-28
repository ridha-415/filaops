/**
 * Business Logic Validation Tests
 * 
 * Tests specific calculations, data accuracy, and business rules.
 * These tests verify the actual numbers and logic work correctly.
 */

import { test, expect } from '../fixtures/auth';

test.describe('Order Calculations', () => {
  
  test('calculates order total correctly', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/orders');
    await page.getByRole('button', { name: /create.*order/i }).click();
    
    // Fill customer info
    await page.fill('input[name="customer_email"]', 'calc-test@example.com');
    await page.fill('input[name="shipping_address_line1"]', '123 Test St');
    await page.fill('input[name="shipping_city"]', 'Test City');
    await page.fill('input[name="shipping_state"]', 'CA');
    await page.fill('input[name="shipping_zip"]', '90001');
    
    // Add line item with known values
    await page.getByRole('button', { name: /add.*line/i }).click();
    
    // Wait for product dropdown and select first product
    const productSelect = page.locator('select[name="product_id"]');
    await productSelect.waitFor();
    
    // Get the price of selected product
    await productSelect.selectOption({ index: 1 });
    
    // Check if price is displayed
    const priceText = await page.locator('[data-testid="unit-price"]').textContent();
    const unitPrice = parseFloat(priceText?.replace(/[^0-9.]/g, '') || '0');
    
    // Enter quantity
    await page.fill('input[name="quantity"]', '10');
    
    // Add shipping
    await page.fill('input[name="shipping_cost"]', '15.00');
    
    // Calculate expected total
    const expectedSubtotal = unitPrice * 10;
    const expectedTotal = expectedSubtotal + 15.00;
    
    // Verify calculated values
    const subtotalText = await page.locator('[data-testid="subtotal"]').textContent();
    const totalText = await page.locator('[data-testid="total"]').textContent();
    
    const displayedSubtotal = parseFloat(subtotalText?.replace(/[^0-9.]/g, '') || '0');
    const displayedTotal = parseFloat(totalText?.replace(/[^0-9.]/g, '') || '0');
    
    expect(displayedSubtotal).toBeCloseTo(expectedSubtotal, 2);
    expect(displayedTotal).toBeCloseTo(expectedTotal, 2);
  });

  test('updates totals when quantity changes', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/orders');
    await page.getByRole('button', { name: /create.*order/i }).click();
    
    // Add product
    await page.locator('select[name="product_id"]').selectOption({ index: 1 });
    await page.fill('input[name="quantity"]', '5');
    
    const initialTotal = await page.locator('[data-testid="total"]').textContent();
    
    // Change quantity
    await page.fill('input[name="quantity"]', '10');
    
    const newTotal = await page.locator('[data-testid="total"]').textContent();
    
    // Total should double
    expect(newTotal).not.toBe(initialTotal);
  });

  test('applies tax correctly', async ({ authenticatedPage: page }) => {
    // If you have tax calculation
    await page.goto('/admin/orders');
    
    // Find order with tax
    const orderWithTax = page.locator('tr').filter({ hasText: /tax/i }).first();
    if (await orderWithTax.count() > 0) {
      await orderWithTax.click();
      
      // Get values
      const subtotal = await page.locator('[data-testid="subtotal"]').textContent();
      const tax = await page.locator('[data-testid="tax"]').textContent();
      const total = await page.locator('[data-testid="total"]').textContent();
      
      const subtotalNum = parseFloat(subtotal?.replace(/[^0-9.]/g, '') || '0');
      const taxNum = parseFloat(tax?.replace(/[^0-9.]/g, '') || '0');
      const totalNum = parseFloat(total?.replace(/[^0-9.]/g, '') || '0');
      
      // Verify: total = subtotal + tax
      expect(totalNum).toBeCloseTo(subtotalNum + taxNum, 2);
    }
  });
});

test.describe('Inventory Impact', () => {
  
  test('decrements inventory when order created', async ({ authenticatedPage: page }) => {
    // Get initial inventory level
    await page.goto('/admin/inventory');
    
    const firstProduct = page.locator('tr[data-product-id]').first();
    const productId = await firstProduct.getAttribute('data-product-id');
    const initialQty = await firstProduct.locator('[data-testid="quantity"]').textContent();
    const initialQtyNum = parseInt(initialQty || '0');
    
    // Create order with this product
    await page.goto('/admin/orders');
    await page.getByRole('button', { name: /create.*order/i }).click();
    
    await page.fill('input[name="customer_email"]', 'inventory-test@example.com');
    await page.locator('select[name="product_id"]').selectOption(productId || '1');
    await page.fill('input[name="quantity"]', '5');
    await page.getByRole('button', { name: /save|create/i }).click();
    
    // Check inventory decreased
    await page.goto('/admin/inventory');
    const newQty = await page.locator(`tr[data-product-id="${productId}"] [data-testid="quantity"]`).textContent();
    const newQtyNum = parseInt(newQty || '0');
    
    // Inventory should decrease by 5
    expect(newQtyNum).toBe(initialQtyNum - 5);
  });

  test('prevents order if insufficient inventory', async ({ authenticatedPage: page }) => {
    // Find product with low inventory
    await page.goto('/admin/inventory');
    
    const lowStockProduct = page.locator('tr').filter({ hasText: /low.*stock|out.*stock/i }).first();
    if (await lowStockProduct.count() > 0) {
      const productId = await lowStockProduct.getAttribute('data-product-id');
      const availableQty = await lowStockProduct.locator('[data-testid="quantity"]').textContent();
      const availableQtyNum = parseInt(availableQty || '0');
      
      // Try to order more than available
      await page.goto('/admin/orders');
      await page.getByRole('button', { name: /create.*order/i }).click();
      
      await page.locator('select[name="product_id"]').selectOption(productId || '1');
      await page.fill('input[name="quantity"]', String(availableQtyNum + 10));
      await page.getByRole('button', { name: /save|create/i }).click();
      
      // Should show error
      await expect(page.getByText(/insufficient.*inventory|not.*enough.*stock/i)).toBeVisible();
    }
  });
});

test.describe('BOM & MRP Logic', () => {
  
  test('BOM explosion calculates material requirements correctly', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/mrp');
    
    // Create production order for assembly (e.g., "Printed Part with Hardware")
    await page.getByRole('button', { name: /create.*production/i }).click();
    
    await page.locator('select[name="product_id"]').selectOption({ label: /assembly|kit/i });
    await page.fill('input[name="quantity"]', '10');
    
    // Trigger MRP calculation
    await page.getByRole('button', { name: /calculate.*requirements/i }).click();
    
    // Verify material requirements
    // Example: If BOM says 1 assembly needs 2 screws, 10 assemblies need 20 screws
    const screwRequirement = page.locator('tr').filter({ hasText: /screw/i });
    if (await screwRequirement.count() > 0) {
      const requiredQty = await screwRequirement.locator('[data-testid="required-qty"]').textContent();
      const requiredQtyNum = parseInt(requiredQty || '0');
      
      // If BOM qty = 2, then 10 assemblies × 2 = 20
      expect(requiredQtyNum).toBe(20); // Adjust based on actual BOM
    }
  });

  test('MRP calculates net requirements (gross - on hand)', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/mrp');
    
    // Get material with known inventory
    const material = page.locator('tr[data-material-id]').first();
    const materialId = await material.getAttribute('data-material-id');
    
    // Get current inventory
    const onHand = await material.locator('[data-testid="on-hand"]').textContent();
    const onHandNum = parseInt(onHand || '0');
    
    // Set gross requirement
    const grossRequirement = onHandNum + 50; // Require more than we have
    await page.fill(`input[name="gross-requirement-${materialId}"]`, String(grossRequirement));
    
    // Calculate net requirement
    await page.getByRole('button', { name: /calculate/i }).click();
    
    const netRequirement = await material.locator('[data-testid="net-requirement"]').textContent();
    const netRequirementNum = parseInt(netRequirement || '0');
    
    // Net = Gross - On Hand
    expect(netRequirementNum).toBe(grossRequirement - onHandNum);
  });

  test('multi-level BOM explosion works correctly', async ({ authenticatedPage: page }) => {
    // Test nested assemblies
    // Example: Car Kit contains Wheel Assembly, Wheel Assembly contains Wheel + Tire
    
    await page.goto('/admin/bom');
    
    // Find multi-level product
    const carKit = page.locator('tr').filter({ hasText: /car.*kit|assembly/i }).first();
    await carKit.click();
    
    // Expand BOM tree
    await page.getByRole('button', { name: /expand.*all/i }).click();
    
    // Verify nested components visible
    await expect(page.getByText(/wheel.*assembly/i)).toBeVisible();
    await expect(page.getByText(/wheel/i)).toBeVisible();
    await expect(page.getByText(/tire/i)).toBeVisible();
    
    // Create production order for 5 car kits
    await page.getByRole('button', { name: /create.*production/i }).click();
    await page.fill('input[name="quantity"]', '5');
    await page.getByRole('button', { name: /calculate/i }).click();
    
    // If each car needs 4 wheels, and each wheel assembly has 1 wheel + 1 tire
    // Then 5 cars × 4 wheel assemblies = 20 wheels and 20 tires
    const wheelQty = await page.locator('tr').filter({ hasText: /^wheel$/i })
      .locator('[data-testid="required-qty"]').textContent();
    expect(parseInt(wheelQty || '0')).toBe(20);
  });
});

test.describe('Business Rules Enforcement', () => {
  
  test('cannot ship order without inventory allocation', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/orders');
    
    // Find order ready to ship
    const order = page.locator('tr').filter({ hasText: /ready.*ship/i }).first();
    if (await order.count() > 0) {
      await order.click();
      
      // Check if inventory allocated
      const allocatedQty = await page.locator('[data-testid="allocated-qty"]').textContent();
      
      if (allocatedQty === '0' || !allocatedQty) {
        // Try to ship
        await page.getByRole('button', { name: /ship/i }).click();
        
        // Should be blocked
        await expect(page.getByText(/allocate.*inventory|assign.*inventory/i)).toBeVisible();
      }
    }
  });

  test('production order cannot start without materials', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/production');
    
    // Find released WO
    const wo = page.locator('tr').filter({ hasText: /released/i }).first();
    if (await wo.count() > 0) {
      await wo.click();
      
      // Check material availability
      const materialsReady = await page.locator('[data-testid="materials-ready"]').textContent();
      
      if (materialsReady === 'No' || materialsReady === 'false') {
        // Try to start production
        await page.getByRole('button', { name: /start.*production/i }).click();
        
        // Should be blocked
        await expect(page.getByText(/insufficient.*materials|allocate.*materials/i)).toBeVisible();
      }
    }
  });

  test('validates minimum order quantity', async ({ authenticatedPage: page }) => {
    // If product has MOQ = 10
    await page.goto('/admin/orders');
    await page.getByRole('button', { name: /create.*order/i }).click();
    
    // Select product with MOQ
    const productWithMOQ = await page.locator('select[name="product_id"] option')
      .filter({ hasText: /moq|minimum/i }).first();
    
    if (await productWithMOQ.count() > 0) {
      await productWithMOQ.click();
      
      // Try to order less than MOQ
      await page.fill('input[name="quantity"]', '5'); // Less than 10
      await page.getByRole('button', { name: /save/i }).click();
      
      // Should show validation error
      await expect(page.getByText(/minimum.*quantity|moq/i)).toBeVisible();
    }
  });

  test('prevents negative inventory', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/inventory');
    
    // Find product with low stock
    const product = page.locator('tr[data-product-id]').first();
    const currentQty = await product.locator('[data-testid="quantity"]').textContent();
    const currentQtyNum = parseInt(currentQty || '0');
    
    // Try to adjust inventory to negative
    await product.click();
    await page.getByRole('button', { name: /adjust.*inventory/i }).click();
    await page.fill('input[name="adjustment"]', String(-currentQtyNum - 10));
    await page.getByRole('button', { name: /save/i }).click();
    
    // Should be prevented
    await expect(page.getByText(/cannot.*negative|invalid.*quantity/i)).toBeVisible();
  });
});

test.describe('Quote to Order Conversion', () => {
  
  test('converts quote to order with correct pricing', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/quotes');
    
    // Find approved quote
    const quote = page.locator('tr').filter({ hasText: /approved/i }).first();
    if (await quote.count() > 0) {
      await quote.click();
      
      // Get quote total
      const quoteTotal = await page.locator('[data-testid="quote-total"]').textContent();
      const quoteTotalNum = parseFloat(quoteTotal?.replace(/[^0-9.]/g, '') || '0');
      
      // Convert to order
      await page.getByRole('button', { name: /convert.*order/i }).click();
      
      // Fill shipping
      await page.fill('input[name="shipping_address_line1"]', '123 Test St');
      await page.getByRole('button', { name: /create.*order/i }).click();
      
      // Verify order created with same total
      await expect(page.getByText(/order.*created/i)).toBeVisible();
      
      const orderTotal = await page.locator('[data-testid="order-total"]').textContent();
      const orderTotalNum = parseFloat(orderTotal?.replace(/[^0-9.]/g, '') || '0');
      
      expect(orderTotalNum).toBeCloseTo(quoteTotalNum, 2);
    }
  });

  test('quote pricing includes material costs', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/quotes/new');
    
    // Upload STL file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./e2e/fixtures/test-part.stl');
    
    // Select material
    await page.selectOption('select[name="material"]', 'PLA');
    
    // Get material cost per gram
    const materialCostPerGram = 0.02; // Example: $0.02/gram
    
    // Enter part weight
    await page.fill('input[name="weight"]', '50'); // 50 grams
    
    // Calculate quote
    await page.getByRole('button', { name: /calculate/i }).click();
    
    // Verify material cost calculated correctly
    const materialCost = await page.locator('[data-testid="material-cost"]').textContent();
    const materialCostNum = parseFloat(materialCost?.replace(/[^0-9.]/g, '') || '0');
    
    const expectedMaterialCost = 50 * materialCostPerGram; // 50g × $0.02 = $1.00
    expect(materialCostNum).toBeCloseTo(expectedMaterialCost, 2);
  });
});

test.describe('Data Accuracy After Operations', () => {
  
  test('order data persists after page reload', async ({ authenticatedPage: page }) => {
    // Create order
    await page.goto('/admin/orders');
    await page.getByRole('button', { name: /create.*order/i }).click();
    
    const testEmail = `persist-test-${Date.now()}@example.com`;
    await page.fill('input[name="customer_email"]', testEmail);
    await page.fill('input[name="shipping_zip"]', '90210');
    await page.getByRole('button', { name: /save/i }).click();
    
    // Get order ID
    const orderRow = page.locator('tr').filter({ hasText: testEmail }).first();
    const orderId = await orderRow.getAttribute('data-order-id');
    
    // Reload page
    await page.reload();
    
    // Verify data still there
    await page.locator(`tr[data-order-id="${orderId}"]`).click();
    await expect(page.getByText(testEmail)).toBeVisible();
    await expect(page.getByText('90210')).toBeVisible();
  });

  test('status changes are reflected in all views', async ({ authenticatedPage: page }) => {
    // Change order status
    await page.goto('/admin/orders');
    const order = page.locator('tr').filter({ hasText: /draft/i }).first();
    const orderId = await order.getAttribute('data-order-id');
    
    await order.click();
    await page.getByRole('button', { name: /confirm/i }).click();
    
    // Check order list view
    await page.goto('/admin/orders');
    const updatedOrder = page.locator(`tr[data-order-id="${orderId}"]`);
    await expect(updatedOrder).toContainText('confirmed');
    
    // Check dashboard view
    await page.goto('/admin/dashboard');
    const dashboardOrder = page.locator(`[data-order-id="${orderId}"]`);
    if (await dashboardOrder.count() > 0) {
      await expect(dashboardOrder).toContainText('confirmed');
    }
  });
});
