FROM node:20-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

FROM base AS run
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/openraffle.db
COPY --from=build /app ./
VOLUME /data
EXPOSE 3000
# Create/upgrade the schema on start, then serve
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx next start -p 3000"]
