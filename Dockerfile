FROM node:20-slim

WORKDIR /app

# Use pnpm via Corepack for consistent dependency management.
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm exec playwright install --with-deps chromium

COPY . .
RUN pnpm run build

ENV NODE_ENV=production
ENV MCP_JOBS_HOST=0.0.0.0
ENV MCP_JOBS_PORT=6000

EXPOSE 6000
CMD ["pnpm", "run", "server:http"]
