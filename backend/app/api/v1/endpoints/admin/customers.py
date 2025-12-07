"""
Customer Management Endpoints (Admin Only)

Handles customer CRUD operations for admin users.
Customers are users with account_type='customer'.

Note: Customer portal login is a Pro feature. In open source, customers
are CRM records for order management. They cannot log in to a portal.
"""
from typing import List, Optional
from datetime import datetime
import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from passlib.context import CryptContext

from app.db.session import get_db
from app.models.user import User
from app.models.sales_order import SalesOrder
from app.models.quote import Quote
from app.api.v1.endpoints.auth import get_current_admin_user
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerListResponse,
    CustomerResponse,
    CustomerSearchResult,
)

router = APIRouter(prefix="/customers", tags=["Admin - Customer Management"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def generate_customer_number(db: Session) -> str:
    """Generate next customer number like CUST-001"""
    last_customer = (
        db.query(User)
        .filter(User.customer_number.isnot(None))
        .order_by(desc(User.customer_number))
        .first()
    )
    if last_customer and last_customer.customer_number:
        try:
            last_num = int(last_customer.customer_number.split("-")[1])
            return f"CUST-{last_num + 1:03d}"
        except (IndexError, ValueError):
            pass
    return "CUST-001"


# ============================================================================
# LIST & SEARCH ENDPOINTS
# ============================================================================

@router.get("/", response_model=List[CustomerListResponse])
async def list_customers(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    include_inactive: bool = False,
):
    """
    List all customers with optional filters.

    Admin only. Returns customers (users with account_type='customer').
    """
    query = db.query(User).filter(User.account_type == "customer")

    # Status filter
    if status_filter:
        query = query.filter(User.status == status_filter)
    elif not include_inactive:
        query = query.filter(User.status == "active")

    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_term)) |
            (User.first_name.ilike(search_term)) |
            (User.last_name.ilike(search_term)) |
            (User.company_name.ilike(search_term)) |
            (User.customer_number.ilike(search_term)) |
            (User.phone.ilike(search_term))
        )

    # Order by most recent first
    query = query.order_by(desc(User.created_at))

    # Get total count before pagination
    total = query.count()
    customers = query.offset(skip).limit(limit).all()

    # Build response with stats
    result = []
    for customer in customers:
        # Get order stats
        order_stats = db.query(
            func.count(SalesOrder.id).label('order_count'),
            func.sum(SalesOrder.grand_total).label('total_spent'),
            func.max(SalesOrder.created_at).label('last_order')
        ).filter(
            SalesOrder.user_id == customer.id,
            SalesOrder.status != 'cancelled'
        ).first()

        # Build full name
        full_name = None
        if customer.first_name and customer.last_name:
            full_name = f"{customer.first_name} {customer.last_name}"
        elif customer.first_name:
            full_name = customer.first_name
        elif customer.last_name:
            full_name = customer.last_name

        result.append({
            "id": customer.id,
            "customer_number": customer.customer_number,
            "email": customer.email,
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "company_name": customer.company_name,
            "phone": customer.phone,
            "status": customer.status,
            "full_name": full_name,
            "shipping_city": customer.shipping_city,
            "shipping_state": customer.shipping_state,
            "order_count": order_stats.order_count or 0,
            "total_spent": float(order_stats.total_spent or 0),
            "last_order_date": order_stats.last_order,
            "created_at": customer.created_at,
        })

    return result


@router.get("/search", response_model=List[CustomerSearchResult])
async def search_customers(
    q: str = Query(..., min_length=1, description="Search term"),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Quick search for customer dropdown/autocomplete.

    Returns lightweight results for fast UI.
    """
    search_term = f"%{q}%"
    customers = (
        db.query(User)
        .filter(
            User.account_type == "customer",
            User.status == "active",
            (User.email.ilike(search_term)) |
            (User.first_name.ilike(search_term)) |
            (User.last_name.ilike(search_term)) |
            (User.company_name.ilike(search_term)) |
            (User.customer_number.ilike(search_term))
        )
        .order_by(User.last_name, User.first_name)
        .limit(limit)
        .all()
    )

    result = []
    for c in customers:
        full_name = None
        if c.first_name and c.last_name:
            full_name = f"{c.first_name} {c.last_name}"
        elif c.first_name:
            full_name = c.first_name
        elif c.last_name:
            full_name = c.last_name

        result.append({
            "id": c.id,
            "customer_number": c.customer_number,
            "email": c.email,
            "full_name": full_name,
            "company_name": c.company_name,
        })

    return result


# ============================================================================
# GET & CREATE ENDPOINTS
# ============================================================================

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Get a single customer with full details.

    Admin only.
    """
    customer = (
        db.query(User)
        .filter(User.id == customer_id, User.account_type == "customer")
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )

    # Get stats
    order_count = db.query(func.count(SalesOrder.id)).filter(
        SalesOrder.user_id == customer_id,
        SalesOrder.status != 'cancelled'
    ).scalar() or 0

    quote_count = db.query(func.count(Quote.id)).filter(
        Quote.user_id == customer_id
    ).scalar() or 0

    total_spent = db.query(func.sum(SalesOrder.grand_total)).filter(
        SalesOrder.user_id == customer_id,
        SalesOrder.status != 'cancelled'
    ).scalar() or 0

    return {
        "id": customer.id,
        "customer_number": customer.customer_number,
        "email": customer.email,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "company_name": customer.company_name,
        "phone": customer.phone,
        "status": customer.status,
        "email_verified": customer.email_verified,
        "billing_address_line1": customer.billing_address_line1,
        "billing_address_line2": customer.billing_address_line2,
        "billing_city": customer.billing_city,
        "billing_state": customer.billing_state,
        "billing_zip": customer.billing_zip,
        "billing_country": customer.billing_country,
        "shipping_address_line1": customer.shipping_address_line1,
        "shipping_address_line2": customer.shipping_address_line2,
        "shipping_city": customer.shipping_city,
        "shipping_state": customer.shipping_state,
        "shipping_zip": customer.shipping_zip,
        "shipping_country": customer.shipping_country,
        "created_at": customer.created_at,
        "updated_at": customer.updated_at,
        "last_login_at": customer.last_login_at,
        "order_count": order_count,
        "quote_count": quote_count,
        "total_spent": float(total_spent),
    }


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    request: CustomerCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Create a new customer.

    Admin only. Creates user with account_type='customer'.
    """
    # Check for existing email
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Generate customer number
    customer_number = generate_customer_number(db)

    # Use random unusable password - portal login is a Pro feature
    # In open source, customers are CRM records only (no login capability)
    password_hash = get_password_hash(secrets.token_urlsafe(32))

    customer = User(
        customer_number=customer_number,
        email=request.email,
        password_hash=password_hash,
        first_name=request.first_name,
        last_name=request.last_name,
        company_name=request.company_name,
        phone=request.phone,
        status=request.status or "active",
        account_type="customer",
        email_verified=False,
        billing_address_line1=request.billing_address_line1,
        billing_address_line2=request.billing_address_line2,
        billing_city=request.billing_city,
        billing_state=request.billing_state,
        billing_zip=request.billing_zip,
        billing_country=request.billing_country or "USA",
        shipping_address_line1=request.shipping_address_line1,
        shipping_address_line2=request.shipping_address_line2,
        shipping_city=request.shipping_city,
        shipping_state=request.shipping_state,
        shipping_zip=request.shipping_zip,
        shipping_country=request.shipping_country or "USA",
        created_by=current_admin.id,
    )

    db.add(customer)
    db.commit()
    db.refresh(customer)

    print(f"[ADMIN] Customer {customer_number} created by {current_admin.email}")

    return {
        "id": customer.id,
        "customer_number": customer.customer_number,
        "email": customer.email,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "company_name": customer.company_name,
        "phone": customer.phone,
        "status": customer.status,
        "email_verified": customer.email_verified,
        "billing_address_line1": customer.billing_address_line1,
        "billing_address_line2": customer.billing_address_line2,
        "billing_city": customer.billing_city,
        "billing_state": customer.billing_state,
        "billing_zip": customer.billing_zip,
        "billing_country": customer.billing_country,
        "shipping_address_line1": customer.shipping_address_line1,
        "shipping_address_line2": customer.shipping_address_line2,
        "shipping_city": customer.shipping_city,
        "shipping_state": customer.shipping_state,
        "shipping_zip": customer.shipping_zip,
        "shipping_country": customer.shipping_country,
        "created_at": customer.created_at,
        "updated_at": customer.updated_at,
        "last_login_at": customer.last_login_at,
        "order_count": 0,
        "quote_count": 0,
        "total_spent": 0.0,
    }


# ============================================================================
# UPDATE & DELETE ENDPOINTS
# ============================================================================

@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    request: CustomerUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Update a customer.

    Admin only. Partial update supported.
    """
    customer = (
        db.query(User)
        .filter(User.id == customer_id, User.account_type == "customer")
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )

    # Check for duplicate email if changing
    if request.email and request.email != customer.email:
        existing = db.query(User).filter(User.email == request.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(customer, field, value)

    customer.updated_by = current_admin.id
    db.commit()
    db.refresh(customer)

    print(f"[ADMIN] Customer {customer.customer_number} updated by {current_admin.email}")

    # Get stats for response
    order_count = db.query(func.count(SalesOrder.id)).filter(
        SalesOrder.user_id == customer_id,
        SalesOrder.status != 'cancelled'
    ).scalar() or 0

    quote_count = db.query(func.count(Quote.id)).filter(
        Quote.user_id == customer_id
    ).scalar() or 0

    total_spent = db.query(func.sum(SalesOrder.grand_total)).filter(
        SalesOrder.user_id == customer_id,
        SalesOrder.status != 'cancelled'
    ).scalar() or 0

    return {
        "id": customer.id,
        "customer_number": customer.customer_number,
        "email": customer.email,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "company_name": customer.company_name,
        "phone": customer.phone,
        "status": customer.status,
        "email_verified": customer.email_verified,
        "billing_address_line1": customer.billing_address_line1,
        "billing_address_line2": customer.billing_address_line2,
        "billing_city": customer.billing_city,
        "billing_state": customer.billing_state,
        "billing_zip": customer.billing_zip,
        "billing_country": customer.billing_country,
        "shipping_address_line1": customer.shipping_address_line1,
        "shipping_address_line2": customer.shipping_address_line2,
        "shipping_city": customer.shipping_city,
        "shipping_state": customer.shipping_state,
        "shipping_zip": customer.shipping_zip,
        "shipping_country": customer.shipping_country,
        "created_at": customer.created_at,
        "updated_at": customer.updated_at,
        "last_login_at": customer.last_login_at,
        "order_count": order_count,
        "quote_count": quote_count,
        "total_spent": float(total_spent),
    }


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Delete a customer (soft delete by setting status to 'deleted').

    Admin only. Customers with orders cannot be fully deleted.
    """
    customer = (
        db.query(User)
        .filter(User.id == customer_id, User.account_type == "customer")
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )

    # Check for orders
    order_count = db.query(func.count(SalesOrder.id)).filter(
        SalesOrder.user_id == customer_id
    ).scalar() or 0

    if order_count > 0:
        # Soft delete - set status to inactive
        customer.status = "inactive"
        db.commit()
        print(f"[ADMIN] Customer {customer.customer_number} deactivated by {current_admin.email} (has {order_count} orders)")
    else:
        # Hard delete - no orders
        db.delete(customer)
        db.commit()
        print(f"[ADMIN] Customer {customer.customer_number} deleted by {current_admin.email}")

    return None


# ============================================================================
# CUSTOMER ORDERS
# ============================================================================

@router.get("/{customer_id}/orders")
async def get_customer_orders(
    customer_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Get recent orders for a customer.

    Admin only.
    """
    customer = (
        db.query(User)
        .filter(User.id == customer_id, User.account_type == "customer")
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )

    orders = (
        db.query(SalesOrder)
        .filter(SalesOrder.user_id == customer_id)
        .order_by(desc(SalesOrder.created_at))
        .limit(limit)
        .all()
    )

    return [
        {
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "grand_total": float(o.grand_total or 0),
            "payment_status": o.payment_status,
            "created_at": o.created_at,
        }
        for o in orders
    ]
