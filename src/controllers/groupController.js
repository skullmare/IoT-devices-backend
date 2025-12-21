const { Group } = require("../models/Group");
const { Device } = require("../models/Device");
const { User } = require("../models/User");
const { isDeviceOwner } = require("../services/deviceAccessService");

async function listMyGroups(req, res) {
  const items = await Group.find({ members: req.user.id })
    .populate("owner", "telegramId username firstName lastName")
    .lean();
  return res.json({ items });
}

async function getGroup(req, res) {
  const { id } = req.params;
  const group = await Group.findById(id)
    .populate("owner", "telegramId username firstName lastName")
    .populate("members", "telegramId username firstName lastName role")
    .populate({
      path: "devices",
      populate: [
        { path: "template" },
        { path: "owners", select: "telegramId username firstName lastName" }
      ]
    })
    .lean();

  if (!group) return res.status(404).json({ error: "Not found" });
  const isMember = (group.members || []).some((m) => m._id.toString() === req.user.id);
  if (!isMember) return res.status(403).json({ error: "Forbidden" });

  const isOwner = group.owner?._id?.toString?.() === req.user.id;
  const devices = (group.devices || []).map((d) => {
    const owners = (d.owners || []).map((o) => o._id.toString());
    const canRemove = isOwner || owners.includes(req.user.id);
    return { ...d, canRemove };
  });

  return res.json({
    item: {
      ...group,
      isOwner,
      canManageMembers: isOwner,
      devices
    }
  });
}

async function createGroup(req, res) {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const group = await Group.create({
    name,
    owner: req.user.id,
    members: [req.user.id],
    devices: []
  });
  return res.status(201).json({ item: group });
}

async function addMember(req, res) {
  const { id } = req.params;
  const { telegramId } = req.body || {};
  if (!telegramId) return res.status(400).json({ error: "telegramId required" });

  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ error: "Not found" });
  if (group.owner.toString() !== req.user.id) return res.status(403).json({ error: "Only owner can manage members" });

  const user = await User.findOne({ telegramId: String(telegramId) }).select("_id").lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  const memberIds = group.members.map((m) => m.toString());
  if (!memberIds.includes(user._id.toString())) group.members.push(user._id);
  await group.save();
  return res.json({ ok: true });
}

async function removeMember(req, res) {
  const { id, memberId } = req.params;
  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ error: "Not found" });
  if (group.owner.toString() !== req.user.id) return res.status(403).json({ error: "Only owner can manage members" });

  if (group.owner.toString() === String(memberId)) {
    return res.status(400).json({ error: "Owner cannot be removed" });
  }

  group.members = group.members.filter((m) => m.toString() !== String(memberId));
  await group.save();
  return res.json({ ok: true });
}

async function addDeviceToGroup(req, res) {
  const { id } = req.params;
  const { deviceId } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });

  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ error: "Not found" });

  const isMember = group.members.map((m) => m.toString()).includes(req.user.id);
  if (!isMember) return res.status(403).json({ error: "Not a group member" });

  const owned = await isDeviceOwner(req.user.id, deviceId);
  if (!owned) return res.status(403).json({ error: "You can add only your devices" });

  const device = await Device.findById(deviceId);
  if (!device) return res.status(404).json({ error: "Device not found" });

  const groupDeviceIds = group.devices.map((d) => d.toString());
  if (!groupDeviceIds.includes(deviceId)) group.devices.push(deviceId);

  const deviceGroupIds = device.groups.map((g) => g.toString());
  if (!deviceGroupIds.includes(group._id.toString())) device.groups.push(group._id);

  await Promise.all([group.save(), device.save()]);
  return res.json({ ok: true });
}

async function removeDeviceFromGroup(req, res) {
  const { id, deviceId } = req.params;
  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ error: "Not found" });

  const isMember = group.members.map((m) => m.toString()).includes(req.user.id);
  if (!isMember) return res.status(403).json({ error: "Not a group member" });

  const isOwner = group.owner.toString() === req.user.id;
  const owned = await isDeviceOwner(req.user.id, deviceId);
  if (!isOwner && !owned) return res.status(403).json({ error: "Forbidden" });

  group.devices = group.devices.filter((d) => d.toString() !== String(deviceId));
  await group.save();

  await Device.updateOne({ _id: deviceId }, { $pull: { groups: group._id } });
  return res.json({ ok: true });
}

module.exports = {
  listMyGroups,
  getGroup,
  createGroup,
  addMember,
  removeMember,
  addDeviceToGroup,
  removeDeviceFromGroup
};
