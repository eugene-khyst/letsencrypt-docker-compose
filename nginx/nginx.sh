#!/bin/sh

set -e

if [ -z "$DOMAINS" ]; then
  echo "DOMAINS environment variable is not set"
  exit 1;
fi

use_dummy_certificate() {
  if grep -q "/etc/letsencrypt/live/$1" "/etc/nginx/sites/$1.conf"; then
    echo "Switching Nginx to use dummy certificate for $1"
    sed -i "s|/etc/letsencrypt/live/$1|/etc/nginx/sites/ssl/dummy/$1|g" "/etc/nginx/sites/$1.conf"
  fi
}

use_lets_encrypt_certificate() {
  if grep -q "/etc/nginx/sites/ssl/dummy/$1" "/etc/nginx/sites/$1.conf"; then
    echo "Switching Nginx to use Let's Encrypt certificate for $1"
    sed -i "s|/etc/nginx/sites/ssl/dummy/$1|/etc/letsencrypt/live/$1|g" "/etc/nginx/sites/$1.conf"
  fi
}

reload_nginx() {
  echo "Reloading Nginx configuration"
  nginx -s reload
}

wait_for_lets_encrypt() {
  until [ -d "/etc/letsencrypt/live/$1" ]; do
    echo "Waiting for Let's Encrypt certificates for $1"
    sleep 5s & wait ${!}
  done
  use_lets_encrypt_certificate "$1"
  reload_nginx
}

if [ ! -f /etc/nginx/sites/ssl/ssl-dhparams.pem ]; then
  mkdir -p "/etc/nginx/sites/ssl"
  openssl dhparam -out /etc/nginx/sites/ssl/ssl-dhparams.pem 2048
fi

for domain in $DOMAINS; do
  echo "Checking configuration for $domain"

  if [ ! -f "/etc/nginx/sites/$domain.conf" ]; then
    echo "Creating Nginx configuration file /etc/nginx/sites/$domain.conf"
    sed "s/\${domain}/$domain/g" /customization/site.conf.tpl > "/etc/nginx/sites/$domain.conf"
  fi

  if [ ! -f "/etc/nginx/sites/ssl/dummy/$domain/fullchain.pem" ]; then
    echo "Generating dummy ceritificate for $domain"
    mkdir -p "/etc/nginx/sites/ssl/dummy/$domain"
    printf "[dn]\nCN=${domain}\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:$domain, DNS:www.$domain\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth" > openssl.cnf
    openssl req -x509 -out "/etc/nginx/sites/ssl/dummy/$domain/fullchain.pem" -keyout "/etc/nginx/sites/ssl/dummy/$domain/privkey.pem" \
      -newkey rsa:2048 -nodes -sha256 \
      -subj "/CN=${domain}" -extensions EXT -config openssl.cnf
    rm -f openssl.cnf
  fi

  if [ ! -d "/etc/letsencrypt/live/$domain" ]; then
    use_dummy_certificate "$domain"
    wait_for_lets_encrypt "$domain" &
  else
    use_lets_encrypt_certificate "$domain"
  fi
done

exec nginx -g "daemon off;"
