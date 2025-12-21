const mongoose = require("mongoose");

const TelemetrySchema = new mongoose.Schema(
  {
    device: { type: mongoose.Schema.Types.ObjectId, ref: "Device", required: true, index: true },
    imei: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    receivedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

const Telemetry = mongoose.model("Telemetry", TelemetrySchema);

module.exports = { Telemetry };

