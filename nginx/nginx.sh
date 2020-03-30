#!/bin/sh

set -e

if [ -z "$DOMAINS" ]; then
  echo "DOMAINS environment variable is not set"
  exit 1;
fi

for domain in $DOMAINS; do
  if [ ! -f "/etc/nginx/ssl/certs/$domain/fullchain.pem" ]; then
    echo "Generating dummy ceritificate for $domain"
    mkdir -p "/etc/nginx/ssl/certs/$domain"
    printf "[dn]\nCN=${domain}\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:${domain}, DNS:www.${domain}\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth" > openssl.cnf
    openssl req -x509 -out "/etc/nginx/ssl/certs/$domain/fullchain.pem" -keyout "/etc/nginx/ssl/certs/$domain/privkey.pem" \
      -newkey rsa:2048 -nodes -sha256 \
      -subj "/CN=${domain}" -extensions EXT -config openssl.cnf
    rm -f openssl.cnf
  fi
done

# if [ ! -f /etc/nginx/ssl/ssl-dhparams.pem ]; then
#   mkdir -p "/etc/nginx/ssl/dhparams"
#   openssl dhparam -out /etc/nginx/ssl/dhparams/ssl-dhparams.pem 2048
# fi

wait_for_lets_encrypt() {
  until [ -d "/etc/letsencrypt/live/$1" ]; do
    echo "Waiting for Let's Encrypt certificates for $1"
    sleep 5s & wait ${!}
  done
  echo "Switching Nginx to Let's Encrypt certificate"
  sed -i "s|/etc/nginx/ssl/certs/$1|/etc/letsencrypt/live/$1|g" /etc/nginx/conf.d/default.conf
  echo "Reloading Nginx configuration"
  nginx -s reload
}

for domain in $DOMAINS; do
  if [ ! -d "/etc/letsencrypt/live/$1" ]; then
    wait_for_lets_encrypt "$domain" &
  fi
done

exec nginx -g "daemon off;"