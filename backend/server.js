const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const { Pool } = require("pg");

const app = express();

/* ---------------- Config ---------------- */
const PORT = 5000;
const JWT_SECRET = "mySuperSecretKey123";

// MySQL Pool (Auth)
const mysqlPool = mysql.createPool({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "Kit23@12345", // 🔴 Your MySQL password
  database: "shop",
  connectionLimit: 10,
});

// PostgreSQL Pool (Expense)
const pgPool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "expense_db",
  password: "Kit23@1234", // 🔴 Your PostgreSQL password
  port: 5432,
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
    // MySQL: Users
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

    // PostgreSQL: Users table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS expense (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(15) UNIQUE NOT NULL
      );
    `);
    console.log("✅ PostgreSQL expense table ensured");

    // PostgreSQL: Drop existing transactionss table if it has issues
    await pgPool.query(`DROP TABLE IF EXISTS transactionss CASCADE;`);
    console.log("🗑️ Dropped existing transactionss table");
    
    // PostgreSQL: Create fresh transactionss table
    await pgPool.query(`
      CREATE TABLE transactionss (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES expense(id) ON DELETE CASCADE,
        type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
        amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ PostgreSQL transactionss table created");

    // Create indexes for better performance
    await pgPool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactionss_user_id ON transactionss(user_id);
    `);
    await pgPool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactionss_date ON transactionss(date);
    `);
    console.log("✅ Indexes created");

    console.log("✅ All schemas ensured successfully");
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
    await pgPool.query("SELECT 1");
    res.json({ status: "up", mysql: rows[0].ok === 1, postgres: true });
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

/* ---------------- Expense (PostgreSQL) ---------------- */
// Create Expense User
app.post("/api/expense/users", async (req, res) => {
  const { name, phone } = req.body || {};
  if (!name || !phone) return res.status(400).json({ message: "Name & phone required" });

  try {
    const result = await pgPool.query(
      "INSERT INTO expense (name, phone) VALUES ($1, $2) RETURNING *",
      [name.trim(), phone.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Phone already exists" });
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get All Users
app.get("/api/expense/users", async (_req, res) => {
  try {
    const result = await pgPool.query("SELECT * FROM expense ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get Single User
app.get("/api/expense/users/:id", async (req, res) => {
  try {
    const result = await pgPool.query("SELECT * FROM expense WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Create Transaction
app.post("/api/expense/transactions", async (req, res) => {
  try {
    console.log("📝 Transaction request received:", req.body);
    const { user_id, type, amount } = req.body || {};
    
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

    console.log("🔍 Checking if user exists:", user_id);
    const userCheck = await pgPool.query("SELECT id FROM expense WHERE id = $1", [user_id]);
    console.log("👤 User check result:", userCheck.rows);
    if (userCheck.rows.length === 0) {
      console.log("❌ User not found:", user_id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("💾 Inserting transaction:", { user_id, type, amount: numAmount });
    
    // Test table existence first
    const tableCheck = await pgPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactionss'
      );
    `);
    console.log("📋 Table exists:", tableCheck.rows[0].exists);
    
    const result = await pgPool.query(
      "INSERT INTO transactionss (user_id, type, amount) VALUES ($1, $2, $3) RETURNING id, user_id, type, amount, date",
      [user_id, type, numAmount]
    );
    
    console.log("✅ Transaction created successfully:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Transaction creation error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get User Transactions
app.get("/api/expense/transactions/user/:id", async (req, res) => {
  try {
    const result = await pgPool.query(
      "SELECT id, user_id, type, amount, date FROM transactionss WHERE user_id = $1 ORDER BY date ASC, id ASC",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Users with Balance
app.get("/api/expense/users-with-balance", async (_req, res) => {
  try {
    const result = await pgPool.query(`
      SELECT u.id, u.name, u.phone,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS balance
      FROM expense u
      LEFT JOIN transactionss t ON u.id = t.user_id
      GROUP BY u.id
      ORDER BY u.id ASC;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ---------------- Start Server ---------------- */
(async () => {
  try {
    // Test PostgreSQL connection
    console.log("🔌 Testing PostgreSQL connection...");
    const testResult = await pgPool.query("SELECT NOW() as current_time");
    console.log("✅ Connected to PostgreSQL at:", testResult.rows[0].current_time);
    
    // Ensure schemas
    console.log("🔧 Setting up database schemas...");
    await ensureSchemas();
    
    // Test if we can query the tables
    const expenseCount = await pgPool.query("SELECT COUNT(*) FROM expense");
    const transactionCount = await pgPool.query("SELECT COUNT(*) FROM transactionss");
    console.log(`📊 Database status: ${expenseCount.rows[0].count} users, ${transactionCount.rows[0].count} transactions`);
    
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("❌ Startup error:", err);
    console.error("❌ Error details:", err.message);
    process.exit(1);
  }
})();
