const { Device } = require("../models/Device");
const { DeviceTemplate } = require("../models/DeviceTemplate");
const { Group } = require("../models/Group");
const { publishCommand } = require("../services/mqttService");
const { canAccessDevice, getUserGroupIds } = require("../services/deviceAccessService");

async function listMyDevices(req, res) {
  const userId = req.user.id;
  const groupIds = await getUserGroupIds(userId);

  const items = await Device.find({
    $or: [{ owners: userId }, { groups: { $in: groupIds } }]
  })
    .populate("template")
    .lean();

  return res.json({
    items: items.map((d) => ({
      _id: d._id,
      imei: d.imei,
      name: d.name,
      isOn: d.isOn,
      mode: d.mode,
      availableModes: d.template?.modes || [],
      template: {
        _id: d.template?._id,
        name: d.template?.name,
        description: d.template?.description,
        image: d.template?.image
      },
      isOwner: (d.owners || []).map((o) => o.toString()).includes(userId)
    }))
  });
}

async function registerDevice(req, res) {
  const userId = req.user.id;
  const { templateId, imei, name } = req.body || {};
  const imeiNorm = String(imei || "").trim();

  if (!templateId) return res.status(400).json({ error: "templateId required" });
  if (!imeiNorm) return res.status(400).json({ error: "imei required" });
  if (!name) return res.status(400).json({ error: "name required" });

  const tpl = await DeviceTemplate.findById(templateId).lean();
  if (!tpl) return res.status(404).json({ error: "Template not found" });

  const existing = await Device.findOne({ imei: imeiNorm });
  if (existing) {
    if (!existing.owners.map((o) => o.toString()).includes(userId)) {
      existing.owners.push(userId);
      await existing.save();
    }
    const populated = await Device.findById(existing._id).populate("template").lean();
    return res.json({ item: populated, created: false });
  }

  const created = await Device.create({
    imei: imeiNorm,
    name,                // сохраняем имя
    template: tpl._id,
    owners: [userId],
    groups: [],
    mode: tpl.modes[0] || "",
    isOn: false
  });

  const populated = await Device.findById(created._id).populate("template").lean();
  return res.status(201).json({ item: populated, created: true });
}

async function getDevice(req, res) {
  const { id } = req.params;
  const allowed = await canAccessDevice(req.user.id, id);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const item = await Device.findById(id).populate("template").lean();
  if (!item) return res.status(404).json({ error: "Not found" });

  const response = {
    _id: item._id,
    imei: item.imei,
    name: item.name,
    isOn: item.isOn,
    mode: item.mode,
    availableModes: item.template?.modes || [],
    template: {
      _id: item.template?._id,
      name: item.template?.name,
      description: item.template?.description,
      image: item.template?.image
    },
    owners: item.owners
  };

  return res.json({ item: response });
}

async function sendCommand(req, res) {
  const { id } = req.params;
  const allowed = await canAccessDevice(req.user.id, id);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const device = await Device.findById(id).lean();
  if (!device) return res.status(404).json({ error: "Not found" });

  const { command } = req.body || {};
  if (!command || typeof command !== "object") return res.status(400).json({ error: "command required" });

  const updateData = {};

  // обновляем mode, если передан
  if (command.mode) {
    const tpl = await DeviceTemplate.findById(device.template).lean();
    if (!tpl.modes.includes(command.mode)) {
      return res.status(400).json({ error: "Invalid mode" });
    }
    updateData.mode = command.mode;
  }

  // обновляем isOn, если передан
  if (typeof command.isOn === "boolean") {
    updateData.isOn = command.isOn;
  }

  // обновляем имя, если передано
  if (typeof command.name === "string" && command.name.trim() !== "") {
    updateData.name = command.name.trim();
  }

  // если есть что обновлять, делаем update
  if (Object.keys(updateData).length > 0) {
    await Device.findByIdAndUpdate(id, updateData);
  }

  await publishCommand(device.imei, command);

  // возвращаем обновлённый объект устройства
  const updatedDevice = await Device.findById(id).populate("template").lean();
  const response = {
    _id: updatedDevice._id,
    imei: updatedDevice.imei,
    name: updatedDevice.name,
    isOn: updatedDevice.isOn,
    mode: updatedDevice.mode,
    availableModes: updatedDevice.template?.modes || [],
    template: {
      _id: updatedDevice.template?._id,
      name: updatedDevice.template?.name,
      description: updatedDevice.template?.description,
      image: updatedDevice.template?.image
    },
    owners: updatedDevice.owners
  };

  return res.json({ ok: true, item: response });
}

async function listDeviceGroups(req, res) {
  const { id } = req.params;
  const allowed = await canAccessDevice(req.user.id, id);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const groups = await Group.find({ devices: id }).select("_id name owner").lean();
  return res.json({ items: groups });
}

module.exports = { listMyDevices, registerDevice, getDevice, sendCommand, listDeviceGroups };
