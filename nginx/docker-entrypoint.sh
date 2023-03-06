#!/bin/sh

./init-nginx.sh

exec nginx -g "daemon off;"