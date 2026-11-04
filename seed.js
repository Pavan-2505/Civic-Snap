// OPTIONAL: run "npm run seed" to fill the database with demo citizens + reports
// (so the map and dashboard look alive for your demo). It will NOT touch admins.
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Citizen = require("./models/Citizen");
const Report = require("./models/Report");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/civic_snap";

// tiny grey placeholder picture so demo reports have a photo
const PLACEHOLDER =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="100%" height="100%" fill="#cfd8dc"/><text x="50%" y="50%" font-family="Arial" font-size="18" fill="#546e7a" text-anchor="middle">Demo photo</text></svg>'
  ).toString("base64");

const citizens = [
  { username: "priya", password: "priya123" },
  { username: "arjun", password: "arjun123" },
];

const reports = [
  { by: "priya", category: "Road & Potholes", severity: "High", address: "MG Road, near bus stop", lat: 12.9716, lng: 77.5946, text: "Large pothole near bus stop causing bike accidents after rain", status: "Reported" },
  { by: "arjun", category: "Waste Management", severity: "Medium", address: "Cubbon Park main gate", lat: 12.9755, lng: 77.6005, text: "Garbage bin overflowing outside the park for over a week", status: "In Progress" },
  { by: "priya", category: "Water-related Issues", severity: "High", address: "4th Cross Road", lat: 12.9688, lng: 77.5912, text: "Water pipe leak flooding half the street", status: "Acknowledged" },
  { by: "arjun", category: "Street Lighting", severity: "Low", address: "Church Street lane", lat: 12.9740, lng: 77.6010, text: "Streetlight not working, whole lane is dark at night", status: "Reported" },
];

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    await Citizen.deleteMany({ username: { $in: citizens.map((c) => c.username) } });
    for (const c of citizens) await Citizen.create({ username: c.username, password: await bcrypt.hash(c.password, 10) });

    await Report.deleteMany({ id: /^CS-DEMO/ });
    let n = 1;
    for (const r of reports) {
      await Report.create({
        id: "CS-DEMO" + n++,
        title: r.text.slice(0, 60),
        category: r.category,
        description: r.text,
        location: { address: r.address, lat: r.lat, lng: r.lng },
        photo: PLACEHOLDER,
        severity: r.severity,
        status: r.status,
        reportedBy: r.by,
      });
    }
    console.log("Demo data added. Citizen logins: priya/priya123 and arjun/arjun123");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err.message);
    process.exit(1);
  }
})();
