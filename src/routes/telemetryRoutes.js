const express = require("express");
const { authRequired } = require("../middleware/auth");
const {
  getLatestTelemetry, 
  getLatestTelemetryByDevice,
  getLatestTelemetryByImei,
  getTelemetryForMultipleDevices
} = require("../controllers/telemetryController");

const router = express.Router();

// Получение телеметрии с фильтрацией по deviceId или imei
router.get("/latest", authRequired, getLatestTelemetry);

// Получение телеметрии для конкретного устройства
router.get("/device/:deviceId/latest", authRequired, getLatestTelemetryByDevice);

// Получение телеметрии по IMEI
router.get("/imei/:imei/latest", authRequired, getLatestTelemetryByImei);

// Получение телеметрии для нескольких устройств
router.post("/bulk", authRequired, getTelemetryForMultipleDevices);

module.exports = router;