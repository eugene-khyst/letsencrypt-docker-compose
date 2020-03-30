#!/bin/sh

echo "Renewing Let's Encrypt Certificates... (`date`)"
cd /workdir
docker-compose run --entrypoint certbot certbot renew --force-renewal
docker-compose exec -T nginx nginx -s reload
