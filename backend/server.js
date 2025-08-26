const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");

const app = express();

/* ---------------- Config ---------------- */
const PORT = 5000;
const JWT_SECRET = "mySuperSecretKey123";

// MySQL Pool (Unified for Auth and Expense)
const mysqlPool = mysql.createPool({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "Kit23@12345", // 🔴 Your MySQL password
  database: "shop",
  connectionLimit: 10,
});

/* ---------------- Middleware ---------------- */
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Logging requests
app.use((req, _res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`, req.body && Object.keys(req.body).length ? req.body : "");
  next();
});

/* ---------------- Schemas ---------------- */
async function ensureSchemas() {
  try {
    // MySQL: Users table for authentication
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(191) NOT NULL UNIQUE,
        username VARCHAR(191) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ MySQL users table ensured");

    // MySQL: Expense Users table (linked to authenticated users)
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS expense_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT 1,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(15) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    // Add user_id column if it doesn't exist (for existing tables)
    try {
      await mysqlPool.query(`ALTER TABLE expense_users ADD COLUMN user_id INT DEFAULT 1`);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.log('Column user_id already exists or other error:', err.code);
      }
    }
    
    // Update existing records to have user_id = 1 if they are NULL
    await mysqlPool.query(`UPDATE expense_users SET user_id = 1 WHERE user_id IS NULL`);
    console.log("✅ MySQL expense_users table ensured");

    // MySQL: Transactions table (linked to expense_users)
    await mysqlPool.query(`SET FOREIGN_KEY_CHECKS = 0`);
    
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('income', 'expense') NOT NULL,
        amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    await mysqlPool.query(`SET FOREIGN_KEY_CHECKS = 1`);
    console.log("✅ MySQL transactions table ensured");

    // Create indexes for better performance (MySQL doesn't support IF NOT EXISTS for indexes)
    try {
      await mysqlPool.query(`CREATE INDEX idx_transactions_user_id ON transactions(user_id)`);
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME') throw err; // Ignore if index already exists
    }
    
    try {
      await mysqlPool.query(`CREATE INDEX idx_transactions_date ON transactions(date)`);
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME') throw err;
    }
    
    try {
      await mysqlPool.query(`CREATE INDEX idx_transactions_type ON transactions(type)`);
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME') throw err;
    }
    console.log("✅ MySQL indexes created");

    console.log("✅ All MySQL schemas ensured successfully");
  } catch (error) {
    console.error("❌ Schema creation error:", error);
    throw error;
  }
}

/* ---------------- Routes ---------------- */
// Health Check
app.get("/api/health", async (_req, res) => {
  try {
    const [rows] = await mysqlPool.query("SELECT 1 AS ok");
    res.json({ status: "up", mysql: rows[0].ok === 1 });
  } catch (err) {
    res.status(500).json({ status: "down", error: err.message });
  }
});

/* ---------------- AUTH (MySQL) ---------------- */
// Signup
app.post("/api/signup", async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    if (!email || !username || !password) return res.status(400).json({ message: "email, username, password required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const [existing] = await mysqlPool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) return res.status(409).json({ message: "Email already registered" });

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await mysqlPool.query(
      "INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)",
      [email, username, password_hash]
    );

    res.status(201).json({ id: result.insertId, email, username, message: "User created" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "email and password required" });

    const [rows] = await mysqlPool.query("SELECT id, email, username, password_hash FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: "2h" });

    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Protected profile
app.get("/api/profile", async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Missing token" });

  const token = authHeader.split(" ")[1] || "";
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ message: "Profile data", user: decoded });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

/* ---------------- Auth Middleware ---------------- */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Missing token" });

  const token = authHeader.split(" ")[1] || "";
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* ---------------- Expense (MySQL) ---------------- */
// Create Expense User (Protected)
app.post("/api/expense/users", authenticateToken, async (req, res) => {
  const { name, phone } = req.body || {};
  if (!name || !phone) return res.status(400).json({ message: "Name & phone required" });

  // Validate phone number: only digits and exactly 10 characters
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone.trim())) {
    return res.status(400).json({ message: "Phone number must be exactly 10 digits and contain only numbers" });
  }

  try {
    // Check if name already exists for this user
    const [existingName] = await mysqlPool.query(
      "SELECT id FROM expense_users WHERE name = ? AND user_id = ?",
      [name.trim(), req.user.id]
    );
    if (existingName.length > 0) {
      return res.status(409).json({ message: "Name already exists for this user" });
    }

    // Check if phone number already exists for this user
    const [existingPhone] = await mysqlPool.query(
      "SELECT id FROM expense_users WHERE phone = ? AND user_id = ?",
      [phone.trim(), req.user.id]
    );
    if (existingPhone.length > 0) {
      return res.status(409).json({ message: "Phone number already exists for this user" });
    }
    const [result] = await mysqlPool.query(
      "INSERT INTO expense_users (user_id, name, phone) VALUES (?, ?, ?)",
      [req.user.id, name.trim(), phone.trim()]
    );
    
    // Get the created user
    const [newUser] = await mysqlPool.query(
      "SELECT * FROM expense_users WHERE id = ?",
      [result.insertId]
    );
    
    res.status(201).json(newUser[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Phone already exists for this user" });
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get Users for Current Authenticated User (Protected)
app.get("/api/expense/users", authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching users for authenticated user:', req.user.id);
    const [rows] = await mysqlPool.query(
      "SELECT * FROM expense_users WHERE user_id = ? ORDER BY id ASC",
      [req.user.id]
    );
    console.log('📋 Found users:', rows.length);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get Single User (Protected)
app.get("/api/expense/users/:id", authenticateToken, async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(
      "SELECT * FROM expense_users WHERE id = ? AND user_id = ?", 
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Create Transaction (Protected)
app.post("/api/expense/transactions", authenticateToken, async (req, res) => {
  try {
    console.log("📝 Transaction request received:", req.body);
    console.log("📝 Request headers:", req.headers);
    const { user_id, type, amount, date } = req.body || {};
    
    if (!user_id || !type || amount === undefined) {
      console.log("❌ Missing required fields:", { user_id, type, amount });
      return res.status(400).json({ message: "user_id, type & amount required" });
    }
    
    if (!["income", "expense"].includes(type)) {
      console.log("❌ Invalid transaction type:", type);
      return res.status(400).json({ message: "type must be 'income' or 'expense'" });
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      console.log("❌ Invalid amount:", amount);
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    // Validate date if provided
    let transactionDate = null;
    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        console.log("❌ Invalid date format:", date);
        return res.status(400).json({ message: "Invalid date format. Use ISO 8601 format (e.g., YYYY-MM-DD)" });
      }
      transactionDate = parsedDate;
    }

    console.log("🔍 Checking if user exists:", user_id);
    const [userCheck] = await mysqlPool.query(
      "SELECT id FROM expense_users WHERE id = ? AND user_id = ?", 
      [user_id, req.user.id]
    );
    console.log("👤 User check result:", userCheck);
    if (userCheck.length === 0) {
      console.log("❌ Expense user not found or doesn't belong to authenticated user:", user_id);
      return res.status(404).json({ message: "Expense user not found or access denied" });
    }

    console.log("💾 Inserting transaction:", { user_id, type, amount: numAmount, date: transactionDate });
    
    // Test database connection first
    const [connectionTest] = await mysqlPool.query("SELECT 1 as test");
    console.log("🔌 Database connection test:", connectionTest[0]);
    
    // Insert transaction with optional date
    let result;
    if (transactionDate) {
      [result] = await mysqlPool.query(
        "INSERT INTO transactions (user_id, type, amount, date) VALUES (?, ?, ?, ?)",
        [user_id, type, numAmount, transactionDate]
      );
    } else {
      [result] = await mysqlPool.query(
        "INSERT INTO transactions (user_id, type, amount) VALUES (?, ?, ?)",
        [user_id, type, numAmount]
      );
    }
    
    console.log("💾 Insert result:", { insertId: result.insertId, affectedRows: result.affectedRows });
    
    // Get the created transaction
    const [newTransaction] = await mysqlPool.query(
      "SELECT id, user_id, type, amount, date FROM transactions WHERE id = ?",
      [result.insertId]
    );
    
    console.log("✅ Transaction created successfully:", newTransaction[0]);
    res.status(201).json(newTransaction[0]);
  } catch (err) {
    console.error("❌ Transaction creation error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get User Transactions (Protected)
// Delete Transaction (Protected)
app.delete("/api/expense/transactions/:id", authenticateToken, async (req, res) => {
  try {
    const transactionId = req.params.id;
    if (!transactionId) {
      return res.status(400).json({ message: "Transaction ID is required" });
    }

    // First, get the transaction to verify ownership
    const [transaction] = await mysqlPool.query(
      "SELECT t.* FROM transactions t " +
      "JOIN expense_users eu ON t.user_id = eu.id " +
      "WHERE t.id = ? AND eu.user_id = ?",
      [transactionId, req.user.id]
    );

    if (transaction.length === 0) {
      return res.status(404).json({ message: "Transaction not found or access denied" });
    }

    // Delete the transaction
    await mysqlPool.query("DELETE FROM transactions WHERE id = ?", [transactionId]);
    
    res.status(200).json({ message: "Transaction deleted successfully" });
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete User and All Transactions (Protected)
app.delete("/api/expense/users/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // First verify the expense user belongs to the authenticated user
    const [userCheck] = await mysqlPool.query(
      "SELECT id FROM expense_users WHERE id = ? AND user_id = ?", 
      [userId, req.user.id]
    );
    
    if (userCheck.length === 0) {
      return res.status(404).json({ message: "User not found or access denied" });
    }

    // Delete all transactions for this user first (due to foreign key constraints)
    await mysqlPool.query("DELETE FROM transactions WHERE user_id = ?", [userId]);
    
    // Then delete the user
    await mysqlPool.query("DELETE FROM expense_users WHERE id = ? AND user_id = ?", [userId, req.user.id]);
    
    res.status(200).json({ message: "User and all transactions deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get User Transactions (Protected)
app.get("/api/expense/transactions/user/:id", authenticateToken, async (req, res) => {
  try {
    // First verify the expense user belongs to the authenticated user
    const [userCheck] = await mysqlPool.query(
      "SELECT id FROM expense_users WHERE id = ? AND user_id = ?", 
      [req.params.id, req.user.id]
    );
    if (userCheck.length === 0) {
      return res.status(404).json({ message: "Expense user not found or access denied" });
    }
    
    const [rows] = await mysqlPool.query(
      "SELECT id, user_id, type, amount, date FROM transactions WHERE user_id = ? ORDER BY date ASC, id ASC",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Users with Balance for Current Authenticated User (Protected)
app.get("/api/expense/users-with-balance", authenticateToken, async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(`
      SELECT u.id, u.name, u.phone, u.created_at,
        COALESCE(SUM(CASE WHEN LOWER(t.type) = 'income' THEN t.amount WHEN LOWER(t.type) = 'expense' THEN -t.amount ELSE 0 END), 0) AS balance,
        COUNT(t.id) as transaction_count
      FROM expense_users u
      LEFT JOIN transactions t ON u.id = t.user_id
      WHERE u.user_id = ?
      GROUP BY u.id, u.name, u.phone, u.created_at
      ORDER BY u.id ASC;
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Dashboard - Get Total Balance for Current Authenticated User (Protected)
app.get("/api/expense/dashboard", authenticateToken, async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN LOWER(t.type) = 'income' THEN t.amount WHEN LOWER(t.type) = 'expense' THEN -t.amount ELSE 0 END), 0) AS total_balance,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(t.id) as total_transactions,
        COALESCE(SUM(CASE WHEN LOWER(t.type) = 'income' THEN t.amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN LOWER(t.type) = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expenses
      FROM expense_users u
      LEFT JOIN transactions t ON u.id = t.user_id
      WHERE u.user_id = ?;
    `, [req.user.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ---------------- Start Server ---------------- */
(async () => {
  try {
    // Test MySQL connection
    console.log("🔌 Testing MySQL connection...");
    const [testResult] = await mysqlPool.query("SELECT NOW() as `current_time`");
    console.log("✅ Connected to MySQL at:", testResult[0].current_time);
    
    // Ensure schemas
    console.log("🔧 Setting up database schemas...");
    await ensureSchemas();
    
    // Test if we can query the tables
    const [expenseCount] = await mysqlPool.query("SELECT COUNT(*) as count FROM expense_users");
    const [transactionCount] = await mysqlPool.query("SELECT COUNT(*) as count FROM transactions");
    console.log(`📊 Database status: ${expenseCount[0].count} users, ${transactionCount[0].count} transactions`);
    
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("❌ Startup error:", err);
    console.error("❌ Error details:", err.message);
    process.exit(1);
  }
})();
