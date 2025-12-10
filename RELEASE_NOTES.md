# FilaOps Release Notes

## Version 1.0.1 - December 2025

### 🔧 Maintenance Release: Code Quality & Repository Organization

This release focuses on improving code quality, developer experience, and repository maintainability for better collaboration.

---

## What's New

### ✅ Repository Reorganization
- **Better Documentation Structure**: Organized 75+ documentation files into logical subdirectories
  - `docs/architecture/` - Technical architecture and design docs
  - `docs/planning/` - Roadmaps and release plans
  - `docs/development/` - Developer guides and tools
  - `docs/history/` - Project progress and milestones
  - `docs/sessions/` - Context and handoff documents
- **Organized Scripts**: Scripts now organized by purpose
  - `scripts/github/` - GitHub issue and release management
  - `scripts/database/` - Database setup and migration scripts
  - `scripts/tools/` - Utility Python scripts
- **Clean Root Directory**: Only essential user-facing documentation remains in root
- **Navigation**: Added documentation index (`docs/README.md`) and organization guide

### ✅ Code Quality Improvements
- **Type Checking Infrastructure**: Added mypy type checking
  - Configured with SQLAlchemy plugin support
  - Integrated into CI pipeline (non-blocking for gradual adoption)
  - Documented ORM type inference limitations
- **Logging Standardization**: Unified logging across codebase
  - 15+ files updated to use structured logger from `app.logging_config`
  - Removed duplicate logger setups
  - Consistent logging patterns throughout

### ✅ Developer Experience
- **Better CI/CD**: Enhanced GitHub Actions workflow
  - Type checking runs on every build
  - Improved code quality validation
- **Cleaner Repository**: Removed workspace files and improved `.gitignore`

---

## Technical Details

### Files Changed
- **Logging**: 15+ backend files standardized
- **Configuration**: Added mypy config, updated CI workflow
- **Documentation**: Reorganized 75+ files into logical structure

### Dependencies Added
- `mypy==1.7.1` - Static type checking
- `types-python-dateutil==2.8.19.14` - Type stubs

---

## For Contributors

This release improves the development experience:
- **Better Documentation**: Easier to find what you need
- **Type Safety**: Type checking helps catch errors early
- **Consistent Logging**: Easier debugging and monitoring
- **Organized Codebase**: Clearer structure for new contributors

See `docs/README.md` for navigation help and `docs/ORGANIZATION.md` for repository structure guide.

---

## Migration Notes

No migration required - this is a maintenance release with no breaking changes.

---

## Version 1.0.0 - December 2025

### 🎉 Major Milestone: MRP Refactoring Complete

This release represents the completion of a major refactoring effort to unify the product data model and create a complete, production-ready ERP system for 3D print farms.

---

## What's New

### ✅ Unified Item Master System
- **Single Products Table**: All items (finished goods, components, supplies, materials) now use one unified `Products` table
- **Material Integration**: Filament materials are now regular products with `material_type_id` and `color_id` relationships
- **SKU Auto-Generation**: Automatic SKU generation based on item type (FG, CP, SP, SV prefixes)
- **Simplified Data Model**: Eliminated competing data models (MaterialInventory, separate Inventory tables)

### ✅ Complete Order-to-Ship Workflow
1. **Order Creation**: Streamlined workflow with navigation to full customer/item management pages
2. **MRP Explosion**: Automatic calculation of material and capacity requirements from BOMs and routings
3. **Shortage Detection**: Real-time identification of missing materials and capacity constraints
4. **Purchase Orders**: Create POs directly from material shortages
5. **Work Orders**: Generate production orders with routing operations
6. **Production Tracking**: Monitor work order progress and completion
7. **Shipping Validation**: Prevents shipping orders with incomplete production or material shortages

### ✅ Inventory Transaction Management
- **Complete Transaction System**: Receipts, issues, transfers, adjustments, consumption, and scrap tracking
- **Multi-Location Support**: Track inventory across multiple warehouse locations
- **Transaction History**: Full audit trail of all inventory movements
- **Automatic Inventory Updates**: Inventory quantities update automatically based on transaction type

### ✅ Enhanced Dashboard
- **Real-Time KPIs**: Overdue orders, low stock items, revenue metrics
- **MRP-Integrated Alerts**: Low stock alerts include shortages from active sales orders
- **Actionable Data**: Direct links to resolve issues (overdue orders, low stock items)
- **Revenue Tracking**: 30-day revenue and order count metrics

### ✅ Order Command Center
- **Comprehensive Order View**: Complete order details with line items, customer info, shipping address
- **MRP Explosion Display**: Material and capacity requirements with shortage highlighting
- **Production Status**: Track work orders and production progress
- **Action Buttons**: Create work orders, purchase orders, and ship orders with validation

### ✅ UI Improvements
- **Consistent Dark Theme**: All pages now use unified dark theme styling
- **Simplified Forms**: Replaced complex wizards with focused, dedicated forms
- **Separate Editors**: Standalone BOM and Routing editors for better UX
- **Navigation Improvements**: Better workflow for creating customers and items from order creation

---

## Technical Improvements

### Backend
- **SQL Server Compatibility**: Fixed `created_at` timestamp issues for customer creation and refresh tokens
- **Unified API**: Consolidated product creation into `/items` and `/items/material` endpoints
- **MRP Service**: Complete material requirements planning service with BOM and routing explosion
- **Inventory Transactions API**: New endpoints for comprehensive transaction management
- **Dashboard API**: Enhanced with accurate queries and MRP integration

### Frontend
- **Component Simplification**: Replaced ItemWizard with ItemForm and MaterialForm
- **BOM Editor**: Standalone component for managing bill of materials
- **Routing Editor**: Full routing operation management with work center integration
- **Order Detail Page**: Complete order command center with MRP explosion
- **Inventory Transactions Page**: New page for transaction management
- **Dashboard Enhancements**: Improved KPIs and alerts

---

## Bug Fixes

- Fixed dashboard queries using incorrect column names (`estimated_completion_date` vs `ship_by_date`)
- Fixed low stock calculation to properly aggregate inventory across locations
- Fixed order authorization to allow admin users to view all orders
- Fixed ship order logic to validate production completion and material availability
- Fixed customer creation to set timestamps explicitly for SQL Server
- Fixed BOM material selection to properly filter and display materials
- Fixed order creation workflow to navigate to full customer/item pages

---

## Database Changes

- **Products Table**: Added `material_type_id` and `color_id` columns for material integration
- **BOM Lines**: Added explicit `unit` field and `is_cost_only` flag
- **MaterialInventory**: Migrated 146 records to Products + Inventory tables (kept for backward compat)
- **Inventory Transactions**: New table for complete transaction history

---

## Migration Notes

If upgrading from a previous version:
1. Run database migration scripts to add new columns
2. Migrate MaterialInventory data to Products table (if applicable)
3. Update any custom code that references MaterialInventory directly

---

## Known Limitations

- Customer portal is a future Pro feature (backend endpoints exist but UI is admin-only)
- Accounting module is planned but not yet implemented
- Floor MES system (scan routers, claim pieces, QC) is planned for future release

---

## What's Next

### Planned Features
- **Accounting Module**: GL, AR, AP, financial reports for users without QuickBooks
- **Floor MES System**: Scan routers, claim pieces, QC for CofC, traceability
- **Dashboard Enhancements**: More charts, analytics, and actionable insights

### Pro Features (2026)
- Customer Quote Portal
- Multi-material quoting
- E-commerce integrations
- Payment processing
- Shipping integrations

---

## Documentation

- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Setup guide
- **[HOW_IT_WORKS.md](HOW_IT_WORKS.md)** - Workflow explanation
- **[MRP_REFACTOR_PLAN.md](MRP_REFACTOR_PLAN.md)** - Technical architecture
- **[CHANGELOG.md](CHANGELOG.md)** - Detailed change log

---

## Contributors

Built by [BLB3D](https://blb3dprinting.com) - a print farm that needed real manufacturing software.

---

**Version**: 1.0.0  
**Release Date**: December 2025  
**Status**: Production Ready ✅

