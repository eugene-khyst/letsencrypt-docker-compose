#!/bin/sh

source ./config-nginx.sh

letsencrypt_certs_dir="/etc/letsencrypt"

wait_for_lets_encrypt_certificate() {
  until [ -d "${letsencrypt_certs_dir}/live/${1}" ]; do
    echo "Waiting for Let's Encrypt certificate for $1"
    sleep 5s & wait ${!}
  done
  use_lets_encrypt_certificate "$1"
  reload_nginx
}

for domain in $domains; do
  if [ ! -d "${letsencrypt_certs_dir}/live/${domain}" ]; then
    if [ "$DRY_RUN" = "true" ]; then
      echo "Dry run is enabled"
    else
      wait_for_lets_encrypt_certificate "$domain" &
    fi
  fi
done

exec nginx -g "daemon off;"