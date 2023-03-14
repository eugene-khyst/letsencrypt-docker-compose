#!/bin/bash

usage() {
      cat << EOF
Usage: $(basename $0) COMMAND

  config  [OPTIONS]          Run the CLI tool
          --no-current-user  Run as root (Docker default) instead of the current user
  
  up      [OPTIONS]          Build, (re)create, and start all services in the background
          --dry-run          Disable Certbot to run all services locally
  
  build   [OPTIONS]          Build or rebuild all Docker images
          --no-cache         Do not use cache when building the images
EOF
    exit 1
}

case $1 in
  config)
    CMD=(docker compose run --rm cli)
    export CURRENT_USER="$(id -u):$(id -g)"
    export DOCKER_GROUP="$(getent group docker | cut -d: -f3)"
    shift
    while [[ $# -gt 0 ]]; do
      case $1 in
        --no-current-user)
          unset CURRENT_USER
          unset DOCKER_GROUP
          shift
          ;;
        *)
          echo "Unknown option $1"
          usage
          ;;
      esac
    done
    ;;
  up)
    CMD=(docker compose up -d)
    shift
    while [[ $# -gt 0 ]]; do
      case $1 in
        --dry-run)
          export DRY_RUN=true
          shift
          ;;
        *)
          echo "Unknown option $1"
          usage
          ;;
      esac
    done
    ;;
  build)
    CMD=(docker compose --profile config build)
    shift
    while [[ $# -gt 0 ]]; do
      case $1 in
        --no-cache)
          CMD+=(--no-cache)
          shift
          ;;
        *)
          echo "Unknown option $1"
          usage
          ;;
      esac
    done
    ;;
  *)
    echo "Unknown command $1"
    usage
    ;;
esac

"${CMD[@]}"
