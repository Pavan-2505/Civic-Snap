// All report endpoints.
//   GET    /api/reports        -> ALL reports            (any logged-in user)  -> Community Map + Admin dashboard
//   GET    /api/reports/mine   -> ONLY my reports        (citizen)             -> My Reports page
//   POST   /api/reports        -> create a report        (citizen)             -> Add Issue page
//   PUT    /api/reports/:id    -> update status/note...  (admin)               -> Admin dashboard
//   DELETE /api/reports/:id    -> delete a report        (admin)               -> Admin dashboard
const express = require("express");
const Report = require("../models/Report");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// Old category names the first version of the form used -> new official names
const LEGACY_CATEGORY = {
  Pothole: "Road & Potholes",
  Garbage: "Waste Management",
  Streetlight: "Street Lighting",
};

router.get("/", requireAuth(), async (req, res) => {
  try {
    res.json(await Report.find().sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// NOTE: this must stay ABOVE "/:id" routes, otherwise "mine" would be treated as an id
router.get("/mine", requireAuth("citizen"), async (req, res) => {
  try {
    // identity comes from the login token, so a citizen can only ever see their own reports
    res.json(await Report.find({ reportedBy: req.user.username }).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", requireAuth("citizen"), async (req, res) => {
  try {
    const { category, description, location, severity, photo } = req.body;

    const address = String((location && location.address) || (typeof location === "string" ? location : "")).trim();
    const lat = location && location.lat != null ? Number(location.lat) : null;
    const lng = location && location.lng != null ? Number(location.lng) : null;

    if (!category || !description || !address || !photo) {
      return res.status(400).json({ message: "Please provide category, description, location and a photo." });
    }

    const report = await Report.create({
      id: "CS-" + Date.now(),
      title: String(description).trim().slice(0, 60),
      category: LEGACY_CATEGORY[category] || category,
      description: String(description).trim(),
      location: { address, lat, lng },
      severity: severity || "Medium",
      photo,
      status: "Reported",
      reportedBy: req.user.username, // taken from the token - cannot be faked from the browser
    });

    res.status(201).json({ message: "Report saved successfully", report });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", requireAuth("admin"), async (req, res) => {
  try {
    // only these fields may be changed by the admin
    const updates = {};
    ["status", "category", "adminNote", "afterPhoto"].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const report = await Report.findOneAndUpdate({ id: req.params.id }, updates, {
      new: true,
      runValidators: true,
    });
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json(report);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", requireAuth("admin"), async (req, res) => {
  try {
    const report = await Report.findOneAndDelete({ id: req.params.id });
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json({ message: "Report deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
