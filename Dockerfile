FROM node:24-slim AS builder
WORKDIR /usr/src/app
COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable && yarn --immutable
COPY . .
RUN yarn run build && yarn workspaces focus --all --production

FROM node:24-slim AS runner
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/package.json /usr/src/app/.env.example ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
