# Getting Started with FilaOps

This guide will walk you through setting up FilaOps step by step. No coding experience required.

**Time needed:** About 30 minutes for first-time setup.

---

## What You'll Need

Before starting, you need to install these programs. Click each link to download.

### 1. Python (the programming language)

**Download:** https://www.python.org/downloads/

When installing:
- **Check the box** that says "Add Python to PATH"
- Click "Install Now"

**To verify it worked:** Open Command Prompt and type:
```
python --version
```
You should see something like `Python 3.11.x` or `Python 3.12.x`

### 2. Node.js (for the web interface)

**Download:** https://nodejs.org/ (choose the LTS version)

Just run the installer with default settings.

**To verify it worked:** Open Command Prompt and type:
```
node --version
```
You should see something like `v18.x.x` or `v20.x.x`

### 3. SQL Server Express (the database)

**Download:** https://www.microsoft.com/en-us/sql-server/sql-server-downloads

Scroll down to "Express" and click "Download now"

When installing:
- Choose "Basic" installation
- Accept the defaults
- **Write down the server name** shown at the end (usually `localhost\SQLEXPRESS`)

### 4. ODBC Driver (connects Python to SQL Server)

**Download:** https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server

Choose "ODBC Driver 17 for SQL Server" for Windows.

---

## Step 1: Download FilaOps

Open Command Prompt and run these commands one at a time:

```
cd %USERPROFILE%\Documents
git clone https://github.com/Blb3D/filaops.git
cd filaops
```

**Don't have git?** Download it from https://git-scm.com/download/win

**Alternative:** Go to https://github.com/Blb3D/filaops, click the green "Code" button, then "Download ZIP". Extract to your Documents folder.

---

## Step 2: Install Python Packages

Still in Command Prompt, run:

```
cd backend
pip install -r requirements.txt
```

This will take a few minutes. You'll see lots of text scrolling. **Wait until it finishes** and you see your command prompt again.

**If you see errors about "pip not found":** Python wasn't added to PATH. Reinstall Python and make sure to check "Add Python to PATH".

---

## Step 3: Create the Database

Run this command:

```
python ../scripts/fresh_database_setup.py --database FilaOps
```

**What you should see:**

```
============================================================
FILAOPS FRESH DATABASE SETUP
============================================================

  Host: localhost\SQLEXPRESS
  Database: FilaOps
Created database 'FilaOps'

Creating tables...
All tables created successfully!

Seeding default data...
Default data seeded successfully!

  Default admin login:
    Email: admin@localhost
    Password: admin123
```

**If you see "Login failed" or connection errors:**
1. Make sure SQL Server is running (search "Services" in Windows, look for "SQL Server (SQLEXPRESS)")
2. Try: `python ../scripts/fresh_database_setup.py --database FilaOps --host localhost\SQLEXPRESS`

---

## Step 4: Configure FilaOps

Create a configuration file. Run:

```
copy .env.example .env
```

Now open the `.env` file in Notepad:

```
notepad .env
```

Find these lines and make sure they look like this:

```
DB_HOST=localhost\SQLEXPRESS
DB_NAME=FilaOps
DB_TRUSTED_CONNECTION=true
SECRET_KEY=change-this-to-any-random-text-you-want
```

Save and close Notepad.

---

## Step 5: Start the Backend Server

Run:

```
python -m uvicorn app.main:app --reload --port 8000
```

**What you should see:**

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Started reloader process
```

**Leave this window open!** The server needs to keep running.

**To verify:** Open your web browser and go to http://localhost:8000/docs

You should see "FilaOps API" with a list of endpoints.

---

## Step 6: Start the Web Interface

**Open a NEW Command Prompt window** (don't close the first one!)

```
cd %USERPROFILE%\Documents\filaops\frontend
npm install
npm run dev
```

The first command (`npm install`) will take a few minutes.

**What you should see:**

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

## Step 7: Log In

Open your web browser and go to: **http://localhost:5173**

You should see a login page.

**Login with:**
- **Email:** `admin@localhost`
- **Password:** `admin123`

**You're in!** You should see the FilaOps dashboard.

---

## What's Next?

### Quick Tour of FilaOps

| Menu Item | What It Does |
|-----------|--------------|
| **Dashboard** | Overview of your operation |
| **Products** | Your catalog (filaments, finished goods, supplies) |
| **BOMs** | Bills of Materials - what goes into each product |
| **Orders** | Customer orders |
| **Production** | Manufacturing queue |
| **Inventory** | Stock levels |
| **Manufacturing** | Printers, work stations, routings |
| **Purchasing** | Vendor management, purchase orders |

### Recommended First Steps

1. **Add a filament** - Go to Products → Add Product
2. **Add a finished good** - Another product that you sell
3. **Create a BOM** - Link your finished good to the filament it uses
4. **Create a test order** - See how the workflow works

For a detailed explanation of how everything connects, see **[HOW_IT_WORKS.md](HOW_IT_WORKS.md)**.

---

## Troubleshooting

### "python is not recognized"

Python wasn't added to your PATH during installation.
1. Uninstall Python
2. Download and reinstall from python.org
3. **Check the box** "Add Python to PATH" during installation

### "npm is not recognized"

Node.js wasn't installed correctly.
1. Download from https://nodejs.org/
2. Run the installer again

### Backend won't start / "Address already in use"

Something else is using port 8000.
1. Close any other programs that might be using it
2. Or use a different port: `python -m uvicorn app.main:app --reload --port 8001`

### Can't connect to database

1. Open Windows Services (search "Services" in Start menu)
2. Find "SQL Server (SQLEXPRESS)"
3. Make sure it's "Running"
4. If not, right-click → Start

### Login doesn't work

The admin user might not have been created correctly.

1. Open SQL Server Management Studio
2. Connect to `localhost\SQLEXPRESS`
3. Open the file `scripts/create_admin.sql`
4. Change `USE FilaOps;` to your database name if different
5. Click Execute

### Still stuck?

- **GitHub Issues:** https://github.com/Blb3D/filaops/issues
- **GitHub Discussions:** https://github.com/Blb3D/filaops/discussions

---

## Starting FilaOps (After First Setup)

Once everything is set up, here's how to start FilaOps each time:

**Window 1 - Backend:**
```
cd %USERPROFILE%\Documents\filaops\backend
python -m uvicorn app.main:app --reload --port 8000
```

**Window 2 - Frontend:**
```
cd %USERPROFILE%\Documents\filaops\frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

---

## Stopping FilaOps

In each Command Prompt window, press `Ctrl+C` to stop the server.
