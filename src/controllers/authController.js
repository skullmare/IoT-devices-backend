const jwt = require("jsonwebtoken");

const { env } = require("../config/env");
const { User } = require("../models/User");
const { verifyTelegramInitData } = require("../services/telegramAuth");

function isAdminTelegramId(telegramId) {
  const list = (env.ADMIN_TELEGRAM_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(String(telegramId));
}

async function telegramLogin(req, res) {
  const { initData } = req.body || {};

  const verified = verifyTelegramInitData(initData, env.BOT_TOKEN);
  if (!verified.ok) {
    return res.status(401).json({ error: "Invalid Telegram initData" });
  }

  if (!verified.user?.id) {
    return res.status(400).json({ error: "Telegram user missing" });
  }

  const telegramId = String(verified.user.id);

  const existing = await User.findOne({ telegramId });
  const role =
    existing?.role ||
    (isAdminTelegramId(telegramId) ? "admin" : "user");

  const user = await User.findOneAndUpdate(
    { telegramId },
    {
      $set: {
        telegramId,
        username: verified.user.username || "",
        firstName: verified.user.first_name || "",
        lastName: verified.user.last_name || "",
        role,
      },
    },
    { upsert: true, new: true }
  );

  const token = jwt.sign(
    { role: user.role },
    env.JWT_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );

  return res.json({
    token,
    user: {
      id: user._id.toString(),
      telegramId: user.telegramId,
      role: user.role,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });
}

async function devLogin(req, res) {
  if (env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  const { telegramId, role } = req.body || {};
  if (!telegramId) {
    return res.status(400).json({ error: "telegramId required" });
  }

  const safeRole = role === "admin" ? "admin" : "user";

  const user = await User.findOneAndUpdate(
    { telegramId: String(telegramId) },
    {
      $set: {
        telegramId: String(telegramId),
        role: safeRole,
      },
    },
    { upsert: true, new: true }
  );

  const token = jwt.sign(
    { role: user.role },
    env.JWT_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );

  return res.json({
    token,
    user: {
      id: user._id.toString(),
      telegramId: user.telegramId,
      role: user.role,
    },
  });
}

module.exports = { telegramLogin, devLogin };
