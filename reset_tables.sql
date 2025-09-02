-- SQL script to delete all data from the three main tables
-- Execute these commands in order to avoid foreign key constraint violations

-- Disable foreign key checks temporarily (optional, for safety)
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all data from transactions table first (has foreign keys)
DELETE FROM transactions;

-- Delete all data from expense_users table
DELETE FROM expense_users;

-- Delete all data from users table
DELETE FROM users;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Reset auto-increment counters to start from 1 again (optional)
ALTER TABLE transactions AUTO_INCREMENT = 1;
ALTER TABLE expense_users AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;

-- Verify tables are empty
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'expense_users' as table_name, COUNT(*) as record_count FROM expense_users  
UNION ALL
SELECT 'transactions' as table_name, COUNT(*) as record_count FROM transactions;
