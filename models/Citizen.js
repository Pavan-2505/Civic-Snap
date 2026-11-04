// Collection 2 of 3: "citizens" -> people who report issues.
const mongoose = require("mongoose");

const citizenSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true }, // bcrypt hash
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Citizen", citizenSchema); // saved in the "citizens" collection
