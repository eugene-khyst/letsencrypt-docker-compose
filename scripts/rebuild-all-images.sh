#!/bin/bash

docker build ./cli -t evgeniy-khyst/letsencrypt-docker-compose-cli --no-cache;

docker build ./cron -t evgeniy-khyst/cron --no-cache;

docker build ./certbot -t evgeniy-khyst/certbot --no-cache;

docker build ./nginx -t evgeniy-khyst/nginx --no-cache;