const { Device } = require("../models/Device");
const { canAccessDevice } = require("../services/deviceAccessService");
const { generateDeviceCommand } = require("../services/aiService");
const { publishCommand } = require("../services/mqttService");

async function suggestAndSend(req, res) {
  const { deviceId, prompt } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  const allowed = await canAccessDevice(req.user.id, deviceId);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const device = await Device.findById(deviceId).populate("template").lean();
  if (!device) return res.status(404).json({ error: "Not found" });

  const ai = await generateDeviceCommand({
    template: device.template,
    lastTelemetry: device.lastTelemetry,
    userPrompt: prompt
  });

  if (ai?.command) await publishCommand(device.imei, ai.command);

  return res.json({ item: ai });
}

module.exports = { suggestAndSend };

