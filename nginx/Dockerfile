FROM nginx:1.23-alpine

RUN apk add --no-cache openssl jq

COPY nginx.sh /letsencrypt-docker-compose/
RUN chmod +x /letsencrypt-docker-compose/nginx.sh

EXPOSE 80

CMD ["/letsencrypt-docker-compose/nginx.sh"]