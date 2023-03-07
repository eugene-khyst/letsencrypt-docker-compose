FROM certbot/certbot:v1.32.2

RUN apk add --no-cache jq

WORKDIR /letsencrypt-docker-compose

COPY certbot-certonly.sh start-certbot.sh ./
RUN chmod +x certbot-certonly.sh start-certbot.sh

ENTRYPOINT []
CMD ["/letsencrypt-docker-compose/start-certbot.sh"]