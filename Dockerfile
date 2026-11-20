# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
RUN apk add --no-cache tzdata
ENV TZ=Asia/Tokyo
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Optional extra CA (e.g. corporate TLS proxy) for downloading Prisma engines
RUN --mount=type=secret,id=extra_ca \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npx prisma generate && npm run build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
