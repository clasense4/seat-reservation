FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
RUN bun install

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", "src/index.tsx"]
