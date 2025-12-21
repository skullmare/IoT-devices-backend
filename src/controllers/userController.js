const { User } = require("../models/User");

async function me(req, res) {
  const user = await User.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ error: "Not found" });
  return res.json({
    id: user._id.toString(),
    telegramId: user.telegramId,
    role: user.role,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName
  });
}

async function searchUsers(req, res) {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ items: [] });

  const items = await User.find({
    $or: [
      { telegramId: q },
      { username: new RegExp(q, "i") },
      { firstName: new RegExp(q, "i") },
      { lastName: new RegExp(q, "i") }
    ]
  })
    .select("_id telegramId username firstName lastName role")
    .limit(20)
    .lean();

  return res.json({
    items: items.map((u) => ({
      id: u._id.toString(),
      telegramId: u.telegramId,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role
    }))
  });
}

module.exports = { me, searchUsers };

