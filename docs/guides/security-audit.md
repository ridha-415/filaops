# Security Audit Dashboard

FilaOps includes a built-in Security Audit feature that helps 3D print farm operators—even those without technical security expertise—identify and fix security issues with one-click solutions.

## Accessing the Security Audit

1. Log in as an admin user
2. Navigate to **Settings > Security Audit**
3. The audit runs automatically and displays results

## Security Checks

The audit performs the following checks, organized by severity:

### Critical Checks (Red)

| Check | What It Detects | Auto-Fix Available |
|-------|-----------------|-------------------|
| **Secret Key Strength** | Weak or default SECRET_KEY in .env | Yes |
| **Secret Key Entropy** | SECRET_KEY with insufficient randomness | Yes |
| **Environment Mode** | ENVIRONMENT not set to "production" | No |
| **Debug Disabled** | DEBUG=true in production | No |
| **HTTPS Enabled** | Missing TLS/HTTPS configuration | Yes |
| **Admin Password** | Default admin passwords still in use | No |
| **.env Exposure** | .env file accessible via web | No |

### Warning Checks (Yellow)

| Check | What It Detects | Auto-Fix Available |
|-------|-----------------|-------------------|
| **CORS Configuration** | Wildcard origins or misconfigured CORS | No |
| **Rate Limiting** | Missing rate limiting protection | No |
| **Database SSL** | Missing SSL for remote database connections | No |

### Info Checks (Blue)

Info-level items are contextual—they explain why certain checks were skipped or provide additional context about your configuration.

## "Fix It For Me" Auto-Fix Buttons

For checks that support auto-fix, click the **Fix This** button to open a guided wizard:

### SECRET_KEY Fix
- Generates a cryptographically secure 64-character key
- Automatically updates your .env file
- Reminds you to restart the backend

### HTTPS Setup (Caddy)
The most comprehensive auto-fix. When you click "Fix This" for HTTPS:

1. **Enter your domain** (e.g., `filaops.local` for local use, or your real domain)
2. **Automatic setup**:
   - Downloads Caddy server from GitHub (if not installed)
   - Creates a `Caddyfile` with proper routing configuration
   - Creates a desktop shortcut (`Start FilaOps.bat`)
   - Updates `vite.config.js` to allow your domain
   - Configures CORS to accept your HTTPS domain

3. **The desktop shortcut**:
   - Starts the backend server
   - Starts the frontend dev server
   - Starts Caddy for HTTPS
   - Automatically adds the domain to your hosts file (with admin prompt)
   - Opens your browser to the HTTPS URL

## How the Checks Work

### HTTPS Detection
The audit considers HTTPS properly configured if ANY of these are true:
- `FRONTEND_URL` starts with `https://`
- Caddy is installed AND a `Caddyfile` exists
- `ALLOWED_ORIGINS` contains an `https://` URL AND a `Caddyfile` exists

### CORS Hybrid Setup
If you have both localhost origins (for development) AND an HTTPS origin (for production access), the audit recognizes this as a valid "hybrid setup" and shows PASS instead of warning.

### .env Exposure Test
In production mode with an HTTPS origin configured, the audit actually attempts to fetch `https://yourdomain/.env` to verify your reverse proxy blocks it. A 404 response = PASS.

### Database SSL
Only warns about missing SSL when your database host is NOT localhost. Local databases don't need SSL encryption since traffic never leaves your machine.

## Understanding the Results

| Status | Color | Meaning |
|--------|-------|---------|
| PASS | Green | Check passed, no action needed |
| FAIL | Red | Critical issue, must fix |
| WARN | Yellow | Potential issue, should review |
| INFO | Blue | Informational, context provided |

## Architecture

```
Frontend                          Backend
┌─────────────────────┐          ┌─────────────────────────────────┐
│ AdminSecurity.jsx   │          │ /api/v1/security/audit          │
│   └─ RemediationModal│ ──────> │   └─ SecurityAuditor            │
│      (Fix wizards)  │          │      (scripts/security_audit.py)│
└─────────────────────┘          └─────────────────────────────────┘
                                          │
                                          ▼
                                 ┌─────────────────────┐
                                 │ Auto-fix endpoints  │
                                 │ /security/fix/...   │
                                 │ - generate-key      │
                                 │ - apply-key         │
                                 │ - setup-https       │
                                 └─────────────────────┘
```

## Files Involved

| File | Purpose |
|------|---------|
| `backend/scripts/security_audit.py` | Core audit logic and checks |
| `backend/app/api/v1/endpoints/security.py` | API endpoints and auto-fix handlers |
| `frontend/src/pages/admin/AdminSecurity.jsx` | Dashboard UI |
| `frontend/src/components/RemediationModal.jsx` | Fix wizard modal |

## Extending the Audit

To add a new security check:

1. Add a check method to `SecurityAuditor` class in `security_audit.py`:
```python
def _check_my_new_check(self):
    check_id = "my_new_check"
    name = "My New Check"
    category = CheckCategory.WARNING  # or CRITICAL

    # Your check logic here
    if problem_detected:
        self.results.append(CheckResult(
            id=check_id, name=name, category=category,
            status=CheckStatus.WARN,
            message="Problem description",
            remediation="How to fix it"
        ))
    else:
        self.results.append(CheckResult(
            id=check_id, name=name, category=category,
            status=CheckStatus.PASS,
            message="All good"
        ))
```

2. Call it from `run_all_checks()`:
```python
def run_all_checks(self):
    # ... existing checks ...
    self._check_my_new_check()
```

3. Optionally add a remediation guide in `security.py`:
```python
remediation_guides = {
    # ... existing guides ...
    "my_new_check": {
        "title": "Fix: My New Check",
        "severity": "warning",
        "steps": [...]
    }
}
```

## Best Practices

1. **Run the audit after deployment** - Verify your production configuration
2. **Use the desktop shortcut** - Ensures all services start correctly together
3. **Keep HTTPS enabled** - Even for local development, it matches production behavior
4. **Review INFO items** - They explain why checks were skipped and may reveal misconfigurations
