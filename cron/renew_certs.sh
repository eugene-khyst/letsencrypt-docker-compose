#!/bin/sh

if [ "$DRY_RUN" = "true" ]; then
  echo "Dry run is enabled"
  exit 0
fi

cd /workdir
echo "Renewing Let's Encrypt Certificates... (`date`)"
docker compose run --rm --no-deps --no-TTY --entrypoint certbot certbot renew --no-random-sleep-on-renew
echo "Reloading Nginx configuration"
docker compose exec --no-TTY nginx nginx -s reload
