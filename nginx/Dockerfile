FROM nginx:1.23-alpine

RUN apk add --no-cache openssl

COPY default.conf /etc/nginx/conf.d/
COPY gzip.conf options-ssl-nginx.conf hsts.conf /etc/nginx/includes/
COPY site.conf.tpl /customization/
COPY nginx.sh /customization/

RUN chmod +x /customization/nginx.sh

EXPOSE 80

CMD ["/customization/nginx.sh"]