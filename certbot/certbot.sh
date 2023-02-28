#!/bin/bash

set -e

trap exit INT TERM

config="/etc/letsencrypt-docker-compose/config.json"
domains_length=$(jq -r '.domains' $config | jq length)

if [ -z "$domains_length" = "0" ]; then
  echo "Domains are not configured"
  exit 1;
fi

until nc -z nginx 80; do
  echo "Waiting for nginx to start..."
  sleep 5s & wait ${!}
done

for i in $(seq 0 $(($domains_length-1))); do
  domain=$(jq -r ".domains[$i].domain" $config)
  www_subdomain=$(jq -r ".domains[$i].wwwSubdomain" $config)
  email=$(jq -r ".domains[$i].email" $config)
  test_cert=$(jq -r ".domains[$i].testCert" $config)
  rsa_key_size=$(jq -r ".domains[$i].rsaKeySize" $config)

  if [ -z "$domain" ]; then
    echo "Domain name is not configured"
    exit 1;
  fi

  mkdir -p "/var/www/certbot/$domain"

  if [ -d "/etc/letsencrypt/live/$domain" ]; then
    echo "Let's Encrypt certificate for $domain already exists"
    continue
  fi

  if [ "$www_subdomain" != "0" ]; then
    www_subdomain_arg="-d \"www.$domain\""
  fi

  if [ "$test_cert" != "0" ]; then
    test_cert_arg="--test-cert"
  fi

  if [ -z "$email" ]; then
    email_arg="--register-unsafely-without-email"
    echo "Obtaining the certificate for $domain without email"
  else
    email_arg="--email $email"
    echo "Obtaining the certificate for $domain with email $email"
  fi

  certbot certonly \
    --webroot \
    -w "/var/www/certbot/$domain" \
    -d "$domain" \
    $www_subdomain_arg \
    $test_cert_arg \
    $email_arg \
    --rsa-key-size "${rsa_key_size:-2048}" \
    --agree-tos \
    --noninteractive \
    --verbose || true
done
