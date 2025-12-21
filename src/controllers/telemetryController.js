const { Telemetry } = require("../models/Telemetry");
const { canAccessDevice } = require("../services/deviceAccessService");
const { Device } = require("../models/Device");

async function getLatestTelemetry(req, res) {
  try {
    const { deviceId, imei } = req.query;
    const userId = req.user.id;
    
    // Проверяем, что передан хотя бы один параметр для фильтрации
    if (!deviceId && !imei) {
      return res.status(400).json({ 
        success: false, 
        error: 'Either deviceId or imei is required' 
      });
    }
    
    let device = null;
    let deviceImei = imei;
    
    // Если передан deviceId, проверяем права доступа и получаем IMEI устройства
    if (deviceId) {
      // Проверяем доступ пользователя к устройству
      const hasAccess = await canAccessDevice(userId, deviceId);
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          error: 'Access denied to this device' 
        });
      }
      
      // Получаем устройство, чтобы узнать его IMEI
      device = await Device.findById(deviceId).select('imei').lean();
      if (!device) {
        return res.status(404).json({ 
          success: false, 
          error: 'Device not found' 
        });
      }
      
      deviceImei = device.imei;
    } else {
      // Если передан только IMEI, нужно найти устройство с этим IMEI
      // и проверить, есть ли у пользователя к нему доступ
      const deviceWithImei = await Device.findOne({ imei: deviceImei }).select('_id').lean();
      
      if (deviceWithImei) {
        // Проверяем доступ пользователя к найденному устройству
        const hasAccess = await canAccessDevice(userId, deviceWithImei._id);
        if (!hasAccess) {
          return res.status(403).json({ 
            success: false, 
            error: 'Access denied to device with this IMEI' 
          });
        }
      } else {
        // Если устройство не найдено в системе, но есть телеметрия с таким IMEI,
        // можно либо запретить доступ, либо разрешить просмотр (зависит от бизнес-логики)
        // Здесь запрещаем доступ для безопасности
        return res.status(403).json({ 
          success: false, 
          error: 'No device found with this IMEI or access denied' 
        });
      }
    }
    
    // Создаем фильтр на основе IMEI
    const filter = { imei: deviceImei };
    
    // Получаем 100 последних записей
    const items = await Telemetry.find(filter)
      .sort({ receivedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();
    
    return res.json({ 
      success: true,
      count: items.length,
      deviceId: deviceId || null,
      imei: deviceImei,
      items 
    });
  } catch (error) {
    console.error('Error fetching telemetry:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

async function getLatestTelemetryByDevice(req, res) {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;
    
    if (!deviceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Device ID is required' 
      });
    }
    
    // Проверяем доступ пользователя к устройству
    const hasAccess = await canAccessDevice(userId, deviceId);
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied to this device' 
      });
    }
    
    // Получаем устройство, чтобы узнать его IMEI
    const device = await Device.findById(deviceId).select('imei name').lean();
    if (!device) {
      return res.status(404).json({ 
        success: false, 
        error: 'Device not found' 
      });
    }
    
    // Получаем 100 последних записей для конкретного устройства по IMEI
    const items = await Telemetry.find({ imei: device.imei })
      .sort({ receivedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();
    
    return res.json({ 
      success: true,
      count: items.length,
      device: {
        id: deviceId,
        name: device.name,
        imei: device.imei
      },
      items 
    });
  } catch (error) {
    console.error('Error fetching device telemetry:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

async function getLatestTelemetryByImei(req, res) {
  try {
    const { imei } = req.params;
    const userId = req.user.id;
    
    if (!imei) {
      return res.status(400).json({ 
        success: false, 
        error: 'IMEI is required' 
      });
    }
    
    // Находим устройство по IMEI
    const device = await Device.findOne({ imei }).select('_id name').lean();
    
    if (!device) {
      // Если устройство не найдено, проверяем, есть ли вообще телеметрия с таким IMEI
      const telemetryExists = await Telemetry.exists({ imei });
      
      if (!telemetryExists) {
        return res.status(404).json({ 
          success: false, 
          error: 'No telemetry data found for this IMEI' 
        });
      }
      
      // Если телеметрия есть, но устройство не зарегистрировано,
      // можно либо запретить доступ, либо разрешить (зависит от бизнес-логики)
      // Здесь запрещаем для безопасности
      return res.status(403).json({ 
        success: false, 
        error: 'Device not registered or access denied' 
      });
    }
    
    // Проверяем доступ пользователя к устройству
    const hasAccess = await canAccessDevice(userId, device._id);
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied to device with this IMEI' 
      });
    }
    
    // Получаем 100 последних записей для конкретного IMEI
    const items = await Telemetry.find({ imei })
      .sort({ receivedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();
    
    return res.json({ 
      success: true,
      count: items.length,
      device: {
        id: device._id,
        name: device.name,
        imei: imei
      },
      items 
    });
  } catch (error) {
    console.error('Error fetching IMEI telemetry:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

// Дополнительная функция для получения телеметрии с поддержкой нескольких устройств
async function getTelemetryForMultipleDevices(req, res) {
  try {
    const userId = req.user.id;
    const { deviceIds } = req.body; // Массив ID устройств
    const limitPerDevice = req.query.limit || 10; // Лимит записей на устройство
    
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Array of device IDs is required' 
      });
    }
    
    if (deviceIds.length > 20) {
      return res.status(400).json({ 
        success: false, 
        error: 'Maximum 20 devices allowed per request' 
      });
    }
    
    const results = [];
    
    for (const deviceId of deviceIds) {
      // Проверяем доступ к каждому устройству
      const hasAccess = await canAccessDevice(userId, deviceId);
      if (!hasAccess) {
        continue; // Пропускаем устройства без доступа
      }
      
      const device = await Device.findById(deviceId).select('imei name').lean();
      if (!device) {
        continue;
      }
      
      // Получаем телеметрию для устройства
      const telemetry = await Telemetry.find({ imei: device.imei })
        .sort({ receivedAt: -1, createdAt: -1 })
        .limit(parseInt(limitPerDevice))
        .lean();
      
      results.push({
        device: {
          id: deviceId,
          name: device.name,
          imei: device.imei
        },
        telemetry: telemetry
      });
    }
    
    return res.json({ 
      success: true,
      count: results.length,
      items: results 
    });
  } catch (error) {
    console.error('Error fetching multiple devices telemetry:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

module.exports = { 
  getLatestTelemetry, 
  getLatestTelemetryByDevice,
  getLatestTelemetryByImei,
  getTelemetryForMultipleDevices
};