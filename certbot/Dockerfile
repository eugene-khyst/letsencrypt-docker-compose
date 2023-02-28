FROM certbot/certbot:v1.29.0

RUN apk add --no-cache bash jq

COPY certbot.sh /opt/

RUN chmod +x /opt/certbot.sh

ENTRYPOINT ["/opt/certbot.sh"]