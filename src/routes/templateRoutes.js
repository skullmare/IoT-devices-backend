const express = require("express");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
} = require("../controllers/templateController");

const router = express.Router();

router.get("/", authRequired, listTemplates);
router.post("/", authRequired, requireRole("admin"), createTemplate);
router.put("/:id", authRequired, requireRole("admin"), updateTemplate);
router.delete("/:id", authRequired, requireRole("admin"), deleteTemplate);

module.exports = router;

