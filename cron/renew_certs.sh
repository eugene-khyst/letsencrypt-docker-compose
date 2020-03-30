#!/bin/sh

echo "Renewing Let's Encrypt Certificates..."
cd /workdir
docker-compose run --entrypoint certbot certbot renew --force-renewal
docker-compose exec nginx nginx -s reload
