const jwt = require("jsonwebtoken");

// Verifies the "Authorization: Bearer <jwt>" header on every /admin route
// (except login). Tokens are signed with SECRET and expire after 12h.
module.exports = function adminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "missing token" });
  }
  try {
    const payload = jwt.verify(token, process.env.SECRET);
    if (payload.role !== "manager") throw new Error("wrong role");
    req.admin = payload;
    next();
  } catch {
    // expired / tampered / wrong role — client should drop the token and re-login
    return res.status(401).json({ error: "invalid or expired token" });
  }
};
