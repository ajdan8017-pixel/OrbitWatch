# OrbitWatch

Веб-приложение для визуализации космических миссий и отслеживания спутников Земли в реальном времени.

OrbitWatch показывает интерактивный 3D-глобус Земли с движущимися спутниками. Данные подгружаются с открытого источника CelesTrak в формате TLE, расчёт положения выполняется по модели SGP4 через библиотеку satellite.js, отрисовка — на Three.js.

## Возможности

- 3D-глобус Земли с низкополигональной геометрией
- Отображение спутников на орбитах в реальном времени
- Расчёт положения через satellite.js (модель SGP4)
- Клик по спутнику — карточка с данными (высота, скорость, NORAD ID, координаты подспутниковой точки, наклонение, период, эксцентриситет)
- Фильтры по группам: МКС, Starlink, GPS, Погода и ДЗЗ, Наука и телескопы
- Поиск по названию и NORAD ID
- Слежение камерой за выбранным спутником
- Управление временем: пауза, ускорение (1x, 5x, 15x, 60x, 300x), синхронизация с текущим временем
- Кэширование TLE-данных на сервере (2 часа) и отдача последних данных при недоступности CelesTrak

## Стек

Клиент:
- React 19 + TypeScript
- Three.js — 3D-графика
- satellite.js — расчёт орбит (SGP4)
- Tailwind CSS 4 — стилизация
- Vite — сборка
- Lucide React — иконки
- Motion — анимации

Сервер:
- Node.js + Express
- TypeScript
- In-memory кэш (2 часа)
- Vite middleware в dev-режиме

Данные:
- CelesTrak — TLE-данные спутников
- SpaceX API — информация о запусках (Фаза 2)
- Open Notify — астронавты на орбите (Фаза 2)

## Структура проекта

orbitwatch/
├── docs/                    # документация и диаграммы
├── src/
│   ├── components/          # React-компоненты
│   ├── services/            # бизнес-логика (расчёты, API)
│   ├── types/               # TypeScript-типы
│   ├── utils/               # утилиты
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── data/                    # статические данные
├── tests/                   # unit-тесты
├── server.ts                # Express-сервер (прокси + кэш)
├── .editorconfig
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md

## Запуск локально

Требования: Node.js 18+ и Bun (или npm).

1. Установить зависимости:

bun install

или

npm install

2. (Опционально) Создать .env.local на основе .env.example, если планируется использовать Gemini API или другие ключи.

3. Запустить dev-сервер:

bun run dev

или

npm run dev

4. Открыть в браузере: http://localhost:3000

## Сборка для продакшена

bun run build

Собранная версия будет в папке dist/. Запуск продакшен-сборки:

bun run start

## API сервера

GET /api/tle/:group — прокси к CelesTrak с кэшем (2 часа). Заголовок X-Cache показывает HIT / MISS / STALE.
GET /api/launches — список последних 40 запусков SpaceX (Фаза 2).
GET /api/astros — люди на орбите (ISS, Tiangong).
GET /api/health — проверка состояния сервера.

Доступные группы для /api/tle/:group: stations, starlink, gps, glonass, galileo, weather, science, visual, active, resource, military.

## Лицензия

MIT. См. файл LICENSE.

## Источники данных

Данные о спутниках предоставлены сервисом CelesTrak (https://celestrak.org). TLE-данные находятся в открытом доступе (public domain). Расчёты орбит выполняются библиотекой satellite.js (https://github.com/shashwatak/satellite-js). Подробности об источниках данных — в файле NOTICE.
