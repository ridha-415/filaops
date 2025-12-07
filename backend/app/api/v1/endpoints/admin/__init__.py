"""
Admin endpoints - requires admin authentication
"""
from fastapi import APIRouter
from . import bom, dashboard, fulfillment, audit, accounting, traceability, customers

router = APIRouter()

# Customer Management
router.include_router(customers.router)

# BOM Management
router.include_router(bom.router)

# Admin Dashboard
router.include_router(dashboard.router)

# Fulfillment (Quote-to-Ship workflow)
router.include_router(fulfillment.router)

# Transaction Audit
router.include_router(audit.router)

# Accounting Views
router.include_router(accounting.router)

# Traceability (Serial Numbers, Material Lots, Recall Queries)
router.include_router(traceability.router)
