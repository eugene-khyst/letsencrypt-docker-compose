FROM certbot/certbot:v1.32.2

RUN apk add --no-cache jq

COPY certbot.sh /opt/

RUN chmod +x /opt/certbot.sh

ENTRYPOINT ["/opt/certbot.sh"]