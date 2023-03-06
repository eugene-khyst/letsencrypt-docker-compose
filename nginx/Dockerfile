FROM nginx:1.23-alpine

RUN apk add --no-cache openssl jq

WORKDIR /letsencrypt-docker-compose

COPY init-nginx.sh docker-entrypoint.sh ./
RUN chmod +x init-nginx.sh docker-entrypoint.sh

EXPOSE 80

CMD ["/letsencrypt-docker-compose/docker-entrypoint.sh"]