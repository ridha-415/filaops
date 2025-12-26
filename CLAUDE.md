# FilaOps - AI Assistant Instructions

> **CRITICAL: READ THIS FIRST** - This document is the single source of truth for ALL AI coding assistants (Claude, Cursor, ChatGPT, etc.). When in doubt, refer to this document.

---

## 🚨 CRITICAL CONFIGURATION (DO NOT ASSUME!)

### Branch Information
- **Current Branch**: `feat/postgres-migration` 
- **DO NOT** make assumptions based on `main` branch
- **ALWAYS** verify you're working with the correct branch files

### Database Configuration
```
Database Server: PostgreSQL 17.7
Database Name: filaops
Host: localhost
Port: 5432
User: postgres
Password: Set via DB_PASSWORD env var
Connection String: postgresql+psycopg://postgres:<password>@localhost:5432/filaops
```

**IMPORTANT**: This is PostgreSQL, NOT SQLite. Never suggest SQLite operations.

### Port Configuration (STANDARDIZED)

| Service | Port | URL | NEVER USE |
|---------|------|-----|-----------|
| **Backend API** | **8000** | http://localhost:8000 | ~~8001~~, ~~8002~~ |
| **Frontend (Vite)** | **5173** | http://localhost:5173 | ~~5174~~ (fallback only) |
| **PostgreSQL** | **5432** | localhost:5432 | - |
| **Redis** (optional) | **6379** | localhost:6379 | - |

**⚠️ WARNING**: If you see port 8001 or 8002 anywhere in the code, IT IS WRONG. Port 8000 is the standard.

### File Locations (ABSOLUTE PATHS)
```
Project Root: C:\repos\filaops\
Backend: C:\repos\filaops\backend\
Frontend: C:\repos\filaops\frontend\
Database Config: C:\repos\filaops\backend\.env
Frontend Config: C:\repos\filaops\frontend\src\config\api.js
Migrations: C:\repos\filaops\backend\alembic\versions\
```

---

## 📋 Before Making ANY Changes

**REQUIRED CHECKLIST** - Follow these steps EVERY TIME:

1. **Verify Current Branch**
   ```bash
   git branch --show-current
   # Should show: feat/postgres-migration
   ```

2. **Read the Specific File First**
   - NEVER assume file contents
   - ALWAYS read the file before modifying
   - Check for recent changes

3. **Check for Existing Patterns**
   - Look at similar existing code
   - Match the existing style
   - Don't introduce new patterns without asking

4. **Ask Before Major Changes**
   - Database schema changes → ASK FIRST
   - Port changes → ASK FIRST
   - New dependencies → ASK FIRST
   - Breaking changes → ASK FIRST

5. **Show Diffs Before Applying**
   - Let user review changes
   - Explain WHY you're making each change
   - Get approval for critical files

---

## 🎯 Known Issues to Avoid

### 1. The "Wrong Files" Problem
**Problem**: AI tools sometimes modify files from wrong branch or wrong location.

**Solution**: 
- ALWAYS use absolute paths: `C:\repos\filaops\...`
- Verify file exists before editing
- Show the file path in your response

### 2. The "Port Confusion" Problem  
**Problem**: Multiple ports in use (8000, 8001, 8002) caused frontend/backend disconnection.

**Solution**: 
- Backend ALWAYS uses port 8000
- Frontend ALWAYS expects port 8000
- If you see 8001 or 8002 → FLAG IT as wrong

### 3. The "Database Assumption" Problem
**Problem**: AI assumes SQLite when it's PostgreSQL.

**Solution**:
- This project uses PostgreSQL
- Connection string format: `postgresql+psycopg://...`
- Use `psycopg` driver, NOT `psycopg2`

### 4. The "Cost Unit Conversion" Bug
**Problem**: When receiving purchase orders in KG, costs weren't converted to $/G.

**Status**: KNOWN BUG - Fix in progress
**Location**: `backend/app/api/v1/endpoints/purchase_orders.py`
**Do NOT**: Try to fix this without explicit user approval

---

## 📁 Project Structure

```
filaops/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/v1/endpoints/  # API routes
│   │   ├── core/              # Config, exceptions
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   └── services/          # Business logic
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Backend tests
│   ├── venv/                  # Python virtual env
│   └── .env                   # Environment config
│
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── config/api.js      # API URL config ⚠️
│   │   └── lib/               # Utilities
│   ├── e2e/                   # Playwright tests
│   └── node_modules/          # Dependencies
│
├── CLAUDE.md                  # THIS FILE - source of truth
├── start-backend.ps1          # Windows backend launcher
├── start-frontend.ps1         # Windows frontend launcher
└── start-all.ps1             # Launch both
```

---

## 🔧 Development Environment

### Services and Ports

| Service | Port | Access URL | Config Location |
|---------|------|------------|-----------------|
| Frontend (dev) | 5173 | http://localhost:5173 | `frontend/vite.config.js` |
| Backend API | 8000 | http://localhost:8000 | `start-backend.ps1` line 87 |
| API Docs (Swagger) | 8000 | http://localhost:8000/docs | Auto-generated |
| PostgreSQL | 5432 | localhost:5432 | `backend/.env` |

### Starting Development Servers

**Option 1: Use Scripts (Recommended)**
```powershell
# Windows - starts both in separate windows
.\start-all.ps1

# Or individually:
.\start-backend.ps1
.\start-frontend.ps1
```

**Option 2: Manual Start**
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate  # Mac/Linux
.\venv\Scripts\activate   # Windows
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## 🔍 How to Verify Changes Work

### After Modifying Backend Code
```bash
cd backend
python -m pytest tests/ -v           # Run all tests
python -m pytest tests/test_specific.py -v -s  # Run specific test
ruff check .                         # Lint check
```

### After Modifying Frontend Code
```bash
cd frontend
npm run dev                          # Start dev server
# Open http://localhost:5173
# Check browser console (F12) for errors
```

### After Changing Port Configuration
```bash
# 1. Kill all running servers
taskkill /F /IM python.exe  # Windows
taskkill /F /IM node.exe

# 2. Restart using scripts
.\start-all.ps1

# 3. Verify in browser
# Frontend: http://localhost:5173
# Backend: http://localhost:8000/docs
# Check Network tab - API calls should go to localhost:8000
```

### After Database Changes
```bash
cd backend
source venv/bin/activate
alembic upgrade head                 # Apply migrations
alembic current                      # Verify current version
```

---

## 💾 Database Operations

### Important Database Facts
- **Engine**: PostgreSQL 17.7 (NOT SQLite, NOT MySQL)
- **Driver**: `psycopg` (NOT `psycopg2`)
- **ORM**: SQLAlchemy with async support
- **Migrations**: Alembic
- **Current Migration**: `031_add_stocking_policy`

### Common Database Commands
```bash
# Connect to database
psql -U postgres -d filaops

# Check migrations
cd backend
alembic current                      # Show current version
alembic history                      # Show all migrations
alembic upgrade head                 # Apply all pending
alembic downgrade -1                 # Rollback one

# Create new migration
alembic revision --autogenerate -m "description"
# ALWAYS review auto-generated migrations before applying!
```

### Database Schema Rules
- Every table has `id` (UUID primary key)
- Every table has `created_at`, `updated_at` timestamps
- Foreign keys use `ON DELETE` constraints appropriately
- Indexes on frequently queried columns
- Use `server_default` for timestamps, not Python defaults

---

## 🎨 Code Style Requirements

### Backend (Python)

**REQUIRED**:
- Type hints on ALL function parameters and returns
- Pydantic models for ALL request/response
- Docstrings on public functions
- Error handling with custom exceptions
- Async/await for database operations

**Example**:
```python
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.product import ProductCreate, ProductResponse
from app.core.exceptions import ProductNotFoundError

async def create_product(
    db: AsyncSession,
    product: ProductCreate,
    user_id: int
) -> ProductResponse:
    """
    Create a new product in the database.
    
    Args:
        db: Database session
        product: Product creation data
        user_id: ID of user creating product
        
    Returns:
        ProductResponse: Created product data
        
    Raises:
        ValidationError: If product data invalid
    """
    # Implementation here
```

### Frontend (React)

**REQUIRED**:
- Dark theme (bg-gray-900, text-white, border-gray-700)
- Tailwind CSS only (no inline styles)
- API calls via `${API_URL}/api/v1/...`
- Error boundaries around async operations
- Loading states for all async actions

**Example**:
```jsx
import { API_URL } from '../config/api';

const fetchProducts = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await fetch(`${API_URL}/api/v1/products`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    setProducts(data.items);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 🧪 Testing Requirements

### Before Committing Code

**MANDATORY CHECKS**:
1. ✅ Backend tests pass: `pytest tests/ -v`
2. ✅ Linting passes: `ruff check .`
3. ✅ No type errors: Check function signatures
4. ✅ Manual testing completed
5. ✅ No console errors in browser

### Test File Locations
```
backend/tests/           # Backend unit/integration tests
frontend/e2e/           # Playwright E2E tests
```

### Writing New Tests

**Backend Test Template**:
```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

async def test_create_product(db_session: AsyncSession):
    """Test product creation with valid data."""
    # Arrange
    product_data = {"name": "Test Product", "sku": "TEST-001"}
    
    # Act
    result = await create_product(db_session, product_data)
    
    # Assert
    assert result.name == "Test Product"
    assert result.sku == "TEST-001"
```

---

## 🚀 Deployment & Scripts

### PowerShell Scripts (Windows)
```powershell
.\start-backend.ps1      # Start backend on port 8000
.\start-frontend.ps1     # Start frontend on port 5173
.\start-all.ps1         # Start both in separate windows
```

### Bash Scripts (Linux/Mac)
```bash
backend/run.sh          # Start backend on port 8000
```

**CRITICAL**: All scripts MUST use port 8000 for backend. If you see 8001 or 8002, it's wrong.

---

## 🔒 Security & Environment Variables

### Backend Environment Variables

**File**: `backend/.env` (NEVER commit this file!)

```bash
# Database (REQUIRED)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=filaops
DB_USER=postgres
DB_PASSWORD=Admin

# Security (REQUIRED)
SECRET_KEY=<generate with: openssl rand -hex 32>

# Environment
ENVIRONMENT=development
DEBUG=false
LOG_LEVEL=INFO

# CORS (REQUIRED)
CORS_ORIGINS=["http://localhost:5173","http://localhost:5174"]
```

### Frontend Environment Variables

**File**: `frontend/.env.local` (Optional - for overrides)

```bash
VITE_API_URL=http://localhost:8000
```

**Default** (if no .env.local): Uses `http://localhost:8000` from `frontend/src/config/api.js`

---

## 📝 Git Workflow

### Commit Message Format
```
<type>: <short summary>

Longer description if needed.

🤖 Generated with AI assistance

Co-Authored-By: <AI Tool Name>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### Before Pushing
1. Run tests
2. Run linter  
3. Check for secrets in code
4. Reference issues: `Fixes #123`

---

## ❓ Common Questions

### Q: What database does this use?
**A**: PostgreSQL 17.7 with `psycopg` driver. NOT SQLite.

### Q: What port does the backend use?
**A**: Port 8000. ALWAYS. If you see 8001 or 8002, it's wrong.

### Q: Can I change the database schema?
**A**: Only via Alembic migrations. NEVER modify tables directly.

### Q: Where are the API endpoints?
**A**: `backend/app/api/v1/endpoints/` - organized by domain.

### Q: How do I add a new dependency?
**A**: Add to `backend/requirements.txt` or `frontend/package.json`, then run install commands.

---

## 🆘 When Things Break

### Backend Won't Start
```bash
# Check PostgreSQL is running
psql -U postgres -l

# Check migrations
cd backend
alembic current

# Check environment
cat backend/.env  # Verify DB credentials
```

### Frontend Won't Connect to Backend
```bash
# 1. Verify backend is on port 8000
# Visit http://localhost:8000/docs

# 2. Check frontend config
cat frontend/src/config/api.js
# Should show: http://localhost:8000

# 3. Check browser console
# Open DevTools → Network tab
# API calls should go to localhost:8000
```

### Database Connection Failed
```bash
# Test connection
psql -U postgres -d filaops -c "SELECT 1;"

# Check if database exists
psql -U postgres -l | grep filaops

# Verify password in .env matches PostgreSQL
```

---

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## ✅ Pre-Change Checklist for AI Assistants

**Before modifying ANY file, ask yourself:**

- [ ] Am I on the `feat/postgres-migration` branch?
- [ ] Have I READ the file I'm about to modify?
- [ ] Am I using the correct port (8000 for backend)?
- [ ] Am I using PostgreSQL, not SQLite?
- [ ] Have I checked for existing patterns in the codebase?
- [ ] Will this change break anything?
- [ ] Have I shown the user a diff first?

**If you answered NO to any question → STOP and ask the user first!**

---

*Last Updated: December 26, 2025*
*This is the authoritative source for ALL AI coding assistants working on FilaOps.*
