# FilaOps Troubleshooting Guide

Common issues and solutions for FilaOps development and deployment.

## Quick Reference

| Symptom | Likely Cause | Section |
|---------|--------------|---------|
| Backend won't start | Database connection | [Database Issues](#database-connection-issues) |
| CORS errors in browser | Origin not allowed | [CORS Errors](#cors-errors) |
| Frontend blank page | Missing dependencies | [Frontend Issues](#frontend-issues) |
| API returns 500 | Check backend logs | [Backend Errors](#backend-errors) |

---

## Database Connection Issues

### Symptom
- Backend fails to start
- Logs show "connection refused" or "could not connect to server"

### Diagnosis
```bash
# Check if PostgreSQL is running
# Linux/Mac:
systemctl status postgresql
# or
pg_isready

# Windows:
Get-Service postgresql*
```

### Common Fixes

**PostgreSQL not running:**
```bash
# Linux
sudo systemctl start postgresql

# Windows PowerShell
Start-Service postgresql-x64-17
```

**Wrong credentials in .env:**
```bash
# Check your .env file
DATABASE_URL=postgresql://user:password@localhost:5432/filaops

# Test connection
psql -h localhost -U filaops -d filaops
```

**Database doesn't exist:**
```bash
createdb filaops
# Then run migrations
alembic upgrade head
```

---

## CORS Errors

### Symptom
- Browser console shows "Access-Control-Allow-Origin" errors
- API calls fail from frontend but work in Postman/curl

### Diagnosis
Check browser Network tab - the preflight OPTIONS request is failing.

### Fix
Update `CORS_ORIGINS` in your `.env`:

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

For development, you can allow all origins (not recommended for production):
```env
CORS_ORIGINS=*
```

Restart the backend after changes.

---

## Frontend Issues

### Blank Page / Won't Load

**Check for missing dependencies:**
```bash
cd frontend
npm install
npm run dev
```

**Check browser console for errors** - often a missing import or syntax error.

**Vite not finding modules:**
```bash
# Clear cache and reinstall
rm -rf node_modules/.vite
npm install
npm run dev
```

### Vite Host Blocking

If accessing via hostname other than localhost:

**Symptom:**
```
Blocked request. This host ("your-hostname") is not allowed.
```

**Fix:** Add to `frontend/vite.config.js`:
```javascript
export default defineConfig({
  server: {
    host: true,
    allowedHosts: ['your-hostname', 'localhost'],
  },
  // ...
})
```

---

## Backend Errors

### 500 Internal Server Error

**Check the logs first:**
```bash
# If running directly
# Errors print to terminal

# Check for common issues:
# 1. Missing environment variables
# 2. Database migration needed
# 3. Import errors
```

**Run migrations:**
```bash
cd backend
alembic upgrade head
```

### Import Errors on Startup

Usually means a circular import or missing dependency:
```bash
cd backend
pip install -r requirements.txt
```

### Alembic Migration Failures

**"Target database is not up to date":**
```bash
alembic upgrade head  # Apply pending migrations
```

**Conflicting migrations (multiple heads):**
```bash
# Check migration history
alembic history

# If heads diverged, merge them
alembic merge heads -m "merge migrations"
alembic upgrade head
```

### Stamped Migrations Causing "Column Does Not Exist"

**Symptom:**
- Endpoints return 500 errors
- Logs show `column X does not exist` (e.g., `purchase_factor`, `total_cost`, `unit`)
- Recently ran `alembic stamp head`

**Cause:**
`alembic stamp head` marks migrations as "applied" WITHOUT running the actual SQL. Use this only when your schema already matches.

**Fix:**
Add missing columns manually:
```sql
-- Check what exists
\d your_table_name

-- Add missing columns (example from UOM migrations)
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_factor NUMERIC DEFAULT 1.0;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS total_cost NUMERIC;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'EA';
```

**Prevention:**
- Use `alembic upgrade head` (not `stamp`) to run migrations
- Only use `stamp` when synchronizing alembic state with an existing schema
- Test key endpoints after any migration changes

---

## Environment Setup Checklist

Before reporting an issue, verify:

- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 15+ running
- [ ] `.env` file exists in `backend/`
- [ ] Database created and migrations run
- [ ] Dependencies installed (`pip install -r requirements.txt`, `npm install`)

### Minimal .env for Development

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/filaops
SECRET_KEY=dev-secret-key-change-in-production
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
DEBUG=true
```

---

## Getting Help

1. **Search existing issues** on GitHub
2. **Check the logs** - most errors are clearly logged
3. **Include details** when opening an issue:
   - OS and version
   - Python/Node versions
   - Full error message and stack trace
   - Steps to reproduce

---

## Contributing Fixes

Found a solution to a common problem? 

1. Add it to this guide
2. Submit a PR
3. Help the community!
