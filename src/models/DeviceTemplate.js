const mongoose = require("mongoose");

const TemplateFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    unit: { type: String, default: "" },
    valueType: { type: String, enum: ["number", "string", "boolean"], default: "number" }
  },
  { _id: false }
);

const DeviceTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    fields: { type: [TemplateFieldSchema], default: [] },
    modes: { type: [String], required: true},
  },
  { timestamps: true }
);

const DeviceTemplate = mongoose.model("DeviceTemplate", DeviceTemplateSchema);

module.exports = { DeviceTemplate };

