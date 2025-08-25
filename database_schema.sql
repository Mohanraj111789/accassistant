-- Users table for expense tracker
CREATE TABLE expense (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL
);

-- Transactions table
CREATE TABLE transactionss (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES expense(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX idx_transactionss_user_id ON transactionss(user_id);
CREATE INDEX idx_transactionss_date ON transactionss(date);

-- Function to update balance (optional)
CREATE OR REPLACE FUNCTION update_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be used with a trigger to maintain a running balance
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
