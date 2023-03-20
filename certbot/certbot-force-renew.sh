#!/bin/sh

set -e

echo "Forcibly renewing all certificates"

if [ "$DRY_RUN" = "true" ]; then
  echo "Dry run is enabled"
else
  certbot renew --no-random-sleep-on-renew --force-renew
fi
