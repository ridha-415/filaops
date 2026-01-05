# FilaOps — Zero-to-Running (Windows)

This guide gets a brand-new Windows machine from **nothing** to a **working FilaOps UI + API**.

**You'll know you're done when:**
- Backend health check returns: `{"status":"healthy"}`
- Frontend opens in your browser at http://localhost:5173
- Setup Wizard appears to create your admin account

---

## Quick Start (copy/paste)

```powershell
# Clone the repo
cd C:\repos
git clone https://github.com/Blb3D/filaops.git
cd filaops

# Create environment file
cp .env.example .env
# Edit .env with your database password and a secure SECRET_KEY

# Allow scripts to run
Set-ExecutionPolicy -Scope Process Bypass -Force

# Start everything (two windows will open)
.\start-all.ps1
```

- Backend: http://localhost:8000/health
- API docs: http://localhost:8000/docs  
- Frontend: http://localhost:5173

---

## 1) Prerequisites (install once)

Install these system-wide **one time**:

| Software | Download | Notes |
|----------|----------|-------|
| **Git** | https://git-scm.com/download/win | Defaults are fine |
| **Python 3.11+** | https://www.python.org/downloads/ | ✅ Check "Add Python to PATH" |
| **PostgreSQL 16+** | https://www.postgresql.org/download/windows/ | Note your password! |
| **Node.js 18+** | https://nodejs.org/en/download | Or: `winget install OpenJS.NodeJS.LTS` |

**Verify installation** (open new PowerShell after installing):
```powershell
python --version   # Python 3.11.x or higher
node --version     # v18.x.x or higher
git --version      # git version 2.x.x
```

---

## 2) Clone the Repository

```powershell
cd C:\repos
git clone https://github.com/Blb3D/filaops.git
cd filaops
```

Already cloned? Update it:
```powershell
git pull
```

---

## 3) Configure Environment

Copy the example and edit it:

```powershell
cp .env.example .env
notepad .env
```

**Required changes in `.env`:**

```bash
# Set your PostgreSQL password (the one you chose during install)
DB_PASSWORD=YourPostgresPassword

# Generate a secure secret key (REQUIRED for security)
# Run this in PowerShell to generate one:
#   python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=paste-your-generated-key-here
```

**Generate SECRET_KEY:**
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the output and paste it as your `SECRET_KEY` value.

---

## 4) Create the Database

Open PowerShell and run:

```powershell
# Set your postgres password for this session
$env:PGPASSWORD = "YourPostgresPassword"

# Create the database (safe to run multiple times)
psql -h localhost -U postgres -c "CREATE DATABASE filaops"
```

If `psql` isn't found, add PostgreSQL to your PATH or use pgAdmin to create the database.

---

## 5) Start FilaOps

From the repo root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\start-all.ps1
```

This opens two PowerShell windows:
- **Backend** - Creates venv, installs dependencies, runs migrations, starts API
- **Frontend** - Installs npm packages, starts Vite dev server

**First run takes 2-3 minutes** while dependencies install.

Watch for these success indicators:
```
[backend] Starting server at: http://localhost:8000
[frontend] Local: http://localhost:5173/
```

---

## 6) Verify Installation

**Test backend health:**
```powershell
curl http://localhost:8000/health
# Expected: {"status":"healthy"}
```

**Access the application:**
Open http://localhost:5173 in your browser. The **Setup Wizard** will guide you through creating your admin account.

**API documentation:**
Open http://localhost:8000/docs for the interactive Swagger UI.

---

## Everyday Usage

| Task | Command |
|------|---------|
| Start everything | `.\start-all.ps1` |
| Start backend only | `.\start-backend.ps1` |
| Start frontend only | `.\start-frontend.ps1` |
| Stop | Press `Ctrl+C` in each window |

---

## Troubleshooting

### PowerShell blocks scripts

Run this once per terminal:
```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
```

---

### "python is not recognized"

Python isn't in PATH. Either:
1. Reinstall Python and check "Add Python to PATH"
2. Or use the full path: `C:\Users\YourName\AppData\Local\Programs\Python\Python311\python.exe`

---

### Database connection errors

**Check Postgres is running:**
- Open Services (`services.msc`)
- Find "postgresql-x64-16" (or similar)
- Ensure it's "Running"

**Wrong password:**
- Edit `.env` and verify `DB_PASSWORD` matches your PostgreSQL password

**Database doesn't exist:**
```powershell
$env:PGPASSWORD = "YourPassword"
psql -h localhost -U postgres -c "CREATE DATABASE filaops"
```

---

### Port 8000 already in use

Something else is using port 8000. Find and stop it:
```powershell
netstat -ano | findstr :8000
# Note the PID (last column)
taskkill /PID <pid> /F
```

---

### Frontend shows "Failed to fetch" or network errors

1. **Check backend is running:** http://localhost:8000/health
2. **Check backend logs** in the backend PowerShell window for errors
3. **CORS issue:** Ensure backend is running on port 8000 (frontend expects this)

---

### Node not found

1. Install Node.js 18+ from https://nodejs.org/
2. **Open a new PowerShell window** (PATH refresh required)
3. Verify: `node --version`

---

### Migrations fail with "relation already exists"

Database has old schema. Reset it:
```powershell
$env:PGPASSWORD = "YourPassword"
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS filaops"
psql -h localhost -U postgres -c "CREATE DATABASE filaops"
# Then restart backend - it will run migrations automatically
```

---

## What's Installed Where

| Component | Location |
|-----------|----------|
| Backend venv | `backend\venv\` |
| Backend code | `backend\app\` |
| Database migrations | `backend\migrations\` |
| Frontend code | `frontend\` |
| Frontend deps | `frontend\node_modules\` |
| Environment config | `.env` (repo root) |

---

## Next Steps

1. **Create your admin account** via the Setup Wizard
2. **Explore the API docs** at http://localhost:8000/docs
3. **Import products** from CSV (Products → Import)
4. **Set up inventory** locations and materials

**Need help?**
- [Troubleshooting Guide](../troubleshooting.md)
- [FAQ](../faq.md)
- [Discord Community](https://discord.gg/FAhxySnRwa)
