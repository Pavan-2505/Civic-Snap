// Collection 3 of 3: "reports" -> every issue a citizen has reported.
// Field names match the contract in admin_dashboard.html so all pages agree.
const mongoose = require("mongoose");

const CATEGORIES = [
  "Road & Potholes",
  "Waste Management",
  "Drainage & Sanitation",
  "Street Lighting",
  "Public Infrastructure",
  "Water-related Issues",
  "Other",
];
const STATUSES = ["Reported", "Acknowledged", "In Progress", "Resolved"];
const SEVERITIES = ["Low", "Medium", "High"];

const reportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // readable ID like "CS-1730620000000"
  title: { type: String, required: true },
  category: { type: String, required: true, enum: CATEGORIES },
  description: { type: String, required: true },
  location: {
    address: { type: String, required: true }, // typed street/area
    lat: { type: Number, default: null },      // pin on the map (used by the Community Map)
    lng: { type: Number, default: null },
  },
  photo: { type: String, required: true },     // "before" photo as a base64 data URL
  afterPhoto: { type: String, default: null }, // added by admin once resolved
  status: { type: String, enum: STATUSES, default: "Reported" },
  severity: { type: String, enum: SEVERITIES, default: "Medium" },
  reportedBy: { type: String, required: true }, // citizen's username
  adminNote: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const Report = mongoose.model("Report", reportSchema); // saved in the "reports" collection
Report.CATEGORIES = CATEGORIES;
Report.STATUSES = STATUSES;
module.exports = Report;
