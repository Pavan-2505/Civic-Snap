// CivicSnap server: serves the web pages (public/ folder) AND the API from one place.
// Open http://localhost:3000 after starting it.
require("dotenv").config(); // loads .env
require("dotenv").config({ path: "apikey.env" }); // also loads apikey.env

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const Admin = require("./models/Admin");
const Report = require("./models/Report");
const requireAuth = require("./middleware/auth");
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

// AI Route 1 (Citizen Photo Auto-Fill): Analyze uploaded issue photo and suggest category, description & severity
app.post("/api/analyze-issue", async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo) {
      return res.status(400).json({ error: "Photo is required for AI analysis" });
    }
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY in apikey.env" });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this civic issue photo and reply ONLY with a valid JSON object using this exact structure:
{
  "category": "one of: Road & Potholes, Waste Management, Drainage & Sanitation, Street Lighting, Public Infrastructure, Water-related Issues, Other",
  "description": "a clear, factual 1-2 sentence description under 250 characters",
  "severity": "one of: Low, Medium, High"
}`,
              },
              {
                type: "image_url",
                image_url: { url: photo },
              },
            ],
          },
        ],
      }),
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      throw new Error(data.error?.message || "Groq API request failed");
    }

    const result = JSON.parse(data.choices[0].message.content);
    res.json(result);
  } catch (err) {
    console.error("Groq AI Error:", err.message);
    res.status(500).json({ error: "AI could not analyze the photo right now." });
  }
});

// AI Route 2 (Admin Briefing): Summarize open civic issues and recommend department routing
app.post("/api/admin/ai-briefing", requireAuth("admin"), async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY in apikey.env" });
    }

    const openReports = await Report.find({ status: { $ne: "Resolved" } })
      .select("id category description location.address severity status createdAt")
      .sort({ createdAt: -1 })
      .limit(50);

    if (openReports.length === 0) {
      return res.json({
        summary: "All reported civic issues are currently resolved. No pending actions required.",
        topPriority: "None",
        recommendedActions: ["Continue routine monitoring of incoming citizen reports."],
      });
    }

    const compactList = openReports.map((r) => ({
      id: r.id,
      category: r.category,
      severity: r.severity,
      status: r.status,
      address: r.location?.address || "Unknown location",
      description: r.description,
      daysOpen: r.createdAt ? Math.floor((Date.now() - new Date(r.createdAt)) / 864e5) : 0,
    }));

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an operations analyst for CivicSnap, a civic issue portal in Bengaluru, India. Analyze open citizen reports and reply ONLY with a valid JSON object.",
          },
          {
            role: "user",
            content: `Analyze these ${compactList.length} open civic reports and return ONLY a JSON object with this exact structure:
{
  "summary": "2-sentence executive overview of current backlog and severity trends",
  "topPriority": "single most urgent issue ID, location, and reason in 1 short sentence",
  "recommendedActions": [
    "actionable bullet 1 mentioning specific locations/categories and relevant local agency (e.g. BBMP, BESCOM, BWSSB)",
    "actionable bullet 2",
    "actionable bullet 3"
  ]
}

Reports data:
${JSON.stringify(compactList)}`,
          },
        ],
      }),
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      throw new Error(data.error?.message || "Groq API request failed");
    }

    const briefing = JSON.parse(data.choices[0].message.content);
    res.json(briefing);
  } catch (err) {
    console.error("Admin AI Briefing Error:", err.message);
    res.status(500).json({ error: "Could not generate AI briefing right now." });
  }
});

// AI Route 3 (Citizen Helper): Answer resident questions about CivicSnap & Bengaluru civic services
app.post("/api/citizen/ask-ai", requireAuth("citizen"), async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: "Please enter a question." });
    }
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY in apikey.env" });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: [
          {
            role: "system",
            content:
              "You are the CivicSnap Assistant for residents in Bengaluru, India. Help citizens choose the right report category (Road & Potholes, Waste Management, Drainage & Sanitation, Street Lighting, Public Infrastructure, Water-related Issues, Other), understand report statuses (Reported -> Acknowledged -> In Progress -> Resolved), and know which local agency handles issues (BBMP for roads/garbage/drains, BESCOM for streetlights/power, BWSSB for water/sewage). Keep answers concise, practical, and under 80 words. Do not output thinking tags or markdown headings.",
          },
          {
            role: "user",
            content: String(question).trim().slice(0, 400),
          },
        ],
      }),
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      throw new Error(data.error?.message || "Groq API request failed");
    }

    // Strip any accidental <think> blocks if the model outputs them
    const reply = data.choices[0].message.content
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .trim();

    res.json({ reply });
  } catch (err) {
    console.error("Citizen AI Helper Error:", err.message);
    res.status(500).json({ error: "AI helper is unavailable right now." });
  }
});

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