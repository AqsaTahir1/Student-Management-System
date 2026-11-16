require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const courseRoutes = require("./routes/courseRoutes");

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173"
}));

app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Student Management System API is running."
  });
});

// Create default admin if one does not exist
async function createDefaultAdmin() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error("Admin details are missing from the .env file.");
  }

  const [admins] = await pool.execute(
    "SELECT id FROM admins WHERE email = ?",
    [email]
  );

  if (admins.length === 0) {
    const hashedPassword = await bcrypt.hash(password, 12);

    await pool.execute(
      "INSERT INTO admins (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    console.log("Default admin account created.");
  } else {
    console.log("Admin account already exists.");
  }
}

// Start server after database connection
async function startServer() {
  try {
    await pool.query("SELECT 1");
    console.log("MySQL database connected successfully.");

    await createDefaultAdmin();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Backend server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start backend:", error.message);
    process.exit(1);
  }
}

startServer();