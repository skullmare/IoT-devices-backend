const express = require("express");
const { authRequired } = require("../middleware/auth");
const {
  listMyGroups,
  getGroup,
  createGroup,
  addMember,
  removeMember,
  addDeviceToGroup,
  removeDeviceFromGroup
} = require("../controllers/groupController");

const router = express.Router();

router.get("/", authRequired, listMyGroups);
router.get("/:id", authRequired, getGroup);
router.post("/", authRequired, createGroup);
router.post("/:id/members", authRequired, addMember);
router.delete("/:id/members/:memberId", authRequired, removeMember);
router.post("/:id/devices", authRequired, addDeviceToGroup);
router.delete("/:id/devices/:deviceId", authRequired, removeDeviceFromGroup);

module.exports = router;
