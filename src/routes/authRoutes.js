const express = require("express");
const { telegramLogin, devLogin } = require("../controllers/authController");

const router = express.Router();

router.post("/telegram", telegramLogin);
router.post("/dev", devLogin);

module.exports = router;
