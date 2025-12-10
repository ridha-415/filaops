# Changelog

All notable changes to FilaOps will be documented in this file.

## [1.0.1] - 2025-12-09

### Changed
- **Repository Organization**: Reorganized documentation structure for better collaboration
  - Moved 75+ markdown files into organized `docs/` subdirectories (architecture, planning, history, development, sessions)
  - Organized scripts by purpose (github/, database/, tools/)
  - Cleaned root directory to only essential user-facing documentation
  - Added documentation index and organization guide

### Technical
- **Type Checking**: Added mypy type checking infrastructure
  - Configured mypy in `pyproject.toml` with SQLAlchemy plugin support
  - Integrated type checking into CI pipeline
  - Documented SQLAlchemy ORM type inference limitations
- **Code Quality**: Completed Issue #27 improvements
  - Standardized logging across 15+ files to use structured logger
  - Removed duplicate logger setups
  - Added type checking dependencies to requirements.txt
- **CI/CD**: Enhanced GitHub Actions workflow
  - Added mypy type checking step (non-blocking)
  - Improved code quality checks

### Fixed
- Removed workspace files from repository
- Updated `.gitignore` to exclude workspace files

## [Unreleased]

### Added
- **Unified Item Master**: Single `Products` table for all item types (finished goods, components, supplies, materials)
- **Inventory Transactions**: Complete transaction system for receipts, issues, transfers, adjustments, consumption, and scrap
- **Order Command Center**: Comprehensive order detail page with MRP explosion, material/capacity requirements, and shortage detection
- **Dashboard Improvements**: Real-time KPIs including overdue orders, low stock items (with MRP integration), and revenue metrics
- **SKU Auto-generation**: Automatic SKU generation based on item type (FG, CP, SP, SV prefixes)
- **BOM Editor**: Standalone BOM editor with material support and explicit unit of measure
- **Routing Editor**: Full routing operation management with work center integration
- **Shipping Enhancements**: Production status validation, multi-carrier support, integration with Order Command Center
- **Low Stock with MRP**: Enhanced low stock alerts to include shortages from active sales orders
- **Customer Management**: Full customer CRUD with navigation from order creation workflow

### Changed
- **Material System**: Materials now use unified `Products` table instead of separate `MaterialInventory` table
- **BOM Lines**: Added explicit `unit` field and `is_cost_only` flag for better cost tracking
- **Order Creation**: Improved workflow with navigation to full customer/item pages instead of inline forms
- **Dashboard**: Enhanced with actionable alerts and improved data accuracy

### Fixed
- **SQL Server Compatibility**: Fixed `created_at` timestamp issues for customer creation and refresh tokens
- **Dashboard Queries**: Corrected column references (`estimated_completion_date` instead of `ship_by_date`)
- **Low Stock Calculation**: Fixed to properly aggregate inventory across locations and include MRP shortages
- **Order Authorization**: Admin users can now view and manage all orders
- **Frontend Theming**: Consistent dark theme across all pages (including RoutingEditor)
- **Ship Order Logic**: Added validation to prevent shipping orders with incomplete production or material shortages

### Technical
- **MRP Refactor**: Completed Phase 5 of MRP refactoring plan
- **Database Schema**: Unified product model with material type and color relationships
- **API Endpoints**: New endpoints for inventory transactions and enhanced dashboard data
- **Frontend Components**: Simplified item creation, separate BOM/Routing editors, Order Command Center

## [Previous Versions]

See git history for earlier changes.

