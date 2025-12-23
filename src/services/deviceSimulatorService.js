const mqtt = require("mqtt");
const { env } = require("../config/env");
const { Device } = require("../models/Device");
const { DeviceTemplate } = require("../models/DeviceTemplate");

const simulators = new Map(); // deviceId -> { client, interval, lastValues }

// База данных русских предложений для разных типов событий
const RUSSIAN_SENTENCES = {
  // События с участием детей
  children: [
    "ребенок разлил сок на стол",
    "малыш уронил игрушку на пол",
    "дети играют в мяч в комнате",
    "ребенок открыл холодильник",
    "малыш пытается дотянуться до полки",
    "дети рисуют на бумаге",
    "ребенок спит на диване",
    "малыш смотрит мультфильмы",
    "дети строят замок из кубиков",
    "ребенок помогает накрывать на стол"
  ],
  
  // События с животными
  animals: [
    "кошка пробежала через комнату",
    "собака спит на ковре",
    "кошка запрыгнула на подоконник",
    "собака просит гулять у двери",
    "кот играет с клубком ниток",
    "собака лает на прохожего за окном",
    "кошка умывается на диване",
    "питомец пьет воду из миски",
    "кот точит когти о когтеточку",
    "собака принесла поводок в зубах"
  ],
  
  // Бытовые события
  household: [
    "микроволновка закончила разогрев",
    "стиральная машина завершила цикл",
    "посудомоечная машина работает",
    "кондиционер включился на охлаждение",
    "чайник автоматически выключился",
    "холодильник издает обычный рабочий шум",
    "робот-пылесос начал уборку",
    "свет в прихожей включился",
    "жалюзи автоматически закрылись",
    "умный замок зафиксировал открытие двери"
  ],
  
  // События на кухне
  kitchen: [
    "на плите кипит вода в чайнике",
    "в духовке готовится пирог",
    "тостер поджарил хлеб",
    "кофеварка приготовила кофе",
    "в холодильнике замигал индикатор температуры",
    "на стол поставили тарелку с едой",
    "кто-то наливает воду в стакан",
    "дверца холодильника была открыта более 30 секунд",
    "посудомоечная машина подает сигнал об окончании",
    "миксер работает на средней скорости"
  ],
  
  // Общие события безопасности
  security: [
    "движение обнаружено в коридоре",
    "дверь на балкон была открыта",
    "окно в гостиной приоткрыто",
    "сработал датчик задымления на кухне",
    "обнаружено движение во дворе",
    "система перешла в режим охраны",
    "камера зафиксировала активность ночью",
    "датчик протечки воды передает нормальные показания",
    "умная розетка сообщает о потреблении электроэнергии",
    "температурный датчик показывает комфортные значения"
  ],
  
  // События в гостиной
  livingRoom: [
    "телевизор включен на новостном канале",
    "на диване кто-то сидит и читает",
    "жалюзи регулируют уровень освещенности",
    "музыкальный центр воспроизводит классическую музыку",
    "на журнальном столике лежит пульт",
    "комнатное растение полито",
    "камин работает в декоративном режиме",
    "шторы автоматически закрываются",
    "идет трансляция футбольного матча",
    "семья собралась для просмотра фильма"
  ]
};

// Случайная категория для каждого строкового поля
const fieldCategories = {};

/**
 * Получаем случайное предложение для строкового поля
 */
function getRandomRussianSentence(fieldKey) {
  // Определяем категорию для этого поля (один раз при инициализации)
  if (!fieldCategories[fieldKey]) {
    const categories = Object.keys(RUSSIAN_SENTENCES);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    fieldCategories[fieldKey] = randomCategory;
  }
  
  const category = fieldCategories[fieldKey];
  const sentences = RUSSIAN_SENTENCES[category];
  return sentences[Math.floor(Math.random() * sentences.length)];
}

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
      // С вероятностью 30% генерируем новое событие, иначе повторяем предыдущее
      if (lastValue && Math.random() < 0.7) {
        return lastValue;
      }
      
      // Генерируем новое предложение
      return getRandomRussianSentence(field.key);
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