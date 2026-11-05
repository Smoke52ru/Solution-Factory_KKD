# syntax=docker/dockerfile:1

# ---- build: статика фронтенда ------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Адрес API зашивается в бандл при сборке. Пусто — относительные пути `/api`,
# их проксирует nginx на API_UPSTREAM.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- runtime: nginx ----------------------------------------------------------
FROM nginx:alpine

# Образ nginx сам прогоняет *.template через envsubst при старте контейнера
# и кладёт результат в /etc/nginx/conf.d.
ENV API_UPSTREAM=http://backend:8000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
