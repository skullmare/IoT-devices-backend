const mqtt = require("mqtt");
const { env } = require("../config/env");
const { Device } = require("../models/Device");
const { DeviceTemplate } = require("../models/DeviceTemplate");

const simulators = new Map(); // deviceId -> { client, interval, lastValues }

/**
 * Генерируем новое значение для поля шаблона на основе предыдущего
 */
function generateFieldValue(field, lastValue) {
  // Общая функция для получения значения в диапазоне 10-30
  const getRandomInRange = () => 10 + Math.random() * 20; // 10-30
  
  switch (field.valueType) {
    case "number": {
      // Получаем предыдущее значение или случайное в диапазоне
      const prev = typeof lastValue === "number" 
        ? Math.max(10, Math.min(30, lastValue)) // Ограничиваем предыдущее значение
        : getRandomInRange();
      
      const delta = Math.random() < 0.5 ? -1 : 1;
      const newValue = prev + delta;
      
      // Ограничиваем результат диапазоном 10-30
      const clampedValue = Math.max(10, Math.min(30, newValue));
      return +(clampedValue).toFixed(2);
    }
    
    case "boolean":
      return Math.random() > 0.5;
      
    case "string": {
      // Извлекаем числовую часть из предыдущего значения или генерируем новое
      let numericValue;
      if (typeof lastValue === "string") {
        const match = lastValue.match(/\d+/);
        numericValue = match ? parseInt(match[0]) : getRandomInRange();
        // Ограничиваем предыдущее значение диапазоном
        numericValue = Math.max(10, Math.min(30, numericValue));
      } else {
        numericValue = getRandomInRange();
      }
      
      const delta = Math.random() < 0.5 ? -1 : 1;
      const newNumericValue = numericValue + delta;
      
      // Ограничиваем результат диапазоном 10-30
      const clampedNumericValue = Math.max(10, Math.min(30, newNumericValue));
      return `value_${Math.round(clampedNumericValue)}`;
    }
    
    default:
      return null;
  }
}

/**
 * Формируем payload на основе полей шаблона
 */
function generatePayload(templateFields, lastValues) {
  const payload = {};
  const newLastValues = {};

  for (const field of templateFields) {
    const newValue = generateFieldValue(field, lastValues[field.key]);

    payload[field.key] = {
      value: newValue,
      unit: field.unit || null,
      label: field.label,
      type: field.valueType,
    };

    newLastValues[field.key] = newValue;
  }

  payload.ts = new Date().toISOString();
  return { payload, newLastValues };
}

/**
 * Запускаем симулятор для устройства
 */
async function startSimulator(deviceId) {
  if (simulators.has(deviceId)) {
    console.log("Simulator already running for", deviceId);
    return;
  }

  const device = await Device.findById(deviceId).populate("template").lean();
  if (!device) throw new Error("Device not found");
  if (!device.template) throw new Error("Device has no template");

  const templateFields = device.template.fields || [];
  const client = mqtt.connect(`mqtts://${env.HIVEMQ_HOST}`, {
    username: env.HIVEMQ_USERNAME,
    password: env.HIVEMQ_PASSWORD,
  });

  let lastValues = {}; // хранит последние значения для плавного изменения

  const interval = setInterval(() => {
    const { payload, newLastValues } = generatePayload(templateFields, lastValues);
    lastValues = newLastValues;
    const topic = `devices/${device.imei}/telemetry`;
    client.publish(topic, JSON.stringify(payload));
  }, Number(env.INTERVAL_MS || 2000));

  simulators.set(deviceId, { client, interval, lastValues });

  console.log("Simulator started for", deviceId);
}

function stopSimulator(deviceId) {
  const sim = simulators.get(deviceId);
  if (!sim) return;

  clearInterval(sim.interval);
  sim.client.end(true);
  simulators.delete(deviceId);

  console.log("Simulator stopped for", deviceId);
}

module.exports = { startSimulator, stopSimulator };
