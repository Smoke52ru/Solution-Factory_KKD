# Solution Factory · ККД

Фронтенд модуля **контроля качества данных (ККД)** по целям и ключевым результатам.

Mock API вендорнут в [`backend/`](backend/) из [gitverse.ru/kkk_s/moc_api_kkd](https://gitverse.ru/kkk_s/moc_api_kkd).

Визуал — по файлу [`docs/UI-KIT.md`](docs/UI-KIT.md) (тема Ant Design из задания).

## Быстрый старт

```bash
# mock API (Docker) + фронтенд
npm run dev:all
```

Или по отдельности:

```bash
npm run backend:up    # http://localhost:8000  · Swagger /docs
npm install
npm run dev           # http://localhost:5173
```

В dev Vite проксирует `/api` на `VITE_API_PROXY_TARGET` (по умолчанию `http://localhost:8000`).

Локальный backend без Docker:

```bash
npm run backend:local
```

## Скрипты mock API

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

Переменные — в `backend/.env.example` (при первом `backend:up` копируется в `backend/.env`).

Базовый URL для curl-скриптов можно переопределить: `API_BASE=http://127.0.0.1:8000`.

## Стек

- React 19 + TypeScript + Vite
- Ant Design 5 + тема из UI-KIT
- TanStack Query + Axios
- React Router
- FastAPI mock API (backend)

## Фронтенд

| Команда | Назначение |
|---|---|
| `npm run dev` | Dev-сервер |
| `npm run build` | Production-сборка |
| `npm run preview` | Превью сборки |
| `npm run lint` | Oxlint |
