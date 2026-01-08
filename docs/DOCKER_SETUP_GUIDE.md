# Docker Desktop Setup Guide for FilaOps

This guide will walk you through installing Docker Desktop on Windows. Don't worry if you've never used Docker before - just follow these steps exactly and you'll be up and running in about 10 minutes.

---

## What is Docker?

Docker is like a "container" that runs FilaOps and its database in an isolated environment on your computer. Think of it as a mini virtual computer inside your computer. This keeps FilaOps separate from your other programs and makes installation much simpler.

**You don't need to learn Docker** - FilaOps handles everything automatically. You just need to install it once.

---

## Step 1: Check Your System Requirements

Before installing, make sure your computer meets these requirements:

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Windows | Windows 10 (64-bit) version 1903+ | Windows 11 |
| RAM | 8 GB | 16 GB |
| Disk Space | 10 GB free | 20 GB free |
| CPU | 64-bit with virtualization | - |

### How to Check Your Windows Version

1. Press `Windows + R` on your keyboard
2. Type `winver` and press Enter
3. Look for "Version" - it should be 1903 or higher

![Screenshot: Windows version dialog](screenshots/winver.png)
<!-- SCREENSHOT NEEDED: Windows version dialog showing version number -->

---

## Step 2: Download Docker Desktop

1. Go to: **https://www.docker.com/products/docker-desktop/**

2. Click the **"Download for Windows"** button

![Screenshot: Docker download page](screenshots/docker-download.png)
<!-- SCREENSHOT NEEDED: Docker website with download button highlighted -->

3. Save the file (it's about 500 MB, so it may take a few minutes)

---

## Step 3: Install Docker Desktop

1. **Run the installer** - Double-click `Docker Desktop Installer.exe`

2. **Accept the configuration** - Keep the default options checked:
   - ✅ Use WSL 2 instead of Hyper-V (recommended)
   - ✅ Add shortcut to desktop

![Screenshot: Docker installer options](screenshots/docker-install-options.png)
<!-- SCREENSHOT NEEDED: Docker installer with checkboxes -->

3. **Click "Ok"** and wait for installation (2-5 minutes)

4. **Click "Close and restart"** when prompted

![Screenshot: Docker restart prompt](screenshots/docker-restart.png)
<!-- SCREENSHOT NEEDED: Installation complete dialog -->

---

## Step 4: First-Time Docker Setup

After your computer restarts:

1. **Docker Desktop should start automatically**
   - Look for the whale icon in your system tray (bottom-right corner)
   - If it didn't start, search for "Docker Desktop" in the Start menu

![Screenshot: Docker whale icon in system tray](screenshots/docker-tray.png)
<!-- SCREENSHOT NEEDED: System tray with Docker whale icon -->

2. **Accept the license agreement** when prompted

3. **Skip the sign-in** - You don't need a Docker account
   - Click "Continue without signing in" or "Skip"

![Screenshot: Docker sign-in skip](screenshots/docker-skip-signin.png)
<!-- SCREENSHOT NEEDED: Docker sign-in screen with skip option -->

4. **Skip the survey** - Click "Skip" if asked

5. **Wait for Docker to start** - This can take 1-2 minutes the first time
   - The whale icon will animate while starting
   - When ready, it will stop animating and show "Docker Desktop is running"

![Screenshot: Docker running status](screenshots/docker-running.png)
<!-- SCREENSHOT NEEDED: Docker Desktop showing "Running" status -->

---

## Step 5: Verify Docker is Working

Let's make sure everything is set up correctly:

1. **Open Command Prompt**
   - Press `Windows + R`
   - Type `cmd` and press Enter

2. **Type this command and press Enter:**
   ```
   docker --version
   ```

3. **You should see something like:**
   ```
   Docker version 24.0.6, build ed223bc
   ```

![Screenshot: Docker version in command prompt](screenshots/docker-version-cmd.png)
<!-- SCREENSHOT NEEDED: Command prompt showing docker version -->

If you see a version number, Docker is installed correctly! You can close the command prompt.

---

## Common Problems and Solutions

### Problem: "WSL 2 installation is incomplete"

![Screenshot: WSL 2 error](screenshots/wsl2-error.png)
<!-- SCREENSHOT NEEDED: WSL 2 error dialog -->

**Solution:**

1. Open this link: https://aka.ms/wsl2kernel
2. Download and run the "WSL2 Linux kernel update package"
3. Restart Docker Desktop

### Problem: "Hardware assisted virtualization and data execution protection must be enabled"

This means virtualization is turned off in your computer's BIOS.

**Solution:**

1. Restart your computer
2. Press the BIOS key during startup (usually `F2`, `F10`, `F12`, or `Delete` - it shows briefly on screen)
3. Find "Virtualization Technology" or "Intel VT-x" or "AMD-V"
4. Enable it
5. Save and exit BIOS

> **Note:** BIOS looks different on every computer. If you're unsure, search Google for "[your computer brand] enable virtualization" for specific instructions.

### Problem: "Docker Desktop stopped" or won't start

**Solution:**

1. Right-click the Docker whale icon in system tray
2. Click "Quit Docker Desktop"
3. Wait 10 seconds
4. Search for "Docker Desktop" in Start menu and open it
5. Wait 1-2 minutes for it to fully start

If it still won't start:
1. Restart your computer
2. Try opening Docker Desktop again

### Problem: "Cannot connect to the Docker daemon"

**Solution:**

Docker Desktop isn't running.

1. Search for "Docker Desktop" in the Start menu
2. Open it and wait for the whale icon to stop animating

---

## Settings Recommended for FilaOps

Once Docker is running, let's optimize the settings:

1. **Click the gear icon** (⚙️) in Docker Desktop

2. **Go to "Resources" → "Advanced"**

3. **Recommended settings:**
   - CPUs: At least 2 (4 if you have them)
   - Memory: At least 4 GB (8 GB if you have 16+ GB RAM)
   - Disk image size: 20 GB minimum

![Screenshot: Docker resource settings](screenshots/docker-resources.png)
<!-- SCREENSHOT NEEDED: Docker Desktop resource settings -->

4. **Click "Apply & Restart"**

---

## You're Ready to Install FilaOps!

Docker is now set up. You can:

1. **Run the FilaOps installer** - `FilaOpsSetup.exe`
2. The installer will detect Docker and set everything up automatically
3. FilaOps will open in your browser when ready

---

## Quick Reference: Docker Commands

You don't need these for normal use, but they're helpful for troubleshooting:

| What you want to do | Command |
|---------------------|---------|
| Check if Docker is running | `docker info` |
| See running containers | `docker ps` |
| See all containers | `docker ps -a` |
| View FilaOps logs | `docker logs filaops-backend` |

---

## Getting Help

If you're stuck:

1. **Check the FilaOps GitHub Issues:** https://github.com/Blb3D/filaops/issues
2. **Search for your error message** - someone may have solved it already
3. **Create a new issue** with:
   - Your Windows version
   - The exact error message
   - Screenshot if possible

---

## Keeping Docker Updated

Docker Desktop will notify you when updates are available. It's a good idea to keep it updated, but **don't update while FilaOps is running** - stop FilaOps first using the "Stop FilaOps" shortcut.

---

*Last updated: January 2026*
