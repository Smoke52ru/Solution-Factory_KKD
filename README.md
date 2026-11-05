# Solution Factory · ККД

Фронтенд модуля **контроля качества данных (ККД)** по целям и ключевым результатам.

Mock API: [gitverse.ru/kkk_s/moc_api_kkd](https://gitverse.ru/kkk_s/moc_api_kkd)

Визуал — по файлу [`docs/UI-KIT.md`](docs/UI-KIT.md) (тема Ant Design из задания).

## Быстрый старт

### 1. Mock API

```bash
git clone https://gitverse.ru/kkk_s/moc_api_kkd.git
cd moc_api_kkd
docker compose up --build
# или: pip install -r requirements.txt && uvicorn app.main:app --reload
```

- Swagger: http://localhost:8000/docs

### 2. Фронтенд

```bash
cp .env.example .env
npm install
npm run dev
```

Приложение: http://localhost:5173

В dev Vite проксирует `/api` на `VITE_API_PROXY_TARGET` (по умолчанию `http://localhost:8000`).

## Стек

- React 19 + TypeScript + Vite
- Ant Design 6 + тема из UI-KIT
- TanStack Query + Axios
- React Router

## Скрипты

| Команда | Назначение |
|---|---|
| `npm run dev` | Dev-сервер |
| `npm run build` | Production-сборка |
| `npm run preview` | Превью сборки |
| `npm run lint` | Oxlint |
