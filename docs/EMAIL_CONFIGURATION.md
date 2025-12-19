# Email Configuration Guide

FilaOps uses email notifications for important system events, including password resets. **By default, emails are NOT sent** - you must configure SMTP settings to enable email functionality.

## Why Emails Don't Send by Default

For security and flexibility, FilaOps requires explicit SMTP configuration. Without it:
- ✅ Password reset requests are still created in the database
- ✅ The system logs what email "would have been sent"
- ❌ No actual emails are sent

This allows you to:
- Test the system without sending real emails
- Choose your own email provider
- Keep email credentials secure in your `.env` file

## Quick Setup

### Step 1: Add SMTP Settings to `.env`

Open your `.env` file in the project root and add these settings:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourcompany.com
SMTP_FROM_NAME=Your Company Name

# Admin email for password reset approvals
ADMIN_APPROVAL_EMAIL=admin@yourcompany.com
```

### Step 2: Restart Backend

After adding the settings, restart your backend server:

```bash
# Stop the backend (Ctrl+C), then restart:
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

## Email Provider Setup Guides

### Gmail (Recommended for Testing)

Gmail requires an **App Password** (not your regular password) for SMTP access.

#### Step 1: Enable 2-Step Verification
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification" if not already enabled

#### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Enter "FilaOps" as the name
4. Click "Generate"
5. Copy the 16-character password (no spaces)

#### Step 3: Configure `.env`
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop  # Use the app password (remove spaces)
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Your Company Name
ADMIN_APPROVAL_EMAIL=admin@yourcompany.com
```

### Google Workspace (G Suite)

Google Workspace uses the same SMTP settings as Gmail, but with your Workspace email address.

#### Step 1: Enable 2-Step Verification
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification" if not already enabled

#### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Enter "FilaOps" as the name
4. Click "Generate"
5. Copy the 16-character password (no spaces)

#### Step 3: Configure `.env`
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@yourcompany.com  # Your full Workspace email
SMTP_PASSWORD=abcdefghijklmnop  # App password (remove spaces)
SMTP_FROM_EMAIL=your-email@yourcompany.com  # Your Workspace email
SMTP_FROM_NAME=Your Company Name
ADMIN_APPROVAL_EMAIL=admin@yourcompany.com
```

**Note:** If your Workspace admin has restricted "Less secure app access", you may need to:
- Contact your Workspace admin to enable App Passwords
- Or use OAuth2 instead (more complex setup)

### Microsoft 365 / Outlook

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@yourcompany.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=your-email@yourcompany.com
SMTP_FROM_NAME=Your Company Name
ADMIN_APPROVAL_EMAIL=admin@yourcompany.com
```

### SendGrid

1. Sign up at https://sendgrid.com
2. Create an API key in Settings → API Keys
3. Configure:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@yourcompany.com
SMTP_FROM_NAME=Your Company Name
ADMIN_APPROVAL_EMAIL=admin@yourcompany.com
```

### Custom SMTP Server

For your own mail server or other providers:

```env
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587  # or 465 for SSL, 25 for unencrypted
SMTP_USER=your-username
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=noreply@yourcompany.com
SMTP_FROM_NAME=Your Company Name
ADMIN_APPROVAL_EMAIL=admin@yourcompany.com
```

**Common SMTP Ports:**
- `587` - TLS (recommended)
- `465` - SSL
- `25` - Unencrypted (not recommended)

## Verifying Email Configuration

### Method 1: Check Backend Logs

After restarting the backend, try requesting a password reset. Check the logs:

**If configured correctly:**
```
INFO: Email sent successfully to admin@yourcompany.com
```

**If NOT configured:**
```
WARNING: SMTP credentials not configured - email not sent
INFO: Would have sent email to admin@yourcompany.com: [BLB3D] Password Reset Request
```

### Method 2: Test Password Reset Flow

1. Go to the login page
2. Click "Forgot your password?"
3. Enter an email address
4. Submit the form
5. Check:
   - **Backend logs** for email send status
   - **Admin email inbox** (if configured) for approval request
   - **User email inbox** (after admin approval) for reset link

## Password Reset Flow Explained

FilaOps uses a **two-step approval process** for security:

### Step 1: User Requests Reset
1. User clicks "Forgot your password?" on login page
2. User enters their email address
3. System creates a password reset request (status: `pending`)
4. **Email sent to admin** (if SMTP configured) with approve/deny links

### Step 2: Admin Approval
1. Admin receives email with approval link
2. Admin clicks "Approve Reset" or "Deny Request"
3. If approved:
   - Request status changes to `approved`
   - **Email sent to user** (if SMTP configured) with reset link

### Step 3: User Resets Password
1. User clicks reset link in email
2. User enters new password
3. Password is updated
4. **Confirmation email sent** (if SMTP configured)

## Troubleshooting

### "SMTP credentials not configured" Warning

**Problem:** SMTP settings are missing or incorrect in `.env`

**Solution:**
1. Check `.env` file exists in project root
2. Verify all SMTP settings are present
3. Ensure no typos in variable names
4. Restart backend after changes

### "Failed to send email" Error

**Problem:** SMTP connection failed

**Common causes:**
- Wrong SMTP host/port
- Incorrect username/password
- Firewall blocking port 587
- Gmail: Using regular password instead of App Password
- 2FA required but not enabled

**Solution:**
1. Verify SMTP settings match your provider's documentation
2. For Gmail: Use App Password, not regular password
3. Check firewall allows outbound connections on port 587
4. Test SMTP settings with a mail client first

### Emails Go to Spam

**Problem:** Email provider marks emails as spam

**Solution:**
1. Use a professional email address (not free Gmail for business)
2. Set up SPF/DKIM records for your domain
3. Use a service like SendGrid or Mailgun for better deliverability
4. Check spam folder and mark as "Not Spam"

### Password Reset Request Not Received

**Problem:** Admin didn't receive approval email

**Possible causes:**
1. SMTP not configured (check logs)
2. Email in spam folder
3. Wrong `ADMIN_APPROVAL_EMAIL` address
4. Email provider blocking the email

**Solution:**
1. Check backend logs for email send status
2. Verify `ADMIN_APPROVAL_EMAIL` is correct
3. Check spam/junk folder
4. Try a different email address

## Email Features

Currently, FilaOps sends emails for:

- ✅ **Password Reset Approval Requests** - Sent to admin when user requests reset
- ✅ **Password Reset Approved** - Sent to user after admin approval
- ✅ **Password Reset Denied** - Sent to user if admin denies request
- ✅ **Password Reset Completed** - Confirmation after password change

Future email features:
- Order confirmations
- Production status updates
- Shipping notifications
- Quote approvals

## Security Best Practices

1. **Never commit `.env` to git** - It contains sensitive credentials
2. **Use App Passwords** - For Gmail, use App Passwords, not your main password
3. **Rotate credentials** - Change SMTP passwords periodically
4. **Use environment-specific settings** - Different SMTP for dev/prod
5. **Monitor logs** - Check for failed email attempts

## Testing Without Real Emails

If you want to test the system without sending real emails:

1. **Don't configure SMTP** - System will log what would be sent
2. **Check backend logs** - See email content in debug logs
3. **Use test email service** - Services like Mailtrap.io for testing
4. **Manual approval** - Use admin panel to approve reset requests directly

## Need Help?

- Check backend logs for detailed error messages
- Verify SMTP settings with your email provider's documentation
- Test SMTP connection with a mail client first
- See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for more help

---

**Last Updated:** 2025-01-XX  
**Related Docs:** [GETTING_STARTED.md](../GETTING_STARTED.md), [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)

