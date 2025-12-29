"""
Tests for GET /sales-orders/{id}/fulfillment-status (API-301)

Tests the fulfillment status endpoint for sales orders.
"""
import pytest
from decimal import Decimal
from datetime import date, timedelta
from tests.factories import (
    create_test_user, create_test_product, create_test_sales_order,
    create_test_inventory, create_test_vendor, create_test_purchase_order,
    get_or_create_default_location, reset_sequences
)


class TestFulfillmentStatusEndpoint:
    """Tests for GET /sales-orders/{id}/fulfillment-status"""

    @pytest.fixture(autouse=True)
    def setup(self, db_session):
        """Reset sequences before each test."""
        reset_sequences()

    def test_ready_to_ship_all_lines_allocated(self, client, db_session, admin_headers):
        """Order with all lines fully allocated should be ready_to_ship."""
        # Arrange
        user = create_test_user(db_session, account_type="admin")
        product = create_test_product(db_session, sku="FIL-TEST-001", name="Test Filament")
        order = create_test_sales_order(
            db_session,
            user=user,
            lines=[{"product": product, "quantity": 10, "unit_price": Decimal("25.00")}]
        )
        # Get the order line and set allocated quantity
        order_line = order.lines[0]
        order_line.allocated_quantity = Decimal("10")
        db_session.commit()

        # Act
        response = client.get(
            f"/api/v1/sales-orders/{order.id}/fulfillment-status",
            headers=admin_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["state"] == "ready_to_ship"
        assert data["summary"]["lines_total"] == 1
        assert data["summary"]["lines_ready"] == 1
        assert data["summary"]["fulfillment_percent"] == 100.0
        assert data["summary"]["can_ship_complete"] is True

    def test_partially_ready_some_lines_allocated(self, client, db_session, admin_headers):
        """Order with some lines allocated should be partially_ready."""
        # Arrange
        user = create_test_user(db_session, account_type="admin")
        product1 = create_test_product(db_session, sku="FIL-TEST-001", name="Test Filament 1")
        product2 = create_test_product(db_session, sku="FIL-TEST-002", name="Test Filament 2")
        order = create_test_sales_order(
            db_session,
            user=user,
            lines=[
                {"product": product1, "quantity": 10, "unit_price": Decimal("25.00")},
                {"product": product2, "quantity": 10, "unit_price": Decimal("25.00")},
            ]
        )
        # Fully allocate line1, no allocation for line2
        order.lines[0].allocated_quantity = Decimal("10")
        order.lines[1].allocated_quantity = Decimal("0")
        db_session.commit()

        # Act
        response = client.get(
            f"/api/v1/sales-orders/{order.id}/fulfillment-status",
            headers=admin_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["state"] == "partially_ready"
        assert data["summary"]["lines_ready"] == 1
        assert data["summary"]["lines_blocked"] == 1
        assert data["summary"]["fulfillment_percent"] == 50.0
        assert data["summary"]["can_ship_partial"] is True
        assert data["summary"]["can_ship_complete"] is False

    def test_blocked_no_lines_allocated(self, client, db_session, admin_headers):
        """Order with no allocations should be blocked."""
        # Arrange
        user = create_test_user(db_session, account_type="admin")
        product = create_test_product(db_session, sku="FIL-TEST-001", name="Test Filament")
        order = create_test_sales_order(
            db_session,
            user=user,
            lines=[{"product": product, "quantity": 10, "unit_price": Decimal("25.00")}]
        )
        # No allocation - leave allocated_quantity as default (0)
        db_session.commit()

        # Act
        response = client.get(
            f"/api/v1/sales-orders/{order.id}/fulfillment-status",
            headers=admin_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["state"] == "blocked"
        assert data["summary"]["lines_ready"] == 0
        assert data["summary"]["can_ship_partial"] is False

    def test_line_details_include_shortage(self, client, db_session, admin_headers):
        """Line status should include shortage amount."""
        # Arrange
        user = create_test_user(db_session, account_type="admin")
        product = create_test_product(db_session, sku="FIL-TEST-001", name="Test Filament")
        order = create_test_sales_order(
            db_session,
            user=user,
            lines=[{"product": product, "quantity": 10, "unit_price": Decimal("25.00")}]
        )
        # Partial allocation
        order.lines[0].allocated_quantity = Decimal("7")
        db_session.commit()

        # Act
        response = client.get(
            f"/api/v1/sales-orders/{order.id}/fulfillment-status",
            headers=admin_headers
        )

        # Assert
        data = response.json()
        line_status = data["lines"][0]
        assert line_status["quantity_ordered"] == 10.0
        assert line_status["quantity_allocated"] == 7.0
        assert line_status["shortage"] == 3.0
        assert line_status["is_ready"] is False
        assert "need 3" in line_status["blocking_reason"].lower()

    def test_404_for_nonexistent_order(self, client, admin_headers):
        """Should return 404 for nonexistent order."""
        # Act
        response = client.get(
            "/api/v1/sales-orders/99999/fulfillment-status",
            headers=admin_headers
        )

        # Assert
        assert response.status_code == 404

    def test_requires_authentication(self, client):
        """Should require auth token."""
        # Act
        response = client.get("/api/v1/sales-orders/1/fulfillment-status")

        # Assert
        assert response.status_code == 401

    def test_shipped_order_shows_shipped_state(self, client, db_session, admin_headers):
        """Shipped orders should show shipped state."""
        # Arrange
        user = create_test_user(db_session, account_type="admin")
        product = create_test_product(db_session, sku="FIL-TEST-001", name="Test Filament")
        order = create_test_sales_order(
            db_session,
            user=user,
            lines=[{"product": product, "quantity": 10, "unit_price": Decimal("25.00")}],
            status="shipped"
        )
        order.lines[0].shipped_quantity = Decimal("10")
        db_session.commit()

        # Act
        response = client.get(
            f"/api/v1/sales-orders/{order.id}/fulfillment-status",
            headers=admin_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["state"] == "shipped"

    def test_cancelled_order_shows_cancelled_state(self, client, db_session, admin_headers):
        """Cancelled orders should show cancelled state."""
        # Arrange
        user = create_test_user(db_session, account_type="admin")
        product = create_test_product(db_session, sku="FIL-TEST-001", name="Test Filament")
        order = create_test_sales_order(
            db_session,
            user=user,
            lines=[{"product": product, "quantity": 10, "unit_price": Decimal("25.00")}],
            status="cancelled"
        )
        db_session.commit()

        # Act
        response = client.get(
            f"/api/v1/sales-orders/{order.id}/fulfillment-status",
            headers=admin_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["state"] == "cancelled"
