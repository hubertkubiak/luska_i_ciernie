# syntax=docker/dockerfile:1

# ---- build: compile both languages and seed the catalogue database ----
FROM node:24-slim AS build
WORKDIR /app

# Cypress is a devDependency for e2e tests only — skip its ~500 MB binary in the image build.
ENV CYPRESS_INSTALL_BINARY=0
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# prebuild:i18n runs `npm run db:seed` first → data/luska.db is created from seed/*.json.
RUN npm run build:i18n

# ---- runtime: only what the server needs ----
# The server bundle imports nothing from node_modules (Angular, Express and friends are bundled;
# node:sqlite is built into Node 24), so the final image ships no node_modules at all.
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    DB_PATH=/app/data/luska.db \
    USERS_DB_PATH=/app/data/users.db

RUN mkdir -p /app/data && chown node:node /app/data
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/data/luska.db ./data/luska.db

# Never run as root. The data/ folder must be writable for users.db (accounts, sessions, shelves).
# On a host with a persistent disk, mount it here (or point USERS_DB_PATH at it).
USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "dist/luska-i-ciernie/server/server.mjs"]
