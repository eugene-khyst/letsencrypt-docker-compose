FROM certbot/certbot:v1.32.2

RUN apk add --no-cache jq

WORKDIR /letsencrypt-docker-compose

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["/letsencrypt-docker-compose/docker-entrypoint.sh"]