# Combell Node.js — kleine build-context (.dockerignore sluit shared/uploads uit).
# Media: scripts/combell-fetch-shared-media.cjs tijdens npm run combell:build
FROM node:22-bookworm-slim
WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -qq \
  && apt-get install -y --no-install-recommends -qq git ca-certificates \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts
COPY shared/README.md ./shared/README.md

RUN npm ci
RUN npm run combell:build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "serve"]
