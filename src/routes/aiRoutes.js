const express = require("express");
const { authRequired } = require("../middleware/auth");
const { suggestAndSend } = require("../controllers/aiController");

const router = express.Router();

router.post("/device-command", authRequired, suggestAndSend);

module.exports = router;

