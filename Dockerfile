FROM node:20-alpine AS build
WORKDIR /src
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || yarn install || pnpm i

COPY . .
RUN npm run build
