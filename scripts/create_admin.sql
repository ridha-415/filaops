-- Create initial admin user for FilaOps
-- Run this after database setup if you need to manually create an admin
--
-- Default credentials:
--   Email: admin@localhost
--   Password: admin123
--
-- CHANGE THIS PASSWORD IMMEDIATELY after first login!
--
-- Usage:
--   sqlcmd -S localhost\SQLEXPRESS -d FilaOps -i scripts/create_admin.sql

USE FilaOps;  -- Change to your database name if different
GO

-- This hash is for password "admin123" - generated with bcrypt
DECLARE @password_hash NVARCHAR(255) = '$2b$12$M8s8lTWl5oUfiynsZMe5euGtyWH2ENo1FKa0J9tl2Ing8hf6JGNV.';

-- Check if admin exists
IF EXISTS (SELECT 1 FROM users WHERE email = 'admin@localhost')
BEGIN
    -- Update existing admin
    UPDATE users
    SET password_hash = @password_hash,
        account_type = 'admin',
        status = 'active',
        updated_at = GETDATE()
    WHERE email = 'admin@localhost';
    PRINT 'Admin user updated';
END
ELSE
BEGIN
    -- Create new admin user
    INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        account_type,
        status,
        email_verified,
        created_at,
        updated_at
    ) VALUES (
        'admin@localhost',
        @password_hash,
        'Admin',
        'User',
        'admin',
        'active',
        1,
        GETDATE(),
        GETDATE()
    );
    PRINT 'Admin user created';
END
GO

-- Verify
SELECT id, email, account_type, status FROM users WHERE email = 'admin@localhost';
GO

PRINT '';
PRINT '========================================';
PRINT 'Admin login credentials:';
PRINT '  Email: admin@localhost';
PRINT '  Password: admin123';
PRINT '';
PRINT 'CHANGE THIS PASSWORD IMMEDIATELY!';
PRINT '========================================';
GO
