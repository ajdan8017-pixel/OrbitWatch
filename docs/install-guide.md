# Руководство по установке и системному администрированию OrbitWatch

**Версия документа:** 1.0.0  
**Дата:** 07 октября 2026 г.  
**Проект:** «OrbitWatch — веб-приложение для 3D-визуализации космических миссий и отслеживания спутников в реальном времени»  
**Инженер по развёртыванию (DevOps / Release):** Шинин Чаян (гр. ИСП-401)  
**Учебное заведение:** ГБПОУ НСО «НЭК»  

---

## 1. Системные требования

### 1.1. Аппаратные требования к серверу / рабочей станции
- **Процессор (CPU):** 2 ядра с частотой от 1.8 ГГц (x86_64 или ARM64).
- **Оперативная память (RAM):** не менее 2 ГБ (рекомендуется 4 ГБ при компиляции Vite).
- **Дисковое пространство:** 500 МБ свободного места на SSD/HDD.
- **Видеокарта (GPU):** поддержка WebGL 2.0 / OpenGL ES 3.0 (для клиентского запуска 3D-сцены).

### 1.2. Программное обеспечение
- **Операционная система:** Linux (Ubuntu 20.04+, Debian 11+, Astra Linux, РЕД ОС), macOS 12+, Windows 10/11 (PowerShell или WSL2).
- **Среда выполнения:** **Node.js** версии **v18.0.0+** (рекомендуется стабильная **v20.x LTS**).
- **Пакетный менеджер:** `npm` версии 9.0+, `pnpm` или `yarn`.
- **Система контроля версий:** `Git` версии 2.30+.

---

## 2. Пошаговая установка из исходного кода

### Шаг 1. Клонирование репозитория
Откройте терминал и выполните клонирование проекта:

```bash
git clone https://github.com/chayan-shinin/orbitwatch.git
cd orbitwatch
```

### Шаг 2. Установка зависимостей
Установите все производственные и девелоперские пакеты:

```bash
npm install
```

> **Примечание:** Если менеджер пакетов сообщает о конфликтах peer-зависимостей сборщика, используйте флаг совместимости:
> ```bash
> npm install --legacy-peer-deps
> ```

### Шаг 3. Конфигурация переменных окружения
Скопируйте шаблон конфигурации в рабочий файл `.env`:

```bash
cp .env.example .env
```

Параметры файла `.env`:
```env
# Порт fullstack-сервера (по умолчанию 3000)
PORT=3000

# Режим окружения (development / production)
NODE_ENV=development

# (Опционально) API-ключ Gemini для генерации аналитических справок по спутникам
GEMINI_API_KEY=
```
*Примечание: Приложение полностью автономно и способно функционировать без указания внешних API-ключей.*

---

## 3. Режимы запуска и сценарии эксплуатации

| Команда | Назначение | Порт / URL |
|---|---|---|
| `npm run dev` | **Основной режим разработки:** запуск Express-бэкенда с вмонтированным Vite HMR | `http://localhost:3000` |
| `npm run dev:vite` | Запуск только клиентского Vite-сервера (без бэкенд-прокси CelesTrak) | `http://localhost:5173` |
| `npm test` | Запуск набора из **22 автоматических unit-тестов** Vitest | Консольный вывод |
| `npm run lint` | Статическая проверка строгой типизации TypeScript (`tsc --noEmit`) | Консольный вывод |
| `npm run build` | Компиляция клиентского SPA в `dist/` и бандлинг сервера в `dist/server.cjs` | Папка `dist/` |
| `npm run start` | Запуск собранного оптимизированного продакшен-сервера | `http://localhost:3000` |
| `npm run preview` | Локальный просмотр скомпилированного бандла Vite | `http://localhost:4173` |
| `npm run clean` | Очистка сборочных артефактов | — |

### Быстрый запуск для локальной демонстрации:
```bash
npm run dev
```
После появления сообщения `Server running on http://localhost:3000` откройте указанный адрес в браузере.

---

## 4. Развёртывание в производственной среде (Production Deployment)

### Вариант 1. Запуск через менеджер процессов PM2 (Linux/Ubuntu)
Для непрерывной работы приложения в фоновом режиме на сервере:

```bash
# 1. Установка PM2 глобально
npm install -g pm2

# 2. Сборка проекта
npm run build

# 3. Запуск сервиса под управлением PM2
pm2 start dist/server.cjs --name "orbitwatch" -i max

# 4. Настройка автозапуска при перезагрузке сервера
pm2 startup
pm2 save
```

---

### Вариант 2. Конфигурация веб-сервера Nginx (Reverse Proxy + SSL)
Пример конфигурационного блока `/etc/nginx/sites-available/orbitwatch`:

```nginx
server {
    listen 80;
    server_name orbitwatch.local;

    # Сжатие статики
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

### Вариант 3. Развёртывание в Docker контейнере
Для контейнеризованного запуска создайте файл `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

Сборка и запуск контейнера:
```bash
docker build -t orbitwatch:v1.0 .
docker run -d -p 3000:3000 --name orbitwatch-app orbitwatch:v1.0
```

---

## 5. Диагностика и устранение неполадок (Troubleshooting)

### Проблема 1: Ошибка `SyntaxError: Cannot find module 'node:util' styleText`
- **Причина:** Версия Node.js на компьютере ниже v20.12.0 (например, Node.js 18.x).
- **Решение:** В проекте зафиксирована совместимая версия пакета `tsx@4.19.2`. Если ошибка возникает, обновите зависимость:
  ```bash
  npm install -D tsx@4.19.2 --legacy-peer-deps
  ```

### Проблема 2: Ошибка CelesTrak `HTTP 403 Forbidden` при загрузке Starlink
- **Причина:** Внешний сервис блокирует частые прямые запросы по IP или User-Agent.
- **Решение:** В модуле `server.ts` и `src/services/tleService.ts` реализован автоматический fallback. Сервер возвращает закешированные данные либо отдаёт встроенный каталог `FALLBACK_TLE_DATA`. Ручных действий не требуется.

### Проблема 3: Ошибка `EADDRINUSE: address already in use :::3000`
- **Причина:** Порт 3000 занят другим процессом.
- **Решение:** Завершите занявший процесс либо укажите другой порт:
  ```bash
  PORT=3001 npm run dev
  ```

### Проблема 4: Сообщение «WebGL context lost» на старых компьютерах
- **Причина:** Нехватка видеопамяти при параллельной работе тяжелых 3D-приложений.
- **Решение:** Закройте ресурсоемкие вкладки, обновите драйвер видеокарты или отключите эффект Bloom в панели OrbitWatch.

---

## 6. Проверка корректности установки (Sanity Check)

После развертывания запустите набор тестов для верификации целостности ядра:

```bash
npm test
```
**Ожидаемый результат:** `3 passed (3), 22 passed (22), Duration < 1.5s`.
