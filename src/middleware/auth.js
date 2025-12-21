const jwt = require("jsonwebtoken");

const { env } = require("../config/env");
const { User } = require("../models/User");

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.sub);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    req.user = { id: user._id.toString(), role: user.role, telegramId: user.telegramId };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = { authRequired };

