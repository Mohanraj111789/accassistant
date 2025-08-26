-- Complete MySQL Setup Script for Expense Tracker
-- Run this script in your MySQL database to ensure proper setup

USE shop;

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS expense_users;

-- Create expense_users table
CREATE TABLE expense_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create transactions table
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT,
  INDEX idx_user_id (user_id),
  INDEX idx_date (date),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert some test data
INSERT INTO expense_users (name, phone) VALUES 
('John Doe', '1234567890'),
('Jane Smith', '0987654321'),
('Test User', '5555555555');

-- Insert some test transactions
INSERT INTO transactions (user_id, type, amount, description) VALUES 
(1, 'income', 1000.00, 'Salary'),
(1, 'expense', 200.00, 'Groceries'),
(2, 'income', 500.00, 'Freelance work'),
(2, 'expense', 50.00, 'Coffee'),
(3, 'income', 100.00, 'Test income');

-- Verify the setup
SELECT 'Users created:' as info, COUNT(*) as count FROM expense_users;
SELECT 'Transactions created:' as info, COUNT(*) as count FROM transactions;

-- Show sample data
SELECT 'Sample Users:' as info;
SELECT id, name, phone FROM expense_users LIMIT 3;

SELECT 'Sample Transactions:' as info;
SELECT t.id, t.user_id, u.name, t.type, t.amount, t.date 
FROM transactions t 
JOIN expense_users u ON t.user_id = u.id 
LIMIT 5;
