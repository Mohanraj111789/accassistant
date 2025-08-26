-- MySQL Schema for Expense Tracker Application
-- This replaces the PostgreSQL schema

-- Users table for authentication (already exists)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  username VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Expense users table (migrated from PostgreSQL)
CREATE TABLE IF NOT EXISTS expense_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transactions table (migrated from PostgreSQL)
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT,
  FOREIGN KEY (user_id) REFERENCES expense_users(id) ON DELETE CASCADE,
  INDEX idx_transactions_user_id (user_id),
  INDEX idx_transactions_date (date),
  INDEX idx_transactions_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- View for users with balance calculation
CREATE OR REPLACE VIEW users_with_balance AS
SELECT 
  u.id,
  u.name,
  u.phone,
  u.created_at,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS balance,
  COUNT(t.id) as transaction_count
FROM expense_users u
LEFT JOIN transactions t ON u.id = t.user_id
GROUP BY u.id, u.name, u.phone, u.created_at
ORDER BY u.id ASC;
