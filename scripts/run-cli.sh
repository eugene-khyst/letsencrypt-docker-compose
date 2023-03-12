#!/bin/bash

CURRENT_USER="$(id -u):$(id -g)" DOCKER_GROUP="$(getent group docker | cut -d: -f3)" docker compose run --rm cli
