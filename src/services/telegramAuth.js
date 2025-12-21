const {
  validate,
  parse,
} = require('@telegram-apps/init-data-node');

/**
 * Проверка initData от Telegram Mini App
 * @param {string} initData
 * @param {string} botToken
 */
function verifyTelegramInitData(initData, botToken) {
  if (!initData || typeof initData !== 'string') {
    return { ok: false, error: 'initData required' };
  }

  try {
    // Проверка подписи и auth_date
    validate(initData, botToken);

    // Парсинг данных
    const data = parse(initData);

    return {
      ok: true,
      user: data.user ?? null,
      authDate: data.auth_date ? Number(data.auth_date) : null,
    };
  } catch (e) {
    return {
      ok: false,
      error: 'invalid signature',
    };
  }
}

module.exports = { verifyTelegramInitData };
