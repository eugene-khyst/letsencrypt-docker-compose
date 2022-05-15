#!/bin/sh

cd /workdir
echo "Renewing Let's Encrypt Certificates... (`date`)"
docker compose run --rm --no-TTY --entrypoint certbot certbot renew --no-random-sleep-on-renew
echo "Reloading Nginx configuration"
docker compose exec --no-TTY nginx nginx -s reload
