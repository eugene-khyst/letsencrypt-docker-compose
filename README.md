# Nginx and Let’s Encrypt with Docker Compose in less than 3 minutes

- [Overview](#3b878279a04dc47d60932cb294d96259)
- [Initial setup](#1231369e1218613623e1b520c27ce190)
  - [Prerequisites](#ee68e5b99222bbc29a480fcb0d1d6ee2)
  - [Step 0 - Create DNS records](#288c0835566de0a785d19451eac904a0)
  - [Step 1 - Edit domain names and emails in the configuration](#f24b6b41d1afb4cf65b765cf05a44ac1)
  - [Step 2 - Configure Nginx virtual hosts](#3414177b596079dbf39b1b7fa10234c6)
    - [Serving static content](#cdbe8e85146b30abdbb3425163a3b7a2)
    - [Proxying all requests to a backend server](#c156f4dfc046a4229590da3484f9478d)
  - [Step 3 - Create named Docker volumes for dummy and Let's Encrypt TLS certificates](#b56e2fee036d09a35898559d9889bae7)
  - [Step 4 - Build images and start containers using staging Let's Encrypt server](#4952d0670f6fb00a0337d2251621508a)
  - [Step 5 - verify HTTPS works with the staging certificates](#46d3804a4859874ba8b6ced6013b9966)
  - [Step 6 - Switch to production Let's Encrypt server](#04529d361bbd6586ebcf267da5f0dfd7)
  - [Step 7 - verify HTTPS works with the production certificates](#70d8ba04ba9117ff3ba72a9413131351)
- [Reloading Nginx configuration without downtime](#45a36b34f024f33bed82349e9096051a)
- [Adding a new domain to a running solution](#35a7ab6c3c12c73a0fce287690b1c216)
  - [Step 0 - Create a new DNS records](#22e1d8b6115f1b1aaf65d61ee2557e52)
  - [Step 1 - Add domain name and email to the configuration](#d0a4d4424e2e96c4dbe1a28dfddf7224)
  - [Step 2 - Configure a new Nginx virtual hosts](#96dc528b7365f5a119bb2b1893f60700)
  - [Step 3 - Restart Docker containers](#38f75935bf20b547d1f6788791645d5d)
- [Directory structure](#7cd115332ea5785828a7a0b5249f0755)
- [Configuration file structure](#bcd6f4d91c9b46c9af4d5b8c4a07db77)
- [SSL configuration for A+ rating](#f9987558925ac3a1ca42e184e10d7b73)
- [Removing a domain name from a running solution](#90d955c4-2684-11ed-a261-0242ac120002)
  - [Step 1 - Remove the .conf file](#90d9588a-2684-11ed-a261-0242ac120002)
  - [Step 2 - Remove domain name](#90d959b6-2684-11ed-a261-0242ac120002)
  - [Step 3 - Update Docker containers](#90d95ace-2684-11ed-a261-0242ac120002)

<!-- Table of contents is made with https://github.com/evgeniy-khist/markdown-toc -->

## <a id="3b878279a04dc47d60932cb294d96259"></a>Overview

This example automatically obtains and renews [Let's Encrypt](https://letsencrypt.org/) TLS certificates and sets up HTTPS in Nginx for multiple domain names using Docker Compose.

You can set up HTTPS in Nginx with Let's Encrypt TLS certificates for your domain names and get an A+ rating in [SSL Labs SSL Server Test](https://www.ssllabs.com/ssltest/) by changing a few configuration parameters of this example.

Let's Encrypt is a certificate authority that provides free X.509 certificates for TLS encryption.
The certificates are valid for 90 days and can be renewed. Both initial creation and renewal can be automated using [Certbot](https://certbot.eff.org/).

When using Kubernetes Let's Encrypt TLS certificates can be easily obtained and installed using [Cert Manager](https://cert-manager.io/).
For simple websites and applications, Kubernetes is too much overhead and Docker Compose is more suitable.
But for Docker Compose there is no such popular and robust tool for TLS certificate management.

The example supports separate TLS certificates for multiple domain names, e.g. `example.com`, `anotherdomain.net` etc.
For simplicity this example deals with the following domain names:

- `test1.evgeniy-khyst.com`
- `test2.evgeniy-khyst.com`

The idea is simple. There are 3 containers:

- **Nginx**
- **Certbot** - for obtaining and renewing certificates
- **Cron** - for triggering certificates renewal once a day

The sequence of actions:

1. Nginx generates self-signed "dummy" certificates to pass ACME challenge for obtaining Let's Encrypt certificates
2. Certbot waits for Nginx to become ready and obtains certificates
3. Cron triggers Certbot to try to renew certificates and Nginx to reload configuration daily

## <a id="1231369e1218613623e1b520c27ce190"></a>Initial setup

### <a id="ee68e5b99222bbc29a480fcb0d1d6ee2"></a>Prerequisites

1. [Docker](https://docs.docker.com/install/) and [Docker Compose](https://docs.docker.com/compose/install/) are installed
2. You have a domain name
3. You have a server with a publicly routable IP address
4. You have cloned this repository (or created and cloned a [fork](https://github.com/evgeniy-khist/letsencrypt-docker-compose/fork)):
   ```bash
   git clone https://github.com/evgeniy-khist/letsencrypt-docker-compose.git
   ```

### <a id="288c0835566de0a785d19451eac904a0"></a>Step 0 - Create DNS records

For all domain names create DNS A records to point to a server where Docker containers will be running.
Also, consider creating CNAME records for the `www` subdomains.

**DNS records**

| Type  | Hostname                      | Value                                    |
| ----- | ----------------------------- | ---------------------------------------- |
| A     | `test1.evgeniy-khyst.com`     | directs to IP address `X.X.X.X`          |
| A     | `test2.evgeniy-khyst.com`     | directs to IP address `X.X.X.X`          |
| CNAME | `www.test1.evgeniy-khyst.com` | is an alias of `test1.evgeniy-khyst.com` |
| CNAME | `www.test2.evgeniy-khyst.com` | is an alias of `test2.evgeniy-khyst.com` |

### <a id="f24b6b41d1afb4cf65b765cf05a44ac1"></a>Step 1 - Edit domain names and emails in the configuration

Specify your domain names and contact emails for these domains with space as delimiter in the [`config.env`](config.env):

```bash
DOMAINS="test1.evgeniy-khyst.com test2.evgeniy-khyst.com"
CERTBOT_EMAILS="info@evgeniy-khyst.com info@evgeniy-khyst.com"
```

For two and more domains separated by space use double quotes (`"`) around the `DOMAINS` and `CERTBOT_EMAILS` variables.

For a single domain double quotes can be omitted:

```bash
DOMAINS=test1.evgeniy-khyst.com
CERTBOT_EMAILS=info@evgeniy-khyst.com
```

### <a id="3414177b596079dbf39b1b7fa10234c6"></a>Step 2 - Configure Nginx virtual hosts

For each domain configure the Nginx [`server` block](https://nginx.org/en/docs/http/ngx_http_core_module.html#server) by updating `vhosts/${domain}.conf`:

- `vhosts/test1.evgeniy-khyst.com.conf`
- `vhosts/test2.evgeniy-khyst.com.conf`

#### <a id="cdbe8e85146b30abdbb3425163a3b7a2"></a>Serving static content

```
location / {
    root /var/www/html/my-domain;
    index index.html index.htm;
}
```

Make sure `html/my-domain` directory (relative to the repository root) exists and countains the desired content and `html` directory is mounted as `/var/www/html` in `docker-compose.yml`:

```yaml
services:
  nginx:
  #...
  volumes:
    #...
    - ./html:/var/www/html
```

#### <a id="c156f4dfc046a4229590da3484f9478d"></a>Proxying all requests to a backend server

```
location / {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://my-backend:8080/;
}
```

`my-backend` is the service name of your backend application in `docker-compose.yml`:

```yaml
services:
  my-backend:
    image: example.com/my-backend:1.0.0
    #...
    ports:
      - "8080"
```

### <a id="b56e2fee036d09a35898559d9889bae7"></a>Step 3 - Create named Docker volumes for dummy and Let's Encrypt TLS certificates

```bash
docker volume create --name=nginx_conf
docker volume create --name=letsencrypt_certs
```

### <a id="4952d0670f6fb00a0337d2251621508a"></a>Step 4 - Build images and start containers using staging Let's Encrypt server

```bash
docker compose up -d --build
docker compose logs -f
```

You can alternatively use the `docker-compose` binary.

For each domain wait for the following log messages:

```
Switching Nginx to use Let's Encrypt certificate
Reloading Nginx configuration
```

### <a id="46d3804a4859874ba8b6ced6013b9966"></a>Step 5 - verify HTTPS works with the staging certificates

For each domain open in browser `https://${domain}` and `https://www.${domain}` and verify that staging Let's Encrypt certificates are working:

- https://test1.evgeniy-khyst.com, https://www.test1.evgeniy-khyst.com
- https://test2.evgeniy-khyst.com, https://www.test2.evgeniy-khyst.com

Certificates issued by `(STAGING) Let's Encrypt` are considered not secure by browsers.

### <a id="04529d361bbd6586ebcf267da5f0dfd7"></a>Step 6 - Switch to production Let's Encrypt server

Stop the containers:

```bash
docker compose down
```

Configure to use production Let's Encrypt server in [`config.env`](config.env):

```properties
CERTBOT_TEST_CERT=0
```

Re-create the volume for Let's Encrypt certificates:

```bash
docker volume rm letsencrypt_certs
docker volume create --name=letsencrypt_certs
```

Start the containers:

```bash
docker compose up -d
docker compose logs -f
```

### <a id="70d8ba04ba9117ff3ba72a9413131351"></a>Step 7 - verify HTTPS works with the production certificates

For each domain open in browser `https://${domain}` and `https://www.${domain}` and verify that production Let's Encrypt certificates are working.

Certificates issued by `Let's Encrypt` are considered secure by browsers.

Optionally check your domains with [SSL Labs SSL Server Test](https://www.ssllabs.com/ssltest/) and review the SSL Reports.

## <a id="45a36b34f024f33bed82349e9096051a"></a>Reloading Nginx configuration without downtime

Update a configuration in `vhosts/${domain}.conf`.

Do a hot reload of the Nginx configuration:

```bash
docker compose exec --no-TTY nginx nginx -s reload
```

## <a id="35a7ab6c3c12c73a0fce287690b1c216"></a>Adding a new domain to a running solution

Let's add a third domain `test3.evgeniy-khyst.com` to a running solution.

### <a id="22e1d8b6115f1b1aaf65d61ee2557e52"></a>Step 0 - Create a new DNS records

Create DNS A record and CNAME record for `www` subdomain.

**DNS records**

| Type  | Hostname                      | Value                                    |
| ----- | ----------------------------- | ---------------------------------------- |
| A     | `test3.evgeniy-khyst.com`     | directs to IP address `X.X.X.X`          |
| CNAME | `www.test3.evgeniy-khyst.com` | is an alias of `test3.evgeniy-khyst.com` |

### <a id="d0a4d4424e2e96c4dbe1a28dfddf7224"></a>Step 1 - Add domain name and email to the configuration

Add a new domain name (`test3.evgeniy-khyst.com`) and contact email to the [`config.env`](config.env):

```properties
DOMAINS="test1.evgeniy-khyst.com test2.evgeniy-khyst.com test3.evgeniy-khyst.com"
CERTBOT_EMAILS="info@evgeniy-khyst.com info@evgeniy-khyst.com info@evgeniy-khyst.com"
```

### <a id="96dc528b7365f5a119bb2b1893f60700"></a>Step 2 - Configure a new Nginx virtual hosts

Create a virtual host configuration file `vhosts/test3.evgeniy-khyst.com.conf` for the new domain.

For example, for serving static content use the following configuration:

```
location / {
    root /var/www/html/test3.evgeniy-khyst.com;
    index index.html index.htm;
}
```

Create a webroot `html/test3.evgeniy-khyst.com` and add static content.

### <a id="38f75935bf20b547d1f6788791645d5d"></a>Step 3 - Restart Docker containers

```bash
docker compose down
docker compose up -d
docker compose logs -f
```

## <a id="7cd115332ea5785828a7a0b5249f0755"></a>Directory structure

- [`docker-compose.yml`](docker-compose.yml)
- [`.env`](.env) - specifies `COMPOSE_PROJECT_NAME` to make container names independent from the base directory name
- [`config.env`](config.env) - specifies project configuration, e.g. domain names, emails etc.
- [`nginx/`](nginx/)
  - [`Dockerfile`](nginx/Dockerfile)
  - [`nginx.sh`](nginx/nginx.sh) - entrypoint script
  - [`default.conf`](nginx/default.conf) - common settings for all domains. The file is copied to `/etc/nginx/conf.d/`
  - [`gzip.conf`](nginx/gzip.conf) - Gzip compression. Included in `default.conf`
  - [`site.conf.tpl`](nginx/site.conf.tpl) - virtual host configuration template used to create configuration files `/etc/nginx/sites/${domain}.conf` included in `default.conf`
  - [`options-ssl-nginx.conf`](nginx/options-ssl-nginx.conf) - a configuration to get A+ rating at [SSL Server Test](https://www.ssllabs.com/ssltest/). Included in `site.conf.tpl`
  - [`hsts.conf`](nginx/hsts.conf) - HTTP Strict Transport Security (HSTS) policy. Included in `site.conf.tpl`
- [`vhosts/`](vhosts/)
  - [`test1.evgeniy-khyst.com.conf`](vhosts/test1.evgeniy-khyst.com.conf) - `server` block configuration for serving static content. Included in `site.conf.tpl` (`include /etc/nginx/vhosts/${domain}.conf;`)
  - [`test2.evgeniy-khyst.com.conf`](vhosts/test2.evgeniy-khyst.com.conf) - `server` block configuration for serving static content. Included in `site.conf.tpl` (`include /etc/nginx/vhosts/${domain}.conf;`)
- [`html/`](html/)
  - [`test1.evgeniy-khyst.com/`](html/test1.evgeniy-khyst.com/) - directory mounted as a webroot for `test1.evgeniy-khyst.com`. Configured in `vhosts/test1.evgeniy-khyst.com.conf`
    - [`index.html`](html/test1.evgeniy-khyst.com/index.html)
  - [`test2.evgeniy-khyst.com/`](html/test2.evgeniy-khyst.com/) - directory mounted as a webroot for `test2.evgeniy-khyst.com`. Configured in `vhosts/test2.evgeniy-khyst.com.conf`
    - [`index.html`](html/test2.evgeniy-khyst.com/index.html)
- [`certbot/`](certbot/)
  - [`Dockerfile`](certbot/Dockerfile)
  - [`certbot.sh`](certbot/certbot.sh) - entrypoint script
- [`cron/`](cron/)
  - [`Dockerfile`](cron/Dockerfile)
  - [`renew_certs.sh`](cron/renew_certs.sh) - script executed on a daily basis to try to renew certificates

## <a id="bcd6f4d91c9b46c9af4d5b8c4a07db77"></a>Configuration file structure

To adapt the example to your domain names you need to change only [`config.env`](config.env):

```properties
DOMAINS="test1.evgeniy-khyst.com test2.evgeniy-khyst.com"
CERTBOT_EMAILS="info@evgeniy-khyst.com info@evgeniy-khyst.com"
CERTBOT_TEST_CERT=1
CERTBOT_RSA_KEY_SIZE=4096
```

Configuration parameters:

- `DOMAINS` - a space separated list of domains to manage certificates for
- `CERTBOT_EMAILS` - a space separated list of email for corresponding domains. If not specified, certificates will be obtained with `--register-unsafely-without-email`
- `CERTBOT_TEST_CERT` - use Let's Encrypt staging server (`--test-cert`)

Let's Encrypt has rate limits. So, while testing it's better to use staging server by setting `CERTBOT_TEST_CERT=1` (default value).
When you are ready to use production Let's Encrypt server, set `CERTBOT_TEST_CERT=0`.

## <a id="f9987558925ac3a1ca42e184e10d7b73"></a>SSL configuration for A+ rating

SSL in Nginx is configured accoring to best practices to get A+ rating in [SSL Labs SSL Server Test](https://www.ssllabs.com/ssltest/).

Read more about the best practices and rating:

- https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices
- https://github.com/ssllabs/research/wiki/SSL-Server-Rating-Guide

## <a id="90d955c4-2684-11ed-a261-0242ac120002"></a>Removing a domain name from a running solution

### <a id="90d9588a-2684-11ed-a261-0242ac120002"></a>Step 1 - Remove the `.conf` file

Remove the `domain.to.remove.com.conf` file from `vhost`

### <a id="90d959b6-2684-11ed-a261-0242ac120002"></a>Step 2 - Remove domain name

Remove the domain name from [`config.env`](config.env)

### <a id="90d95ace-2684-11ed-a261-0242ac120002"></a>Step 3 - Update Docker containers 

```bash
docker compose down
docker volume rm nginx_conf
docker volume create --name=nginx_conf
docker compose up -d
```
