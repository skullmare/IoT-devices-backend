const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, unique: true, index: true },
    username: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    role: { type: String, enum: ["admin", "user"], default: "user", index: true },
    image: { type: String },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

module.exports = { User };

