# Solution Factory · ККД

Страница модуля **контроля качества данных (ККД)** по целям и ключевым результатам сотрудников: сводка метрик с честной дельтой относительно прошлого прогона, таблица найденных проблем с серверными фильтрами и пагинацией, карточка проблемы с историей по прогонам. Тестовое задание для Frontend-разработчика (условия — [`docs/Тестовое_задание_Frontend.pdf`](docs/Тестовое_задание_Frontend.pdf)).

Работает с готовым mock API, вендорнутым в [`backend/`](backend/) из [gitverse.ru/kkk_s/moc_api_kkd](https://gitverse.ru/kkk_s/moc_api_kkd). Визуал — по [`docs/UI-KIT.md`](docs/UI-KIT.md).

## Быстрый старт

Нужен только Docker.

```bash
git clone <URL-репозитория> solution-factory-kkd
cd solution-factory-kkd
docker compose up --build
```

Страница откроется на **http://localhost:8080**. Mock API доступен на http://localhost:8000 (Swagger — `/docs`), фронтенд проксирует к нему запросы `/api` через nginx.

Остановить: `docker compose down`.

## Разработка

Нужны Node.js 24+ и Docker (для mock API).

```bash
npm install
npm run dev:all    # mock API в Docker + Vite на http://localhost:5173
```

Или по отдельности: `npm run backend:up`, затем `npm run dev`. Vite проксирует `/api` и `/health` на `VITE_API_PROXY_TARGET`. Mock API без Docker: `npm run backend:local` (нужен Python 3.11+).

### Скрипты фронтенда

| Команда | Назначение |
|---|---|
| `npm run dev` | Dev-сервер Vite |
| `npm run build` | `tsc -b` и production-сборка в `dist/` |
| `npm run preview` | Превью сборки |
| `npm run lint` | Oxlint |

### Скрипты mock API

| Команда | Назначение |
|---|---|
| `npm run backend:up` | Сборка и запуск в Docker |
| `npm run backend:down` | Остановка контейнера |
| `npm run backend:logs` | Логи контейнера |
| `npm run backend:health` | `GET /health` |
| `npm run backend:reset` | `POST /api/reset` — сброс демо-данных |
| `npm run backend:local` | uvicorn с `--reload` в `backend/.venv` |
| `npm run backend:test` | `pytest` |
| `npm run dev:all` | backend в Docker + Vite |

Настройки mock API (задержка ответа, длительность прогона) — в `backend/.env.example`; при первом `backend:up` файл копируется в `backend/.env`. Базовый URL для curl-скриптов: `API_BASE=http://127.0.0.1:8000`.

## Переменные окружения

Шаблон — [`.env.example`](.env.example); для локальной настройки скопируйте его в `.env`.

| Переменная | Где используется | Значение по умолчанию |
|---|---|---|
| `VITE_API_URL` | Базовый URL API, читается при **сборке** фронтенда. Пусто — относительные пути `/api`: их проксирует Vite в dev и nginx в Docker | пусто |
| `VITE_API_PROXY_TARGET` | Куда Vite проксирует `/api` и `/health` в режиме `npm run dev` | `http://localhost:8000` |
| `API_UPSTREAM` | Куда nginx проксирует `/api` и `/health` в контейнере `frontend`; читается при старте контейнера | `http://backend:8000` |

Адрес API нигде не прописан в компонентах: он берётся из `VITE_API_URL` в [`src/shared/api/client.ts`](src/shared/api/client.ts).

## Стек

- React 19 + TypeScript + Vite
- **Ant Design 5** — этого требует задание. Актуальная версия antd 6, поэтому проект зафиксирован на 5-й, а для работы с React 19 подключён патч `@ant-design/v5-patch-for-react-19`
- Тема собрана из токенов UI-кита в [`src/app/theme.ts`](src/app/theme.ts), цвета в компонентах берутся только из темы; шрифт Inter
- TanStack Query + Axios — загрузка и кеш данных
- React Router — состояние страницы хранится в query-параметрах URL
- nginx — раздача статики и прокси к API в Docker
- FastAPI mock API (`backend/`)

## Структура проекта

```text
.
├── src/
│   ├── app/                  # App, providers (QueryClient, ConfigProvider), тема
│   ├── pages/kkd/            # KkdPage — только композиция секций
│   ├── features/
│   │   ├── kkd-context/      # выбор подразделения и прогона, useKkdParams
│   │   ├── kkd-summary/      # вердикт, карточки метрик, счётчики, «что исправлять»
│   │   └── kkd-issues/       # фильтры, таблица, карточка проблемы
│   └── shared/
│       ├── api/              # клиент, типы, endpoints, queryKeys, хуки, ошибки
│       ├── ui/               # DeltaIndicator, SeverityTag, DeltaStatusTag, ErrorState
│       └── lib/              # форматирование чисел и дат
├── backend/                  # вендорнутый mock API (FastAPI)
├── nginx/                    # шаблон конфигурации nginx для Docker
├── specs/                    # спецификация: requirements.md, design.md
├── docs/                     # задание, БТ и UI-KIT.md
├── scripts/                  # скрипты mock API и dev:all
├── Dockerfile                # сборка фронтенда + nginx
└── docker-compose.yml        # backend + frontend
```

## Использование ИИ-ассистента

Решение написано с ИИ-ассистентом; спецификация, по которой шла работа, лежит в [`specs/`](specs/) ([`requirements.md`](specs/requirements.md), [`design.md`](specs/design.md)).
