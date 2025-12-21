const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    devices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Device", index: true }]
  },
  { timestamps: true }
);

const Group = mongoose.model("Group", GroupSchema);

module.exports = { Group };

