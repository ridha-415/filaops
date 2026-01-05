# Repository Organization

This document explains the repository structure for new contributors and collaborators.

## 📁 Directory Structure

```
filaops/
├── backend/              # FastAPI backend application
│   ├── app/             # Application code
│   ├── migrations/      # Alembic database migrations
│   └── tests/           # Backend tests
├── frontend/            # React frontend application
├── docs/                # All documentation (see below)
├── scripts/             # Utility scripts
├── config/              # Configuration files
├── agents/              # AI agents code
├── README.md            # Main project README
├── CONTRIBUTING.md      # Contribution guidelines
├── CHANGELOG.md         # Version history
├── CLAUDE.md            # AI assistant context
├── PROPRIETARY.md       # Open source boundary docs
├── LICENSE              # BSL 1.1 License
├── docker-compose.yml   # Docker deployment config
├── start-all.ps1        # Windows: Start backend + frontend
├── start-backend.ps1    # Windows: Start backend only
└── start-frontend.ps1   # Windows: Start frontend only
```

## 📚 Documentation Organization

### Root Level (Essential)
- `README.md` - Project overview and quick start
- `CONTRIBUTING.md` - How to contribute
- `CHANGELOG.md` - Version history
- `LICENSE` - Project license (BSL 1.1)

### `docs/` Directory

#### `docs/setup/`
Installation guides by platform:
- `docker.md` - Docker installation (recommended)
- `windows.md` - Windows native installation
- `linux-macos.md` - macOS/Linux/SSH installation

#### `docs/` (root)
User-facing documentation:
- `getting-started.md` - Getting started guide
- `how-it-works.md` - System overview
- `faq.md` - Frequently asked questions
- `troubleshooting.md` - Common issues and solutions
- `upgrade.md` - Upgrade guide
- `MARKETPLACE_IMPORT_GUIDE.md` - Import from marketplaces
- `SQUARESPACE_IMPORT_GUIDE.md` - Squarespace import

#### `docs/architecture/`
Technical architecture and design documents:
- System architecture overviews
- Database schemas
- API documentation
- Integration patterns

#### `docs/development/`
Developer documentation:
- `api-migration.md` - API migration guide
- `debugging.md` - Debugging guide

#### `docs/guides/`
Feature-specific guides:
- `quality-traceability.md` - Quality and traceability features

#### `docs/archive/`
Historical documents and announcements

## 🚀 Getting Started

For new contributors:

1. Read the main `README.md` for project overview
2. Follow the setup guide for your platform in `docs/setup/`
3. Read `CONTRIBUTING.md` for contribution guidelines
4. Check `docs/how-it-works.md` for system understanding

## 🔧 Scripts

| Script | Purpose |
|--------|---------|
| `start-all.ps1` | Start backend + frontend (Windows) |
| `start-backend.ps1` | Start backend only (Windows) |
| `start-frontend.ps1` | Start frontend only (Windows) |

## 📖 Key Documentation

| Document | Purpose |
|----------|---------|
| `README.md` | Project overview, quick start |
| `docs/setup/*.md` | Platform-specific installation |
| `docs/getting-started.md` | First steps after install |
| `docs/how-it-works.md` | System architecture overview |
| `docs/faq.md` | Common questions |
| `docs/troubleshooting.md` | Problem solving |

---

*Last updated: January 2026*
