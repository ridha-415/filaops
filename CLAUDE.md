# FilaOps - Claude Code Instructions

## Project Overview

FilaOps is an ERP system for 3D printing businesses built with:
- **Backend**: Python/FastAPI with SQLAlchemy and PostgreSQL
- **Frontend**: React with Vite, Tailwind CSS
- **Deployment**: Native installation (Python venv + systemd/PM2)

---

## Development Environment

### Services and Ports

| Service | Port | Access URL |
|---------|------|------------|
| Frontend (dev) | 5174 | http://localhost:5174 |
| Backend API | 8000 | http://localhost:8000 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis (if used) | 6379 | localhost:6379 |

### Starting Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # Mac/Linux
.\venv\Scripts\activate   # Windows
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## Development Workflow

### Before Pushing Code

**IMPORTANT: Always follow this checklist before `git push`:**

1. **Run backend tests**
   ```bash
   cd backend
   python -m pytest tests/ -v
   ```

2. **Run linting**
   ```bash
   cd backend
   ruff check .
   ```

3. **Run frontend tests** (if applicable)
   ```bash
   cd frontend
   npm test
   ```

4. **List files for CodeRabbit review**
   ```bash
   git diff --name-only HEAD~1  # or appropriate range
   ```

5. **Wait for CodeRabbit review** (if PR is open)
   - Address any CodeRabbit findings before merging
   - Common issues: Type hints, error handling, security

---

## Commit Message Format

```
<type>: <short summary>

Longer description if needed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

**Examples:**
- `feat: Add material spool tracking system`
- `fix: Resolve purchase order validation error`
- `refactor: Simplify UOM conversion logic`

---

## Issue Workflow

- Reference issues in commits: `Fixes #123` or `Relates to #123`
- Add comments to issues with implementation details
- Close issues only after testing confirms the fix
- Use labels to categorize issues (bug, enhancement, documentation, etc.)

---

## Code Style

### Backend (Python)

- Use type hints for function parameters and returns
- Use Pydantic models for request/response validation
- Follow existing patterns in `app/services/` for business logic
- Keep SQLAlchemy models in `app/models/`
- Database operations should use async patterns where applicable
- Error handling: Use custom exceptions from `app/core/exceptions.py`

**Example:**
```python
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.item import ItemCreate, ItemResponse

async def create_item(
    db: AsyncSession,
    item: ItemCreate
) -> ItemResponse:
    """Create a new item in the database."""
    # Implementation here
```

### Frontend (React)

- Use dark theme styling (bg-gray-900, text-white, border-gray-700)
- Use Tailwind CSS classes consistently
- Fetch from `${API_URL}/api/v1/...`
- Keep components in `src/components/`
- Use React hooks for state management
- Implement proper error boundaries

**Example:**
```jsx
const fetchOrders = async () => {
  try {
    const response = await fetch(`${API_URL}/api/v1/orders`);
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    setOrders(data.items);
  } catch (error) {
    console.error('Error:', error);
    // Handle error appropriately
  }
};
```

---

## Testing Checklist

### For New Features

1. **Unit tests** in `backend/tests/`
2. **Integration tests** for API endpoints
3. **E2E tests** using Playwright (if UI-related)
4. **Manual testing** via frontend
5. **Performance testing** if impacting database queries
6. **Documentation** - Update relevant docs

### For Bug Fixes

1. Verify the issue is reproducible
2. Write a test that fails (demonstrates the bug)
3. Implement fix
4. Test passes
5. Check for regressions
6. Update issue with resolution details

---

## Database Migrations

### Creating a New Migration

```bash
cd backend
source venv/bin/activate

# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description of changes"

# Review the generated migration in backend/migrations/versions/
# Edit if necessary (autogenerate isn't perfect)

# Apply migration
alembic upgrade head
```

### Migration Best Practices

- Always review auto-generated migrations
- Test migrations on development data first
- Include both upgrade and downgrade paths
- Add indexes for foreign keys and frequently queried fields
- Use batch operations for large data migrations

---

## Common Development Tasks

### Add a New Model

1. Create model in `backend/app/models/`
2. Create Pydantic schemas in `backend/app/schemas/`
3. Generate migration: `alembic revision --autogenerate -m "Add <model> table"`
4. Review and apply migration: `alembic upgrade head`
5. Create service functions in `backend/app/services/`
6. Create API endpoints in `backend/app/api/v1/endpoints/`
7. Write tests in `backend/tests/`

### Add a New API Endpoint

1. Define route in `backend/app/api/v1/endpoints/<module>.py`
2. Create/update Pydantic schemas for request/response
3. Implement business logic in `backend/app/services/`
4. Add tests in `backend/tests/`
5. Update frontend to consume the endpoint
6. Document in API docs (automatic via FastAPI)

### Add a New Frontend Component

1. Create component in `frontend/src/components/`
2. Follow existing styling patterns (dark theme)
3. Implement proper error handling
4. Add loading states for async operations
5. Test component manually
6. Write Playwright test if critical user flow

---

## Environment Variables

### Backend (.env file location: `backend/.env`)

Required variables:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/filaops
SECRET_KEY=<generate with: openssl rand -hex 32>
CORS_ORIGINS=["http://localhost:5173","http://localhost:5174"]
```

Optional variables:
```bash
REDIS_URL=redis://localhost:6379/0
ENVIRONMENT=development
LOG_LEVEL=INFO
```

### Frontend (.env.local file location: `frontend/.env.local`)

```bash
VITE_API_URL=http://localhost:8000
```

---

## Troubleshooting

### Backend won't start

- Check PostgreSQL is running: `psql -U postgres -l`
- Verify DATABASE_URL in `backend/.env`
- Check migrations are current: `alembic current`
- Look for errors in terminal output

### Frontend won't start

- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for port conflicts (5174)
- Clear Vite cache: `rm -rf .vite`

### Database issues

- Reset database: See INSTALL.md "Reset Database" section
- Check connection: `psql -U filaops_user -d filaops`
- View logs: Check backend terminal output

### Tests failing

- Ensure test database is set up
- Check for missing dependencies: `pip install -r requirements.txt`
- Run single test for debugging: `pytest tests/test_specific.py -v -s`

---

## Performance Best Practices

### Backend

- Use eager loading for relationships: `.options(joinedload(...))`
- Implement pagination for list endpoints
- Add database indexes for frequently queried fields
- Use async database operations
- Cache expensive operations (Redis)
- Monitor query performance with middleware

### Frontend

- Implement lazy loading for routes
- Use React.memo for expensive components
- Debounce search inputs
- Implement virtual scrolling for large lists
- Optimize images and assets
- Use production builds for testing performance

---

## Security Guidelines

- Never commit `.env` files
- Use environment variables for sensitive data
- Implement proper authentication/authorization
- Validate all user inputs (backend AND frontend)
- Use parameterized queries (SQLAlchemy handles this)
- Keep dependencies updated
- Review security advisories regularly

---

## Useful Commands Reference

### Backend

```bash
# Activate virtual environment
source venv/bin/activate  # Mac/Linux
.\venv\Scripts\activate   # Windows

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest tests/ -v

# Run specific test
pytest tests/test_orders.py::test_create_order -v -s

# Lint code
ruff check .

# Format code
ruff format .

# Database migrations
alembic upgrade head              # Apply all migrations
alembic downgrade -1              # Rollback one migration
alembic current                   # Show current revision
alembic history                   # Show migration history
```

### Frontend

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode (see browser)
npm run test:headed
```

---

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Playwright Documentation](https://playwright.dev/)

---

## Getting Help

- [GitHub Issues](https://github.com/blb3dprinting/filaops/issues) - Bug reports and feature requests
- [GitHub Discussions](https://github.com/blb3dprinting/filaops/discussions) - Questions and community support
- [Contributing Guide](CONTRIBUTING.md) - How to contribute to the project

---

*FilaOps - ERP for 3D Print Farms*
