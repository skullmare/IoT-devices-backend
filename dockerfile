# Используем официальный образ Node.js на базе Alpine (легковесный)
FROM node:20-alpine

# Создаем директорию приложения
WORKDIR /usr/src/app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код приложения
COPY . .

# Создаем пользователя node для безопасности
RUN chown -R node:node /usr/src/app
USER node

# Открываем порт, на котором работает приложение
EXPOSE 3000

# Команда для запуска приложения
CMD ["node", "src/index.js"]