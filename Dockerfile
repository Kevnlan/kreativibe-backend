# --- Dependencies (with dev dependencies for build) ---
FROM node:22-alpine AS deps

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

# --- Build ---
FROM node:22-alpine AS build

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# --- Production dependencies ---
FROM node:22-alpine AS prod-deps

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev
RUN npm install prisma --no-save

COPY prisma ./prisma

RUN npx prisma generate

# --- Runtime ---
FROM node:22-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --chown=nestjs:nodejs --from=prod-deps /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs --from=build /app/dist ./dist
COPY --chown=nestjs:nodejs prisma ./prisma
COPY --chown=nestjs:nodejs package.json ./
COPY --chown=nestjs:nodejs docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

USER nestjs

EXPOSE 3050

ENTRYPOINT ["./docker-entrypoint.sh"]