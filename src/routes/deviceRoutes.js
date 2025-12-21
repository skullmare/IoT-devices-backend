const express = require("express");
const { authRequired } = require("../middleware/auth");
const {
  listMyDevices,
  registerDevice,
  getDevice,
  sendCommand,
  listDeviceGroups
} = require("../controllers/deviceController");

const router = express.Router();

router.get("/", authRequired, listMyDevices);
router.post("/register", authRequired, registerDevice);
router.get("/:id", authRequired, getDevice);
router.get("/:id/groups", authRequired, listDeviceGroups);
router.post("/:id/command", authRequired, sendCommand);

module.exports = router;

