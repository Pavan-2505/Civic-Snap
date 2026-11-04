// CivicSnap server: serves the web pages (public/ folder) AND the API from one place.
// Open http://localhost:3000 after starting it.
require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const Admin = require("./models/Admin");
const authRoutes = require("./routes/auth");
const reportRoutes = require("./routes/reports");

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/civic_snap"; // local MongoDB if no .env value

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET in .env - copy .env.example to .env first.");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // photos travel as base64 text, so allow bigger bodies

// API
app.use("/api", authRoutes);
app.use("/api/reports", reportRoutes);

// Web pages (only the public/ folder is exposed - server code and .env stay private)
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));

// First start: create the default admin (admin / admin123) so you can log in immediately
async function seedDefaultAdmin() {
  if (!(await Admin.findOne({ username: "admin" }))) {
    await Admin.create({ username: "admin", password: await bcrypt.hash("admin123", 10) });
    console.log("Default admin created ->  username: admin   password: admin123");
  }
}

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB:", mongoose.connection.name);
    await seedDefaultAdmin();
    app.listen(PORT, () => console.log(`CivicSnap running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    console.error("Check MONGO_URI in your .env file (see README, Step 2).");
    process.exit(1);
  });
