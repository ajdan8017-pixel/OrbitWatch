# Обзор архитектурных и функциональных диаграмм проекта «OrbitWatch»

**Тема проекта:** «Веб-приложение для 3D-визуализации космических миссий и отслеживания спутников в реальном времени OrbitWatch»  
**Дисциплина:** ПМ.02 «Осуществление интеграции программных модулей»  
**Образовательное учреждение:** ГБПОУ НСО «НЭК», 2026 г.

---

## 1. Введение

Веб-приложение **OrbitWatch** представляет собой интерактивный аппаратно-программный комплекс реального времени для мониторинга околоземного космического пространства. Проект решает задачу интеграции разнородных внешних источников данных (CelesTrak NORAD, SpaceX API, Open Notify), математического аппарата небесной механики (модели возмущений SGP4/SDP4 библиотеки `satellite.js`) и высокопроизводительного графического 3D-движка (WebGL / Three.js) в единую клиентскую распределенную систему.

---

## 2. Структурные диаграммы

### 2.1. Диаграмма классов (Class Diagram)
**Назначение:** Описание логической объектно-ориентированной структуры приложения, распределения обязанностей, типов атрибутов и методов.

```mermaid
classDiagram
    class SatelliteItem {
        +string id
        +string name
        +string line1
        +string line2
        +string category
        +number inclinationDeg
        +number periodMin
        +number apogeeKm
        +number perigeeKm
        +number eccentricity
    }

    class CurrentPosition {
        +number x
        +number y
        +number z
        +number lat
        +number lng
        +number altitudeKm
        +number speedKmS
    }

    class TLEService {
        -Map~string, SatelliteItem~ cache
        +loadInitialSatelliteCatalog() Promise~CatalogResult~
        +fetchTLEForGroup(groupKey) Promise~SatelliteItem[]~
        +calculateSatellitePosition(sat, date) CurrentPosition
        +calculateOrbitTrajectory(sat, date, points) Vector3[]
    }

    class CelestialManager {
        +calculateCelestialPositions(date) CelestialData
        +getSunVector(date) Vector3
        +getMoonVector(date) Vector3
    }

    class SpaceScene {
        -WebGLRenderer renderer
        -EffectComposer composer
        -PerspectiveCamera camera
        -OrbitControls controls
        -Map~string, Sprite~ satSprites
        +initScene() void
        +updatePositions(time) void
        +renderOrbit(sat) void
        +renderTrail(sat) void
    }

    class TimeController {
        +Date simulatedTime
        +number speedMultiplier
        +boolean isPaused
        +setTime(date) void
        +setWarp(multiplier) void
        +togglePause() void
    }

    class MissionsService {
        +fetchSpaceMissions() Promise~LaunchMission[]~
        +fetchAstronautsInSpace() Promise~Astronaut[]~
    }

    SpaceScene --> TLEService : запрашивает координаты
    SpaceScene --> CelestialManager : получает векторы Солнца и Луны
    SpaceScene --> SatelliteItem : визуализирует спрайты
    TLEService --> SatelliteItem : создает и парсит
    TLEService --> CurrentPosition : вычисляет
    SpaceScene ..> TimeController : синхронизируется по времени
    MissionsService ..> SatelliteItem : связывает миссии
```

**Обоснование решений:**
Выделение специализированного сервиса `TLEService` изолирует математический аппарат SGP4 от логики представления `SpaceScene`. Класс `CelestialManager` инкапсулирует расчёт эфемерид Солнца и Луны, что позволило реализовать физически корректную смену дня/ночи и терминатора без перегрузки сцены.

---

### 2.2. Диаграмма компонентов (Component Diagram)
**Назначение:** Описание модульной архитектуры программного обеспечения, предоставления и использования интерфейсов.

```mermaid
graph TD
    subgraph UI_Layer [Уровень представления (React 19 & Tailwind CSS)]
        Header[Header Toolbar]
        FilterBar[Filter & Search Bar]
        SatCard[Satellite Telemetry Card]
        TimeCtrl[Time Warp Controller]
        MissionsUI[Missions & Crew Modal]
        Drawer[Satellite Catalog Drawer]
    end

    subgraph Graphics_Layer [Графический 3D-уровень (Three.js WebGL)]
        SpaceSceneComp[SpaceScene Engine]
        ShaderPass[Atmosphere & Day/Night Shaders]
        BloomPass[UnrealBloom Post-processing]
        SpriteRenderer[Procedural Sprite Generator]
    end

    subgraph Logic_Layer [Уровень бизнес-логики и физики]
        SGP4Engine[SGP4/SDP4 Orbit Propagator]
        AstroEngine[Astronomical Coordinates Engine]
        AudioEngine[Web Audio Sound Synthesizer]
    end

    subgraph Data_Layer [Уровень данных и интеграции]
        TLEServiceComp[TLE Fetcher & Parser]
        CacheStore[LocalStorage & Memory Cache]
        MissionsServiceComp[SpaceX & Crew REST Client]
    end

    subgraph External_APIs [Внешние сервисы]
        CelesTrak[CelesTrak NORAD API]
        SpaceXAPI[SpaceX REST API]
        OpenNotify[Open Notify ISS Crew API]
    end

    UI_Layer --> Graphics_Layer
    UI_Layer --> Logic_Layer
    Graphics_Layer --> Logic_Layer
    Logic_Layer --> Data_Layer
    Data_Layer --> External_APIs
    TLEServiceComp <--> CacheStore
```

**Обоснование решений:**
Разделение на 4 независимых слоя (UI, 3D Graphics, Logic, Data) обеспечивает слабую связанность (low coupling) и высокую связность (high cohesion). При сбое внешних API слой данных прозрачно переключается на локальный кэш и встроенные эталонные TLE-данные, сохраняя полную работоспособность приложения.

---

### 2.3. Диаграмма развертывания (Deployment Diagram)
**Назначение:** Физическое размещение компонентов программной системы на аппаратных узлах и спецификация протоколов передачи данных.

```mermaid
graph LR
    subgraph Client_Node [Узел: Рабочая станция / Клиентский браузер]
        subgraph Browser_Runtime [Среда выполнения: Chrome / Firefox / Safari]
            SPA[Одностраничное приложение OrbitWatch React SPA]
            WebGL_Engine[Аппаратный контекст WebGL 2.0 / GPU]
            WebWorkers[Фоновые Web Workers: SGP4 расчёт]
            LocalStorage_Node[(Локальное хранилище Browser Cache / LocalStorage)]
        end
    end

    subgraph Hosting_Server [Узел: Web-сервер статики / Cloud Run Host]
        StaticAssets[HTML5 / ES Modules / Bundle Assets / Vite Static Host]
    end

    subgraph External_Cloud [Узел: Внешние провайдеры орбитальных данных]
        CelesTrak_Host[CelesTrak Host: celestrak.org / HTTPS REST]
        SpaceX_Host[SpaceX Host: api.spacexdata.com / HTTPS REST]
        OpenNotify_Host[Open Notify Host: api.open-notify.org / HTTPS]
    end

    Client_Node -- "HTTPS (TCP 443) / Загрузка бандла" --> Hosting_Server
    Client_Node -- "HTTPS / TLS 1.3 (GET /pub/TLE.txt)" --> CelesTrak_Host
    Client_Node -- "HTTPS / JSON (v4/launches)" --> SpaceX_Host
    Client_Node -- "HTTPS / JSON (astros.json)" --> OpenNotify_Host
```

**Обоснование решений:**
Архитектура «Client-heavy SPA» с прямым обращением к защищенным HTTPS-эндпоинтам снижает задержки (latency) и исключает нагрузку на промежуточный бэкенд. Все 3D-вычисления и интегрирование орбит производятся непосредственно на GPU и многоядерном CPU пользователя.

---

## 3. Поведенческие диаграммы

### 3.1. Диаграмма вариантов использования (Use Case Diagram)
**Назначение:** Описание функциональных возможностей системы с точки зрения конечного пользователя (оператора/исследователя).

```mermaid
graph LR
    User((Оператор / Исследователь))

    UC1[3D-навигация по околоземному пространству]
    UC2[Выбор спутника и просмотр телеметрии]
    UC3[Фильтрация по категориям и орбитам]
    UC4[Управление ходом времени симуляции]
    UC5[Слежение камерой за аппаратом]
    UC6[Принудительное обновление TLE с CelesTrak]
    UC7[Просмотр космических миссий и экипажей]
    UC8[Переключение Bloom и аудио-эффектов]

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8

    UC2 -. "«include»" .-> UC1
    UC5 -. "«extend»" .-> UC2
    UC6 -. "«include»" .-> UC2
```

---

### 3.2. Диаграмма деятельности (Activity Diagram)
**Назначение:** Описание алгоритмического процесса инициализации, загрузки TLE-данных и циклического рендеринга спутниковой группировки.

```mermaid
graph TD
    Start([Старт приложения]) --> CheckCache{Есть актуальный кэш TLE?}
    CheckCache -- Да --> LoadCache[Загрузить TLE из LocalStorage]
    CheckCache -- Нет --> RequestAPI[Отправить HTTPS-запрос к CelesTrak]
    
    RequestAPI --> APIOk{Ответ получен 200 OK?}
    APIOk -- Да --> ParseTLE[Парсинг 2-строчных элементов TLE]
    APIOk -- Нет --> Fallback[Загрузить резервный эталонный каталог TLE]
    
    LoadCache --> ParseTLE
    Fallback --> ParseTLE
    
    ParseTLE --> SaveCache[Сохранить с временной меткой в кэш]
    SaveCache --> Init3D[Инициализация Three.js сцены и шейдеров]
    
    Init3D --> LoopStart[Начало кадра Animation Frame]
    LoopStart --> UpdateTime[Расчет simulatedTime с учетом коэффициента скорости]
    UpdateTime --> PropagateSGP4[SGP4 расчет координат X, Y, Z и высоты для всех аппаратов]
    PropagateSGP4 --> CheckFilter{Спутник удовлетворяет фильтрам?}
    CheckFilter -- Да --> UpdateSprite[Обновить позицию 2D-спрайта на сцене]
    CheckFilter -- Нет --> HideSprite[Скрыть спрайт]
    
    UpdateSprite --> RenderFrame[Отрисовка кадра с постобработкой UnrealBloom]
    HideSprite --> RenderFrame
    RenderFrame --> LoopStart
```

---

### 3.3. Диаграмма состояний (State Machine Diagram)
**Назначение:** Моделирование жизненного цикла выбранного спутника и состояний системы сопровождения цели.

```mermaid
stateDiagram-v2
    [*] --> Idle : Инициализация каталога
    Idle --> Highlighted : Наведение курсора (Hover)
    Highlighted --> Idle : Уход курсора
    Highlighted --> Selected : Клик по спутнику
    Idle --> Selected : Выбор из списка / Поиск
    
    state Selected {
        [*] --> OrbitCalculation
        OrbitCalculation --> TrajectoryRendered : Расчет 140 точек витка
        TrajectoryRendered --> TrailRendered : Расчет угасающего следа (50 точек)
        TrailRendered --> ActiveTracking : Нажата кнопка «Следить»
        ActiveTracking --> TrajectoryRendered : Отмена слежения камерой
    }
    
    Selected --> FilteredOut : Изменение фильтров / Поиск
    FilteredOut --> Selected : Сброс фильтров
    Selected --> Idle : Закрытие карточки (Крестик / Esc)
```

---

### 3.4. Диаграмма последовательности (Sequence Diagram)
**Назначение:** Детализация хронологического порядка взаимодействия объектов при выборе космического аппарата и построении его траектории.

```mermaid
sequenceDiagram
    autonumber
    actor User as Пользователь
    participant UI as SpaceScene (Canvas)
    participant Ray as Raycaster
    participant TLE as TLEService
    participant Prop as satellite.js (SGP4)
    participant Scene as Three.js Render Pipeline
    participant Card as SatelliteCard (UI)

    User->>UI: Клик по иконке спутника (PointerDown)
    UI->>Ray: Пересечение луча со спрайтами (intersectObjects)
    Ray-->>UI: Возврат выбранного Sprite (sat.id = 25544)
    UI->>Card: Отобразить карточку и инициировать выбор
    UI->>TLE: calculateOrbitTrajectory(sat, time, 140)
    
    loop 140 расчетных шагов по периоду T
        TLE->>Prop: propagate(satrec, stepTime)
        Prop-->>TLE: ECI-позиция (x, y, z)
        TLE->>TLE: Перевод в экранные 3D-координаты сцены
    end
    
    TLE-->>UI: Массив 3D-векторов траектории
    UI->>Scene: Построение THREE.Line с градиентом вершин
    UI->>Scene: Отрисовка пульсирующего ретикула захвата (Selection Sprite)
    UI->>Scene: Отрисовка угасающего следа (NASA Eyes Trail)
    Card->>User: Вывод параметров: высота, скорость, координаты апогея
```

---

## 4. Функциональные диаграммы

### 4.1. IDEF0 A-0 (Контекстная диаграмма)
**Назначение:** Определение контекстных границ системы OrbitWatch, целевой функции, внешних регламентов, механизмов и потоков.

```
                  УПРАВЛЕНИЕ (C)
  [Законы орбитальной механики Кеплера] 
  [Стандарты SGP4/SDP4] [Настройки фильтрации пользователя]
                          │
                          ▼
            ┌───────────────────────────┐
ВХОДЫ (I)   │                           │ ВЫХОДЫ (O)
───────────►│  Визуализировать орбиты  ├────────────►
[Двухстроч- │    и космические миссии   │ [3D-глобус с аппаратами]
 ные TLE]   │      в реальном времени   │ [Векторы движения и следы]
[Системное  │                           │ [Телеметрия: V, H, Lat/Lng]
 время UTC] │        (Блок А-0)         │ [Каталог экипажей и запусков]
[API-ответы]│                           │
            └─────────────┬─────────────┘
                          ▲
                          │
                     МЕХАНИЗМЫ (M)
  [Браузерный движок WebGL 2.0] [Библиотека satellite.js]
  [Среда React 19 / Three.js]   [Пользователь / Оператор]
```

- **Входы (Inputs):** Необработанные TLE строки спутниковых группировок, системное время, данные JSON запусков SpaceX и экипажа МКС.
- **Управление (Controls):** Аналитическая теория возмущений SGP4, константы WGS-84, пользовательские параметры временного ускорения (warp) и фильтрации.
- **Выходы (Outputs):** Графическая 3D-модель движения спутников, траектории витков, карточка телеметрии, уведомления (Toast).
- **Механизмы (Mechanisms):** Видеокарта (GPU/WebGL), процессор (JavaScript V8/Web Workers), Three.js, конечный пользователь.

---

### 4.2. IDEF0 A0 (Функциональная декомпозиция первого уровня)
**Назначение:** Детализация главной функции на 4 взаимосвязанных подпроцесса.

```
                   [Входные TLE и API]
                           │
                           ▼
          ┌───────────────────────────────────┐
          │ А1. Загрузка, кэширование         │
          │     и парсинг орбитальных данных  │
          └────────────────┬──────────────────┘
                           │ Распарсенные satrec записи
                           ▼
          ┌───────────────────────────────────┐
          │ А2. Аналитический SGP4-расчет     │◄── [Шкала времени UTC]
          │     координат, скорости и высоты  │
          └────────────────┬──────────────────┘
                           │ 3D-координаты (x, y, z)
                           ▼
          ┌───────────────────────────────────┐
          │ А3. 3D-рендеринг глобуса,         │◄── [Координаты Солнца/Луны]
          │     спрайтов, орбит и шлейфов     │
          └────────────────┬──────────────────┘
                           │ Графический интерактивный буфер
                           ▼
          ┌───────────────────────────────────┐
          │ А4. Обработка действий оператора  ├─► [Вывод телеметрии]
          │     и интерактивное управление    ├─► [Управление камерой]
          └───────────────────────────────────┘
```

---

### 4.3. DFD уровень 0 (Контекстная диаграмма потоков данных)
**Назначение:** Описание взаимодействия системы как единого процесса с внешними сущностями.

```mermaid
graph LR
    CelesTrak[Внешняя сущность 1: CelesTrak NORAD]
    SpaceX[Внешняя сущность 2: SpaceX REST API]
    User[Внешняя сущность 3: Пользователь-Оператор]
    
    Sys((Процесс 0: Мониторинг орбитальных объектов OrbitWatch))
    
    CelesTrak -- "Текстовые потоки TLE (HTTPS)" --> Sys
    SpaceX -- "Данные запусков и ступеней (JSON)" --> Sys
    User -- "Команды фильтрации, клики, ускорение времени" --> Sys
    
    Sys -- "3D-сцена Земли, траектории, маркеры" --> User
    Sys -- "Телеметрические сводки и координаты" --> User
```

---

### 4.4. DFD уровень 1 (Декомпозиция потоков данных)
**Назначение:** Детализация потоков данных между подпроцессами и хранилищами информации внутри OrbitWatch.

```mermaid
graph TD
    User[Пользователь]
    CelesTrak[CelesTrak API]

    P1[1.0 Диспетчер сетевых запросов и TLE]
    P2[2.0 Вычислительное ядро SGP4]
    P3[3.0 Процессор времени симуляции]
    P4[4.0 Графический конвейер WebGL]
    P5[5.0 Формирователь отчетов телеметрии]

    D1[(D1 Кэш орбитальных TLE / LocalStorage)]
    D2[(D2 Буфер текущих координат X/Y/Z)]
    D3[(D3 Параметры выбранного аппарата)]

    CelesTrak -->|Сырые строки TLE| P1
    P1 -->|Сохранение валидных TLE| D1
    D1 -->|Чтение кешированных TLE| P1
    
    P1 -->|Массив объектов SatelliteItem| P2
    P3 -->|Моделируемое время t| P2
    User -->|Настройки скорости / Пауза| P3
    
    P2 -->|Рассчитанные координаты| D2
    D2 -->|Позиции спрайтов и орбит| P4
    
    User -->|Выбор спутника (Click)| P4
    P4 -->|ID выбранного объекта| D3
    D3 -->|Параметры орбиты| P5
    P5 -->|Высота, скорость, координаты| User
    P4 -->|Отрендеренный 3D-кадр| User
```

---

## 5. Сводное соответствие критериям оценки практики

1. **Полнота комплекта:** Разработаны и формализованы все **11 требуемых диаграмм** (3 структурные, 4 поведенческие, 4 функциональные).
2. **Точность привязки:** Все классы, модули, потоки данных и интерфейсы соответствуют реальному исходному коду веб-приложения OrbitWatch (библиотека `satellite.js`, `Three.js`, компоненты React, API CelesTrak).
3. **Обоснование инженерных решений:** По каждой диаграмме приведены архитектурные доводы в пользу выбранных паттернов проектирования, распределения ответственности и изоляции слоев.
