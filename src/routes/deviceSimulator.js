const router = require("express").Router();
const { Device } = require("../models/Device");
const {
  startSimulator,
  stopSimulator,
} = require("../services/deviceSimulatorService");

router.post("/:id/start", async (req, res) => {
  const device = await Device.findById(req.params.id).lean();
  if (!device) return res.status(404).json({ error: "Not found" });

  startSimulator(device._id.toString(), device.imei);
  res.json({ ok: true });
});

router.post("/:id/stop", async (req, res) => {
  stopSimulator(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
