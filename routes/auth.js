// Register + login for citizens and admins (two separate collections).
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Citizen = require("../models/Citizen");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function makeToken(username, role) {
  return jwt.sign({ username, role }, process.env.JWT_SECRET, { expiresIn: "8h" });
}

// POST /api/register  { username, password }  -> always creates a CITIZEN
// (the role in the request is ignored on purpose, so nobody can register themselves as admin)
router.post("/register", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (username.length < 3 || password.length < 4) {
      return res.status(400).json({ message: "Username needs 3+ characters and password 4+ characters." });
    }
    if (await Citizen.findOne({ username })) {
      return res.status(400).json({ message: "Username already taken!" });
    }

    await Citizen.create({ username, password: await bcrypt.hash(password, 10) });
    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error during registration.", error: err.message });
  }
});

// POST /api/login  { username, password, role: "admin" | "citizen" }
router.post("/login", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const Model = role === "admin" ? Admin : Citizen; // pick the right collection

    const user = await Model.findOne({ username: String(username || "").trim() });
    const ok = user && (await bcrypt.compare(String(password || ""), user.password));
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid username or password!" });
    }

    const finalRole = role === "admin" ? "admin" : "citizen";
    res.json({
      success: true,
      username: user.username,
      role: finalRole,
      token: makeToken(user.username, finalRole),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error during login.", error: err.message });
  }
});

// POST /api/admin/create  { username, password }  -> only a logged-in admin can add another admin
router.post("/admin/create", requireAuth("admin"), async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (username.length < 3 || password.length < 4) {
      return res.status(400).json({ message: "Username needs 3+ characters and password 4+ characters." });
    }
    if (await Admin.findOne({ username })) {
      return res.status(400).json({ message: "Username already taken!" });
    }

    await Admin.create({ username, password: await bcrypt.hash(password, 10) });
    res.status(201).json({ message: "New admin account created successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Error creating admin.", error: err.message });
  }
});

module.exports = router;
