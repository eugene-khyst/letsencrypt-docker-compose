#!/bin/sh

cd /workdir
echo "Renewing Let's Encrypt Certificates... (`date`)"
docker-compose run --entrypoint certbot certbot renew --force-renewal
echo "Reloading Nginx configuration"
docker-compose exec -T nginx nginx -s reload
