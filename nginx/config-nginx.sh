#!/bin/sh

set -e

config="/letsencrypt-docker-compose/config.json"
domains=$(jq -r '.domains[].domain' $config)

if [ -z "$domains" ]; then
  echo "Domains are not configured"
  exit 1;
fi

nginx_conf_dir="/etc/nginx/ssl"
letsencrypt_certs_dir="/etc/letsencrypt"

generate_dhparams_if_absent() {
  if [ ! -f "${nginx_conf_dir}/ssl-dhparams.pem" ]; then
    dhparams_size=$(jq -r '.dhparamsSize' $config)
    mkdir -p "${nginx_conf_dir}"
    openssl dhparam -out "${nginx_conf_dir}/ssl-dhparams.pem" "$dhparams_size"
  fi
}

generate_dummy_certificate_if_absent() {
  if [ ! -f "${nginx_conf_dir}/dummy/${1}/fullchain.pem" ]; then
    echo "Generating dummy ceritificate for $1"
    mkdir -p "${nginx_conf_dir}/dummy/${1}"
    printf "[dn]\nCN=${1}\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:${1}, DNS:www.${1}\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth" > openssl.cnf
    openssl req -x509 -out "${nginx_conf_dir}/dummy/${1}/fullchain.pem" -keyout "${nginx_conf_dir}/dummy/${1}/privkey.pem" \
      -newkey rsa:2048 -nodes -sha256 \
      -subj "/CN=${1}" -extensions EXT -config openssl.cnf
    rm -f openssl.cnf
  fi
}

reload_nginx() {
  if [ -e /var/run/nginx.pid ]; then
    echo "Reloading Nginx configuration"
    nginx -s reload
  fi
}

use_dummy_certificate() {
  if grep -q "${letsencrypt_certs_dir}/live/${1}" "${nginx_conf_dir}/${1}.conf"; then
    echo "Switching Nginx to use dummy certificate for $1"
    cat <<EOF > "${nginx_conf_dir}/${1}.conf"
ssl_certificate ${nginx_conf_dir}/dummy/${1}/fullchain.pem;
ssl_certificate_key ${nginx_conf_dir}/dummy/${1}/privkey.pem;
EOF
    reload_nginx
  fi
}

use_lets_encrypt_certificate() {
  if grep -q "${nginx_conf_dir}/dummy/${1}" "${nginx_conf_dir}/${1}.conf"; then
    echo "Switching Nginx to use Let's Encrypt certificate for $1"
    cat <<EOF > "${nginx_conf_dir}/${1}.conf"
ssl_certificate ${letsencrypt_certs_dir}/live/${1}/fullchain.pem;
ssl_certificate_key ${letsencrypt_certs_dir}/live/${1}/privkey.pem;
EOF
    reload_nginx
  fi
}

echo "Configuring domains:"
echo "$domains"

generate_dhparams_if_absent

for domain in $domains; do
  echo "Configuring domain $domain"

  generate_dummy_certificate_if_absent "$domain"

  if [ ! -d "${letsencrypt_certs_dir}/live/${domain}" ]; then
    use_dummy_certificate "$domain"
  else
    use_lets_encrypt_certificate "$domain"
  fi
done
