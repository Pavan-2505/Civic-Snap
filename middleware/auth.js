// Checks the "login pass" (JWT token) that the browser sends with each request.
//   requireAuth()          -> any logged-in user (citizen or admin)
//   requireAuth("admin")   -> admins only
//   requireAuth("citizen") -> citizens only
const jwt = require("jsonwebtoken");

function requireAuth(role) {
  return function (req, res, next) {
    const header = req.headers.authorization || ""; // "Bearer <token>"
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Please log in first." });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET); // throws if fake or expired
      if (role && payload.role !== role) {
        return res.status(403).json({ message: "You are not allowed to do this." });
      }
      req.user = payload; // { username, role }
      next();
    } catch (err) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }
  };
}

module.exports = requireAuth;
