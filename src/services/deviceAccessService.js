const { Group } = require("../models/Group");
const { Device } = require("../models/Device");

async function getUserGroupIds(userId) {
  const groups = await Group.find({ members: userId }).select("_id").lean();
  return groups.map((g) => g._id);
}

async function canAccessDevice(userId, deviceId) {
  const groupIds = await getUserGroupIds(userId);
  const exists = await Device.exists({
    _id: deviceId,
    $or: [{ owners: userId }, { groups: { $in: groupIds } }]
  });
  return Boolean(exists);
}

async function isDeviceOwner(userId, deviceId) {
  const exists = await Device.exists({ _id: deviceId, owners: userId });
  return Boolean(exists);
}

module.exports = { canAccessDevice, isDeviceOwner, getUserGroupIds };

