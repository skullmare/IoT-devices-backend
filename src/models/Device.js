const mongoose = require("mongoose");

const DeviceSchema = new mongoose.Schema(
  {
    imei: { type: String, required: true, unique: true, index: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: "DeviceTemplate", required: true },
    owners: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group", index: true }],
    lastSeenAt: { type: Date },
    lastTelemetry: { type: mongoose.Schema.Types.Mixed, default: null },
    isOn: { type: Boolean, required: true},
    mode: { type: String, required: true},
    name: { type: String, required: true},
  },
  { timestamps: true }
);

const Device = mongoose.model("Device", DeviceSchema);

module.exports = { Device };

