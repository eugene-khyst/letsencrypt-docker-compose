FROM node:18-alpine

RUN apk update && \
    apk add --no-cache docker-cli docker-cli-compose

WORKDIR /letsencrypt-docker-compose/cli
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ENV NODE_ENV=production

WORKDIR /workdir

CMD ["node", "/letsencrypt-docker-compose/cli/src/app.js"]