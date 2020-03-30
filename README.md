# letsencrypt-docker-compose
Nginx and Let’s Encrypt with Docker Compose in less than 3 minutes

docker volume create --name=devcomanda_nginx_ssl
docker volume create --name=devcomanda_certbot_certs
docker-compose up --build