# Getting Started with FilaOps

This guide provides an overview of getting started with FilaOps. For detailed, platform-specific installation instructions, see the complete setup guides below.

**Time needed:** 30-45 minutes (depending on your system)

---

## 🚀 Quick Start

Choose your platform for complete step-by-step installation instructions:

- **[Windows Setup Guide](setup/windows.md)** - Complete Windows installation with PostgreSQL
- **[macOS/Linux Setup Guide](setup/linux-macos.md)** - Complete macOS, Linux, and SSH setup with PostgreSQL
- **[Docker Setup Guide](setup/docker.md)** - Quick start with Docker (no Python/Node install needed)

**Prerequisites (for native install):**
- Python 3.11+
- PostgreSQL 16+
- Node.js 18+

After setup, open **http://localhost:5173** — the **Setup Wizard** will guide you through creating your admin account.

---

## What's New?

### Recent Improvements

**PostgreSQL-Only Architecture**
- Simplified setup (no Docker required for native install)
- Faster performance with native database drivers
- Easier debugging and customization

**Enhanced Production Scheduling**
- New Gantt chart interface
- Drag & drop scheduling
- Visual timeline for production orders
- Resource management improvements

**Frontend Enhancements**
- Better error handling and user feedback
- Centralized API client with automatic retry
- Improved scheduling, scrap, and update modals
- Instant hot reload during development

See **[archive/ANNOUNCEMENT_POSTGRES_MIGRATION.md](archive/ANNOUNCEMENT_POSTGRES_MIGRATION.md)** for complete details.

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

1. **Complete onboarding** - Import your products, customers, and materials via CSV
2. **Add a filament** - Go to Products → Add Product (if not imported)
3. **Create a BOM** - Link your finished good to the filament it uses
4. **Create a test order** - See how the workflow works

For a detailed explanation of how everything connects, see **[how-it-works.md](how-it-works.md)**.

---

## Troubleshooting

### "Port 5173 already in use"
Another application is using that port. Either:
- Stop the other application, or
- Change the port in your frontend dev server configuration

### "Database connection failed"
- Verify PostgreSQL is running
- Check your `.env` file has correct database credentials
- Ensure the database exists: `psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='filaops';"`
- Check PostgreSQL logs for connection errors

### "Backend won't start"
- Make sure you're in the `backend` directory
- Verify your virtual environment is activated
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Review backend logs for specific error messages

### "Frontend can't connect to backend"
- Verify backend is running on http://localhost:8000
- Check CORS settings in backend configuration
- Ensure frontend `.env` or configuration points to correct API URL

### Still stuck?
- **[troubleshooting.md](troubleshooting.md)** - Detailed troubleshooting guide
- **[faq.md](faq.md)** - Common questions and answers
- **[setup/windows.md](setup/windows.md)** - Complete Windows setup guide
- **[setup/linux-macos.md](setup/linux-macos.md)** - Complete macOS/Linux setup guide
- [GitHub Issues](https://github.com/Blb3D/filaops/issues) - Report bugs
- [GitHub Discussions](https://github.com/Blb3D/filaops/discussions) - Ask questions

---

## 📖 Need More Details?

- **[setup/windows.md](setup/windows.md)** - Complete Windows installation guide
- **[setup/linux-macos.md](setup/linux-macos.md)** - Complete macOS/Linux/SSH installation guide
- **[setup/docker.md](setup/docker.md)** - Docker installation guide
- **[how-it-works.md](how-it-works.md)** - System overview and workflows
- **[troubleshooting.md](troubleshooting.md)** - Detailed troubleshooting for common issues
- **[faq.md](faq.md)** - Frequently asked questions

---

*FilaOps - ERP for 3D Print Farms*
