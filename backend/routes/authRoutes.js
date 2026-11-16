
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Admin login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Temporary debugging
    console.log("\n========== LOGIN DEBUG ==========");
    console.log("Received email:", email);
    console.log("Password type:", typeof password);
    console.log("Password length:", password?.length);

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const [admins] = await pool.execute(
      "SELECT id, name, email, password FROM admins WHERE email = ?",
      [email.trim().toLowerCase()]
    );

    console.log("Admin found:", admins.length > 0);

    if (admins.length === 0) {
      console.log("Login failed: Email not found.");
      console.log("================================\n");

      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const admin = admins[0];

    const passwordMatches = await bcrypt.compare(
      password,
      admin.password
    );

    console.log("Password matches:", passwordMatches);

    if (!passwordMatches) {
      console.log("Login failed: Password mismatch.");
      console.log("================================\n");

      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    console.log("Login successful!");
    console.log("================================\n");

    return res.json({
      message: "Login successful.",
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Server error during login."
    });
  }
});

// Get logged-in admin
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const [admins] = await pool.execute(
      "SELECT id, name, email FROM admins WHERE id = ?",
      [req.admin.id]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        message: "Admin not found."
      });
    }

    res.json({
      admin: admins[0]
    });

  } catch (error) {
    console.error("Admin profile error:", error);

    res.status(500).json({
      message: "Unable to get admin profile."
    });
  }
});

module.exports = router;
