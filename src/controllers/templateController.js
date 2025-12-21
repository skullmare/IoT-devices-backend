const { DeviceTemplate } = require("../models/DeviceTemplate");

async function listTemplates(req, res) {
  const items = await DeviceTemplate.find().sort({ createdAt: -1 }).lean();
  return res.json({ items });
}

async function createTemplate(req, res) {
  const { name, description, fields, image, modes } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  if (!Array.isArray(modes) || modes.length === 0) return res.status(400).json({ error: "modes required" });

  const tpl = await DeviceTemplate.create({
    name,
    image,
    description: description || "",
    fields: Array.isArray(fields) ? fields : [],
    modes
  });
  return res.status(201).json({ item: tpl });
}

async function updateTemplate(req, res) {
  const { id } = req.params;
  const { name, description, fields, image, modes } = req.body || {};
  const updateData = { name, description, fields, image };
  if (Array.isArray(modes) && modes.length > 0) updateData.modes = modes;

  const tpl = await DeviceTemplate.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  if (!tpl) return res.status(404).json({ error: "Not found" });
  return res.json({ item: tpl });
}

async function deleteTemplate(req, res) {
  const { id } = req.params;
  const tpl = await DeviceTemplate.findByIdAndDelete(id);
  if (!tpl) return res.status(404).json({ error: "Not found" });
  return res.json({ ok: true });
}

module.exports = { listTemplates, createTemplate, updateTemplate, deleteTemplate };

