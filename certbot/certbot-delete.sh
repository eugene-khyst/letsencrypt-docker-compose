#!/bin/sh

set -e

domain="$1"

if [ -z "$domain" ]; then
  echo "Domain is not configured"
  exit 1;
fi

echo "Deleting the certificate for domain $domain"

if [ "$DRY_RUN" = "true" ]; then
  echo "Dry run is enabled"
else
  certbot --noninteractive delete --cert-name "${domain}"
fi
