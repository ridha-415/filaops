# FilaOps Installation Guide

Welcome! This guide will help you install FilaOps on your Windows computer. The whole process takes about 15-20 minutes.

---

## Before You Start

### What You'll Need

| Requirement | Details |
|-------------|---------|
| **Computer** | Windows 10 or 11 (64-bit) |
| **Memory** | 8 GB RAM minimum, 16 GB recommended |
| **Disk Space** | 10 GB free space |
| **Internet** | Required for initial setup |

### What Gets Installed

- **FilaOps** - The inventory management application
- **PostgreSQL** - Database (runs inside Docker, not installed separately)
- **Docker Desktop** - Required to run FilaOps (free)

All your data stays on YOUR computer. Nothing is sent to the cloud unless you explicitly set up integrations.

---

## Installation Steps

### Step 1: Install Docker Desktop (Required First)

Docker is the engine that runs FilaOps. If you already have Docker Desktop installed, skip to Step 2.

**[→ Follow the Docker Setup Guide](DOCKER_SETUP_GUIDE.md)**

This typically takes 5-10 minutes including download time.

---

### Step 2: Download FilaOps

1. Go to the **[FilaOps Releases Page](https://github.com/Blb3D/filaops/releases)**

2. Find the latest release (at the top)

3. Under "Assets", click **`FilaOpsSetup-x.x.x.exe`** to download

![Screenshot: GitHub releases download](screenshots/github-releases.png)
<!-- SCREENSHOT NEEDED: GitHub releases page with exe highlighted -->

---

### Step 3: Run the Installer

1. **Double-click** `FilaOpsSetup-x.x.x.exe`

2. If Windows SmartScreen appears, click **"More info"** then **"Run anyway"**
   - This happens because we're a small project without an expensive code signing certificate
   - The installer is safe - you can verify on our GitHub

![Screenshot: SmartScreen warning](screenshots/smartscreen.png)
<!-- SCREENSHOT NEEDED: Windows SmartScreen dialog -->

3. **Follow the installer prompts:**
   - Accept the license agreement
   - Choose installation folder (default is fine)
   - Choose Start Menu folder (default is fine)
   - Optional: Create desktop shortcut
   - Optional: Start FilaOps when Windows starts

4. **Click Install** and wait (1-2 minutes)

---

### Step 4: First Launch

After installation completes:

1. **Check "Launch FilaOps"** and click **Finish**

2. **Wait for FilaOps to start** (30-60 seconds first time)
   - Docker will download required images
   - The database will be created
   - A browser window will open automatically

3. **You'll see the setup screen:**

![Screenshot: FilaOps first run](screenshots/filaops-setup.png)
<!-- SCREENSHOT NEEDED: FilaOps setup/onboarding screen -->

---

### Step 5: Create Your Admin Account

1. **Enter your details:**
   - Email address (used for login)
   - Password (8+ characters recommended)
   - Company name

2. **Click "Create Account"**

3. **You're in!** FilaOps is ready to use.

---

## Using FilaOps Daily

### Starting FilaOps

**Option A: Desktop shortcut** (if you created one)
- Double-click the FilaOps icon

**Option B: Start Menu**
- Start → FilaOps → FilaOps (or "Start FilaOps")

**Option C: Already running?**
- Just open your browser to: **http://localhost:5173**

### Stopping FilaOps

When you're done for the day:
- Start Menu → FilaOps → **Stop FilaOps**

Or just leave it running - it uses minimal resources when idle.

### Checking if FilaOps is Running

Look for the Docker whale icon in your system tray. If it's there, Docker (and FilaOps) can run.

To check if FilaOps specifically is running:
1. Open Command Prompt
2. Type: `docker ps`
3. Look for `filaops-backend` and `filaops-frontend`

---

## Updating FilaOps

When a new version is available:

1. Start Menu → FilaOps → **Update FilaOps**

2. The updater will:
   - Show you current vs. new version
   - Back up your database automatically
   - Download and install the update
   - Restart FilaOps

Your data is always preserved during updates.

---

## Backing Up Your Data

### Automatic Backups

FilaOps creates automatic backups before every update. These are stored in:
```
C:\Program Files\FilaOps\backups\
```

### Manual Backup

To create a backup anytime:

1. Open Command Prompt
2. Run:
   ```
   docker exec filaops-db pg_dump -U postgres filaops > my_backup.sql
   ```
3. Save `my_backup.sql` somewhere safe

### Restoring from Backup

If you ever need to restore:
```
docker exec -i filaops-db psql -U postgres filaops < my_backup.sql
```

---

## Uninstalling FilaOps

If you need to remove FilaOps:

1. Start Menu → FilaOps → **Uninstall FilaOps**
   - Or: Settings → Apps → FilaOps → Uninstall

2. The uninstaller will:
   - Stop FilaOps containers
   - Remove program files
   - **Keep your database** (in Docker volumes)

### Complete Removal (including data)

To also remove your database and all data:
```
docker volume rm filaops_pgdata
```

⚠️ **Warning:** This permanently deletes all your FilaOps data!

---

## Troubleshooting

### FilaOps won't start

1. **Is Docker Desktop running?**
   - Look for the whale icon in system tray
   - If not, start Docker Desktop from Start menu
   - Wait 1-2 minutes for it to fully start

2. **Try restarting:**
   - Stop FilaOps (Start Menu → FilaOps → Stop FilaOps)
   - Start FilaOps again

3. **Check the logs:**
   ```
   docker logs filaops-backend
   ```

### "Cannot connect to API" in browser

1. **Backend might still be starting** - wait 30 seconds and refresh

2. **Check if backend is running:**
   ```
   docker ps
   ```
   Look for `filaops-backend`

3. **Check backend logs:**
   ```
   docker logs filaops-backend
   ```

### Browser shows blank page

1. **Clear browser cache:** Ctrl+Shift+Delete → Clear cached files
2. **Try a different browser**
3. **Try incognito/private mode**

### Everything was working, now it's not

1. **Did Windows update recently?** Sometimes updates break Docker.
   - Restart your computer
   - Start Docker Desktop
   - Start FilaOps

2. **Did Docker update?** Same solution - restart everything.

### Port 5173 or 8000 already in use

Another application is using the port FilaOps needs.

1. Find what's using it:
   ```
   netstat -ano | findstr :5173
   ```

2. Either close that application, or contact support to configure different ports.

---

## Getting Help

### Self-Help Resources

- **[GitHub Issues](https://github.com/Blb3D/filaops/issues)** - Search for your problem
- **[Discussions](https://github.com/Blb3D/filaops/discussions)** - Ask questions

### Reporting a Bug

When creating an issue, please include:

1. **Your FilaOps version** (shown in Settings)
2. **Your Windows version** (`winver` command)
3. **Docker Desktop version** (Docker Desktop → Settings → About)
4. **The exact error message** (screenshot helps!)
5. **Steps to reproduce** - what were you doing when it broke?

---

## Quick Reference Card

| Task | How |
|------|-----|
| Start FilaOps | Start Menu → FilaOps → Start FilaOps |
| Open FilaOps | Browser → http://localhost:5173 |
| Stop FilaOps | Start Menu → FilaOps → Stop FilaOps |
| Update FilaOps | Start Menu → FilaOps → Update FilaOps |
| View logs | `docker logs filaops-backend` |
| Restart everything | Stop FilaOps, restart Docker Desktop, Start FilaOps |

---

*Last updated: January 2026*
