# FilaOps Upgrade Guide

**Simple step-by-step instructions to upgrade your FilaOps installation.**

> **📝 Note for Maintainers:** When creating a new release, update version placeholders (`vX.X.X`) in this file with the actual version number. Users will see the latest version in Settings → Version & Updates.

---

## 📌 Finding the Latest Version

**Before upgrading, find the latest version:**

1. **In the app:** Go to Settings → Version & Updates (shows latest available)
2. **On GitHub:** Visit https://github.com/Blb3D/filaops/releases
3. **Via command:** `git fetch --tags && git tag --sort=-v:refname | head -1`

**Replace `vX.X.X` in the commands below with the actual latest version!**

---

## ⚠️ Before You Start

1. **Backup your database** (recommended for production)
   - Using SQL Server Management Studio: Right-click your database → Tasks → Backup
   - Or use: `docker-compose exec db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourPassword" -Q "BACKUP DATABASE FilaOps TO DISK='/var/opt/mssql/backup/FilaOps.bak'"`

2. **Note your current version**
   - Check in Settings → Version & Updates, or run: `git describe --tags`

3. **Find the latest version** (see above)

4. **Allow 5-10 minutes** for the upgrade process

---

## Quick Upgrade (Docker - Most Users)

### Step 1: Open Terminal/Command Prompt

**Windows:**
- Press `Win + X` → Select "Terminal" or "PowerShell"
- Or search for "PowerShell" in Start Menu

**Mac/Linux:**
- Press `Cmd + Space` (Mac) or `Ctrl + Alt + T` (Linux)
- Type "Terminal" and press Enter

### Step 2: Navigate to Your FilaOps Folder

```bash
# Replace with YOUR actual FilaOps folder location
cd C:\FilaOps
# OR
cd ~/filaops
# OR wherever you installed FilaOps
```

**💡 Tip:** If you're not sure where FilaOps is installed, look for a folder containing `docker-compose.yml`

### Step 3: Stop FilaOps

```bash
docker-compose down
```

**Wait for:** All containers to stop (you'll see "Removed" messages)

**❌ If you get an error:**
- Make sure Docker Desktop is running (Windows/Mac)
- Try: `docker ps` to see if containers are running

### Step 4: Get the Latest Code

```bash
# Get all available versions
git fetch --tags

# Find the latest version
git tag --sort=-v:refname | head -1

# Checkout the latest version (replace vX.X.X with the version from above)
git checkout vX.X.X
```

**💡 Tip:** The latest version is usually the highest number. For example: v1.6.0 is newer than v1.5.0

**❌ If you get "git is not recognized":**
- Install Git: https://git-scm.com/downloads
- Or download the latest release ZIP from GitHub and extract it

**❌ If you get "not a git repository":**
- You installed from ZIP, not git
- Download the latest release ZIP from: https://github.com/Blb3D/filaops/releases
- Extract it to your FilaOps folder (replace old files)

### Step 5: Rebuild Containers

```bash
docker-compose build --no-cache
```

**⏱️ This takes 5-10 minutes** - be patient! You'll see lots of text scrolling.

**❌ If build fails:**
- Make sure Docker Desktop has enough resources (Settings → Resources)
- Try: `docker system prune -a` to free up space
- Check error messages - they usually tell you what's wrong

### Step 6: Start FilaOps

```bash
docker-compose up -d
```

**Wait 30 seconds** for services to start.

**Check status:**
```bash
docker-compose ps
```

**✅ All services should show "Up" or "healthy"**

**❌ If services won't start:**
- Check logs: `docker-compose logs backend`
- Common issue: Port already in use - see Troubleshooting below

### Step 7: Run Database Updates

```bash
docker-compose exec backend alembic upgrade head
```

**✅ You should see:** "INFO [alembic.runtime.migration] Running upgrade..."

**❌ If migration fails:**
- Check database connection: `docker-compose logs db`
- Make sure database container is running: `docker-compose ps`

### Step 8: Clear Browser Cache

**This is IMPORTANT!** Old JavaScript files can cause errors.

**Chrome/Edge:**
- Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or: Settings → Privacy → Clear browsing data → Cached images

**Firefox:**
- Press `Ctrl + Shift + Delete` → Check "Cache" → Clear Now

**Safari:**
- Press `Cmd + Option + E` to clear cache

**Or:** Use Incognito/Private browsing mode to test

### Step 9: Verify It Works

1. **Open FilaOps** in your browser (usually http://localhost:5173)
2. **Log in** with your admin account
3. **Check Settings → Version & Updates** - should show new version
4. **Try creating a test order** or viewing the dashboard

**✅ Everything working?** You're done! 🎉

**❌ Something broken?** See Troubleshooting section below

---

## Production Deployment (C:\BLB3D_Production)

**⚠️ IMPORTANT:** Test upgrades in development first!

### Production Upgrade Steps

```bash
# 1. Navigate to PRODUCTION folder
cd C:\BLB3D_Production

# 2. Stop services
docker-compose down

# 3. Get latest code
git fetch --tags

# 4. Find latest version
git tag --sort=-v:refname | head -1

# 5. Checkout latest version (replace vX.X.X with version from step 4)
git checkout vX.X.X

# 4. Rebuild
docker-compose build --no-cache

# 5. Start services
docker-compose up -d

# 6. Run migrations
docker-compose exec backend alembic upgrade head

# 7. Verify
docker-compose ps
docker-compose logs backend
```

**Production URLs:**
- Frontend: http://localhost:7000
- Backend: http://localhost:10000

---

## Troubleshooting

### "Port already in use"

**Problem:** Another program is using port 5173 or 8000

**Solution:**
```bash
# Windows - Find what's using the port
netstat -ano | findstr :5173

# Kill the process (replace PID with number from above)
taskkill /PID <PID> /F

# Or change FilaOps port in docker-compose.yml
# Change "5173:80" to "8080:80" (or any free port)
```

### "Cannot connect to Docker daemon"

**Problem:** Docker Desktop isn't running

**Solution:**
- **Windows/Mac:** Open Docker Desktop and wait for it to start (whale icon in system tray)
- **Linux:** `sudo systemctl start docker`

### "Database connection failed"

**Problem:** Database container isn't ready

**Solution:**
```bash
# Wait 30 seconds, then check database logs
docker-compose logs db

# Look for: "SQL Server is now ready for client connections"
# If you see errors, restart database:
docker-compose restart db
```

### "ModuleNotFoundError" or "Cannot find module"

**Problem:** Old JavaScript files cached in browser

**Solution:**
- **Hard refresh:** `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- **Or clear browser cache completely**
- **Or use incognito/private mode**

### "Migration failed" or "Alembic error"

**Problem:** Database migration conflict

**Solution:**
```bash
# Check current migration status
docker-compose exec backend alembic current

# View migration history
docker-compose exec backend alembic history

# If stuck, check database logs
docker-compose logs db
```

### "Container keeps restarting"

**Problem:** Container crashes on startup

**Solution:**
```bash
# Check what's wrong
docker-compose logs backend
docker-compose logs frontend

# Common causes:
# - Database not ready (wait 30 seconds)
# - Missing .env file
# - Port conflict
```

### "git: command not found"

**Problem:** Git isn't installed

**Solution:**
- **Windows/Mac:** Download from https://git-scm.com/downloads
- **Or:** Download release ZIP from GitHub instead of using git

### "Permission denied" (Linux/Mac)

**Problem:** Need sudo permissions

**Solution:**
```bash
# Add your user to docker group (Linux)
sudo usermod -aG docker $USER
# Log out and back in

# Or use sudo (not recommended for production)
sudo docker-compose up -d
```

---

## Manual Installation (Without Docker)

If you're running backend and frontend separately:

### Backend Update

```bash
cd backend

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Update dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Restart backend
# (Stop current process, then restart)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend Update

```bash
cd frontend

# Update dependencies
npm install

# Rebuild
npm run build

# Restart frontend server
# (Stop current process, then restart)
npm run dev  # For development
# OR serve the dist/ folder with nginx/apache for production
```

---

## Rollback (Go Back to Previous Version)

If something goes wrong, you can rollback:

```bash
# 1. Stop services
docker-compose down

# 2. Find your previous version
git tag --sort=-v:refname  # Lists all versions, newest first

# 3. Go back to previous version (replace vX.X.X with your previous version)
git checkout vX.X.X

# 3. Rollback database migrations (if needed)
docker-compose exec backend alembic downgrade -1
# Repeat for each migration you want to undo

# 4. Rebuild and restart
docker-compose build
docker-compose up -d
```

**⚠️ Warning:** Rollback may cause data loss if new features were used. Always backup first!

---

## What Changed in This Version?

**Always check the release notes for your specific version!**

1. Go to: https://github.com/Blb3D/filaops/releases
2. Find the version you're upgrading to
3. Read the release notes for:
   - New features
   - Bug fixes
   - Database migrations required
   - Breaking changes
   - Upgrade notes

**Common changes:**
- New features and improvements
- Bug fixes
- Database schema updates (migrations)
- Security updates

---

## Getting Help

**Still stuck?** We're here to help!

1. **Check the logs:**
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```

2. **Search existing issues:**
   - GitHub Issues: https://github.com/Blb3D/filaops/issues
   - GitHub Discussions: https://github.com/Blb3D/filaops/discussions

3. **Ask for help:**
   - Create a new GitHub issue (include error messages and logs)
   - Post in GitHub Discussions
   - Join Discord: https://discord.gg/FAhxySnRwa

**When asking for help, include:**
- Your current version: `git describe --tags`
- Operating system (Windows/Mac/Linux)
- Docker version: `docker --version`
- Error messages from logs
- What step you're stuck on

---

## Quick Reference

**Essential Commands:**

```bash
# Check what's running
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs frontend

# Restart a service
docker-compose restart backend

# Stop everything
docker-compose down

# Start everything
docker-compose up -d

# Check version
git describe --tags
```

**Common Ports:**

| Service | Default Port |
|---------|-------------|
| Frontend | 5173 |
| Backend | 8000 |
| Database | 1433 |
| Redis | 6379 |

---

**That's it!** If you followed all steps and everything works, you're successfully upgraded! 🎉
