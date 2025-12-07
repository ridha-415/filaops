# Contributing to FilaOps

Thanks for your interest in contributing to FilaOps! This guide will help you get started.

## Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Start the mock API server** for development
4. **Make your changes** and test locally
5. **Submit a pull request**

## Development Setup

### Mock API Server

The mock API provides a development environment without needing the proprietary backend:
```bash
cd mock-api
npm install
npm start
```

The mock server runs on:
- Port 8000: 3MF analysis endpoint
- Port 8001: Quote generation and materials endpoints

### What the Mock API Does

**Real functionality:**
- Parses 3MF files (geometry, materials, thumbnails)
- Detects multi-material prints
- Extracts color information

**Simulated functionality:**
- Material weights (estimated, not sliced)
- Print times (rough estimates)
- Pricing (fake rates to protect business logic)

## Areas for Contribution

### High Priority

1. **3D Viewer Instance Rendering**
   - BambuStudio 3MF files with instances don't render correctly
   - Need to parse instance transforms from metadata

2. **Multi-Material Color Selection UX**
   - Improve color picker interface
   - Add real-time cost feedback
   - Better mobile experience

### Other Areas

- UI/UX improvements
- Accessibility features
- Mobile responsiveness
- Documentation
- Bug fixes

## What's NOT in This Repo

FilaOps has a tiered architecture:

- **Open Source (this repo):** Core ERP, mock API, documentation
- **Pro (proprietary):** Quote portal, admin dashboard, integrations
- **Enterprise (proprietary):** ML pricing models, BambuStudio integration, production slicing

See [PROPRIETARY.md](PROPRIETARY.md) for details.

## Code Style

### General

- Follow existing code patterns in the codebase
- Add comments for complex logic
- Test your changes locally

### Backend (Python/FastAPI)

- Use type hints on all functions
- Use Pydantic for request/response validation
- Follow `Depends(get_db)` and `Depends(get_current_user)` patterns
- SQLAlchemy ORM (not raw SQL except complex aggregations)

### Frontend (React/Vite)

- Functional components with hooks
- Dark theme colors: `gray-900` (bg), `gray-800` (cards), `gray-700` (inputs)
- Use existing UI patterns from other Admin pages

---

## Git Workflow

### Branch Strategy

| Branch Type | Naming | Example | Purpose |
|-------------|--------|---------|---------|
| **main** | `main` | - | Production-ready code |
| **feature** | `feature/short-description` | `feature/customer-management` | New functionality |
| **fix** | `fix/issue-description` | `fix/bom-cost-calculation` | Bug fixes |
| **docs** | `docs/what-changed` | `docs/api-endpoints` | Documentation only |

### Commit Message Format

Use conventional commit style:

```text
<type>: <short description>

[optional body with more details]
```

**Types:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code restructuring (no behavior change)
- `style:` - Formatting, missing semicolons (no code change)
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**

```bash
git commit -m "feat: Add customer management module"
git commit -m "fix: Customer grid not displaying created records"
git commit -m "docs: Add printer overhead calculator guide"
```

### Workflow for New Features

```bash
# 1. Start from main (always pull latest)
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes, commit frequently
git add .
git commit -m "feat: Add customer list component"
git commit -m "feat: Add customer create/edit modal"
git commit -m "fix: Handle API response format"

# 4. Push to remote
git push -u origin feature/your-feature-name

# 5. Create Pull Request on GitHub
# (or merge locally if you're the sole maintainer)
git checkout main
git merge feature/your-feature-name
git push origin main

# 6. Clean up
git branch -d feature/your-feature-name
```

### Quick Commits (Same Day Work)

For quick fixes or documentation on `main`:

```bash
git add .
git commit -m "fix: Brief description of fix"
git push origin main
```

---

## Submitting Changes (External Contributors)

1. **Fork** the repository on GitHub
2. **Clone your fork** locally
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes and test against mock API
5. Commit with clear messages using conventional format
6. Push to your fork: `git push origin feature/your-feature-name`
7. **Open a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what and why
   - Screenshots for UI changes

## Questions?

- **Issues:** [GitHub Issues](https://github.com/Blb3D/filaops/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Blb3D/filaops/discussions)
- **Email:** hello@blb3dprinting.com

## License

By contributing, you agree that your contributions will be licensed under the Business Source License 1.1 (converts to Apache 2.0 after 4 years).

---

Thank you for contributing to FilaOps! 🎉
