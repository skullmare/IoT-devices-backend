const express = require("express");
const { authRequired } = require("../middleware/auth");
const { me, searchUsers } = require("../controllers/userController");

const router = express.Router();

router.get("/me", authRequired, me);
router.get("/search", authRequired, searchUsers);

module.exports = router;

