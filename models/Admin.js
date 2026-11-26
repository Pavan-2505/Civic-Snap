// Collection 1 of 3: "admins"  -> people who can open the admin dashboard.
const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true }, // stored as a bcrypt hash, never plain text
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Admin", adminSchema); // saved in the "admins" collection
