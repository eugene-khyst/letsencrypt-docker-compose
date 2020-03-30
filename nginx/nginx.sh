#!/bin/sh

set -e

if [ -z "$DOMAINS" ]; then
  echo "DOMAINS environment variable is not set"
  exit 1;
fi

for domain in $DOMAINS; do
  if [ ! -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
    mkdir -p "/etc/nginx/ssl/$domain"
    
    printf "[dn]\nCN=${domain}\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:${domain}, DNS:www.${domain}\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth" > openssl.cnf
    openssl req -x509 -out "/etc/nginx/ssl/$domain/fullchain.pem" -keyout "/etc/nginx/ssl/$domain/privkey.pem" \
      -newkey rsa:2048 -nodes -sha256 \
      -subj "/CN=${domain}" -extensions EXT -config openssl.cnf
    rm -f openssl.cnf

    mkdir -p "/etc/letsencrypt/live/$domain"
    ln -s "/etc/nginx/ssl/$domain/fullchain.pem" "/etc/letsencrypt/live/$domain/fullchain.pem"
    ln -s "/etc/nginx/ssl/$domain/privkey.pem" "/etc/letsencrypt/live/$domain/privkey.pem"
  fi
done

if [ ! -f /etc/nginx/ssl/ssl-dhparams.pem ]; then
  openssl dhparam -out /etc/nginx/ssl/ssl-dhparams.pem 2048
fi

(sleep 30s && nginx -s reload)&

exec nginx -g "daemon off;"