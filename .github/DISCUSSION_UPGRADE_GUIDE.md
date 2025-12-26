# How to Upgrade to the Latest FilaOps Release 🚀

> ⚠️ **HISTORICAL**: This document describes Docker-based upgrades. For current native upgrade process, see [UPGRADE.md](../UPGRADE.md).

Hey everyone! Got a question about upgrading to v1.5.0? Here's a quick guide to help you out.

## TL;DR - Quick Upgrade

```bash
# 1. Get the latest code
cd filaops
git fetch --tags
git checkout v1.5.0

# 2. Rebuild containers
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d

# 3. Run database migrations (IMPORTANT!)
docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head

# 4. Clear browser cache (Ctrl+Shift+R)
```

That's it! 🎉

---

## What's New in v1.5.0?

This release has some great improvements:

### New Features ✨
- **Activity Timeline** - Track order events with a visual timeline on order detail pages
- **Work Centers & Machines** - Manage your production resources (3D printers, assembly stations, etc.)
- **Better Testing** - Comprehensive E2E test suite to catch bugs before they hit you

### Bug Fixes 🐛
- Fixed the purchasing page crash (low-stock calculation error)
- Fixed payment date validation (no more 6-digit years!)
- Better error messages throughout

### Under the Hood 🔧
- SQL Server compatibility improvements (66 files updated)
- Better security (no more JWT tokens in git)
- Cleaner database migrations
- Type safety improvements

Full details: [Release Notes](https://github.com/Blb3D/filaops/blob/main/docs/releases/RELEASE_NOTES_v1.5.0.md)

---

## Important: Database Migrations

v1.5.0 adds 3 new database migrations for work centers, machines, and fulfillment tracking. **Don't skip this step**:

```bash
docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head
```

These migrations are **additive only** - your existing data is safe.

---

## Common Issues & Solutions

### "Cannot access before initialization" errors

This happens when your browser cached old JavaScript files.

**Fix**: Hard refresh your browser
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`
- Or just use incognito mode

### Containers won't start

Usually a port conflict. Check what's using port 5174:

```bash
# Windows
netstat -ano | findstr :5174

# Linux/Mac
lsof -i :5174
```

Or try removing volumes and starting fresh:
```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Migration fails

Check your migration status:
```bash
docker-compose -f docker-compose.dev.yml exec backend alembic current
```

If something's wrong, feel free to ask here!

---

## Upgrading Production Deployments

If you're running in production (e.g., `C:\BLB3D_Production`):

```bash
cd C:\BLB3D_Production
git fetch --tags
git checkout v1.5.0

# Use regular docker-compose (not .dev.yml)
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head
```

**Pro tip**: Test the upgrade in a dev environment first!

---

## Need to Rollback?

If something goes wrong, you can rollback:

```bash
# Stop everything
docker-compose -f docker-compose.dev.yml down

# Go back to previous version
git checkout v1.4.0

# Rollback migrations (run 3 times for v1.5.0)
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml exec backend alembic downgrade -1

# Rebuild
docker-compose -f docker-compose.dev.yml build
docker-compose -f docker-compose.dev.yml up -d
```

---

## Questions?

Drop your questions below! Whether it's about upgrading, migrations, or anything else - we're here to help.

Common questions:
- "Do I need to backup my database?" - Always a good idea, but migrations are safe
- "Will this break my existing orders?" - Nope, all changes are additive
- "How long does the upgrade take?" - Usually < 5 minutes
- "Can I skip migrations?" - **No!** The app won't work properly without them

---

## Want to Help?

If you've successfully upgraded, let us know! A quick "✅ Upgraded successfully on Windows/Linux/Mac" helps others feel confident.

Found a bug? Report it here: https://github.com/Blb3D/filaops/issues

Happy upgrading! 🎉
