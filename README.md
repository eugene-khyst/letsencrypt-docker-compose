# letsencrypt-docker-compose

- [Overview](#3b878279a04dc47d60932cb294d96259)
- [Initial setup](#1231369e1218613623e1b520c27ce190)
  - [Prerequisites](#ee68e5b99222bbc29a480fcb0d1d6ee2)
  - [Step 1 - Create DNS records](#b6489f4e6a37a699341228745cc4a4dd)
  - [Step 2 - Copy static content or define upstream service](#57c073bed3e25df087a43db30090819a)
    - [Static content](#1accac49de3b88324dc4cd52712d9f53)
    - [Reverse proxy](#2ba6286fc21b9f37ebcf7f9d01090f17)
  - [Step 3 - Perform an initial setup using the CLI tool](#8a367c5b5b9179c1a59885c8e3f3d5d9)
  - [Step 4 - Start the services](#fd5f79fd684417e910f40b0004603b4b)
  - [Step 5 - Verify that HTTPS works with the test certificates](#e8d3ea9aff109edace9f33f04ddce45b)
  - [Step 6 - Switch to a Let's Encrypt production environment](#83c24af0719383a90a1576484c8a3e08)
  - [Step 7 - Verify that HTTPS works with the production certificates](#faeaa1e19a5682e52d8201a099044c56)
- [Adding new domains without downtime](#bd3ae334a9689684121c98cc58fd5750)
  - [Step 1 - Create new DNS records](#26fc80a8473e501027bfd6d8e774a62d)
  - [Step 2 - Copy static content or define upstream service](#57c073bed3e25df087a43db30090819a)
  - [Step 3 - Update the configuration using the CLI tool](#52187f842989030546941fc5e6bf8b96)
  - [Step 4 - Verify that HTTPS works](#ef5e718a6533a9cbacecbfc090a1fd3f)
- [Removing existing domains without downtime](#e17bbf60a7959ee0aeb00254bcc5f2f7)
- [Manually renewing all Let's Encrypt certificates](#1c9c317c41bc07f2bbc0d79f868482a5)
- [Running on a local machine not directed to by DNS records](#b879ea2c4367eac8be407f516c2a7e8d)
  - [Step 1 - Perform an initial setup using the CLI tool](#ef749984c45138b34638df669ff9c1f1)
  - [Step 2 - Start the services in dry run mode](#a62de837fdc7d81a2ab336edb62497f3)
- [Advanced Nginx configuration](#2f76e2a844c9521949ed6083ed96655b)
- [SSL configuration for A+ rating](#f9987558925ac3a1ca42e184e10d7b73)

<!-- Table of contents is made with https://github.com/evgeniy-khist/markdown-toc -->

## <a id="3b878279a04dc47d60932cb294d96259"></a>Overview

Nginx and Let’s Encrypt with Docker Compose in less than 3 minutes.

This example automatically obtains and renews [Let's Encrypt](https://letsencrypt.org/) free SSL/TLS certificates and sets up HTTPS in Nginx for multiple domain names using Docker Compose.

You can run Nginx with IPv4, IPv6, HTTP/1.1, and HTTP/2 support and set up HTTPS with Let's Encrypt TLS certificates for your domain names and get an A+ rating in [SSL Labs SSL Server Test](https://www.ssllabs.com/ssltest/) using Docker Compose and _letsencrypt-docker-compose_ interactive CLI tool.

Let's Encrypt is a certificate authority that provides free X.509 certificates for TLS encryption.
The certificates are valid for 90 days and can be renewed. Both initial creation and renewal can be automated using [Certbot](https://certbot.eff.org/).

When using Kubernetes Let's Encrypt TLS certificates can be easily obtained and installed using cloud native certificate management solutions.
For simple websites and applications, Kubernetes is too much overhead and Docker Compose is more suitable.
But for Docker Compose there is no such popular and robust tool for TLS certificate management.

The project supports separate TLS certificates for multiple domain names.

The idea is simple. There are three main services:

- `nginx`,
- `certbot` for obtaining and renewing certificates,
- `cron` for triggering certificates renewal,

and one additional service `cli` for interactive configuration.

The sequence of actions:

1. You perform an initial setup with _letsencrypt-docker-compose_ CLI tool.
2. Nginx generates self-signed "dummy" certificates to pass ACME challenge for obtaining Let's Encrypt certificates.
3. Certbot waits for Nginx to become ready and obtains certificates.
4. Cron triggers Certbot to try to renew certificates and Nginx to reload configuration daily.

## <a id="1231369e1218613623e1b520c27ce190"></a>Initial setup

### <a id="ee68e5b99222bbc29a480fcb0d1d6ee2"></a>Prerequisites

1. [Docker](https://docs.docker.com/install/) and [Docker Compose](https://docs.docker.com/compose/install/) are installed
2. You have a domain name
3. You have a server with a publicly routable IP address
4. You have cloned this repository (or created and cloned a [fork](https://github.com/evgeniy-khist/letsencrypt-docker-compose/fork)):
   ```bash
   git clone https://github.com/evgeniy-khist/letsencrypt-docker-compose.git
   ```

### <a id="b6489f4e6a37a699341228745cc4a4dd"></a>Step 1 - Create DNS records

For simplicity, this example deals with domain names `a.evgeniy-khyst.com` and `b.evgeniy-khyst.com`,
but in reality, domain names can be any (e.g., `example.com`, `anotherdomain.net`).

For all domain names create DNS A or AAAA record, or both to point to a server where Docker containers will be running.
Also, create CNAME records for the `www` subdomains if needed.

**DNS records**

| Type  | Hostname                  | Value                                |
| ----- | ------------------------- | ------------------------------------ |
| A     | `a.evgeniy-khyst.com`     | directs to IPv4 address              |
| A     | `b.evgeniy-khyst.com`     | directs to IPv4 address              |
| AAAA  | `a.evgeniy-khyst.com`     | directs to IPv6 address              |
| AAAA  | `b.evgeniy-khyst.com`     | directs to IPv6 address              |
| CNAME | `www.a.evgeniy-khyst.com` | is an alias of `a.evgeniy-khyst.com` |
| CNAME | `www.a.evgeniy-khyst.com` | is an alias of `a.evgeniy-khyst.com` |

### <a id="57c073bed3e25df087a43db30090819a"></a>Step 2 - Copy static content or define upstream service

Nginx can be configured

- to serve static content,
- as a reverse proxy (e.g., proxying all requests to a backend server).

#### <a id="1accac49de3b88324dc4cd52712d9f53"></a>Static content

Copy your static content to `html/${domain}` directory.

```bash
cp -R ./examples/html/ ./html/a.evgeniy-khyst.com
```

#### <a id="2ba6286fc21b9f37ebcf7f9d01090f17"></a>Reverse proxy

The `docker-compose.yml` contains the `example-backend` service.
It's a simple Node.js web app listening on port 8080.
Replace it with your backend service or remove it.

```yaml
services:
  example-backend:
    build: ./examples/nodejs-backend
    image: evgeniy-khyst/expressjs-helloworld
    restart: unless-stopped
```

### <a id="8a367c5b5b9179c1a59885c8e3f3d5d9"></a>Step 3 - Perform an initial setup using the CLI tool

Run the CLI tool and follow the instructions to perform an initial setup.

```bash
docker compose run --rm cli
```

On the first run, choose to obtain a test certificate from a Let's Encrypt staging server.
We will switch to a Let's Encrypt production environment after verifying that HTTPS is working with the test certificate.

![letsencrypt-docker-compose CLI initial setup](https://raw.githubusercontent.com/evgeniy-khist/letsencrypt-docker-compose/main/examples/initial-setup.svg)

### <a id="fd5f79fd684417e910f40b0004603b4b"></a>Step 4 - Start the services

On the first run, build the services.

```bash
docker compose build
```

Start the services.

```bash
docker compose up -d
```

Check the logs.

```bash
docker compose logs -f
```

For each domain wait for the following log messages:

```
Switching Nginx to use Let's Encrypt certificate
Reloading Nginx configuration
```

### <a id="e8d3ea9aff109edace9f33f04ddce45b"></a>Step 5 - Verify that HTTPS works with the test certificates

For each domain, check `https://${domain}` and `https://www.${domain}` if you configured the `www` subdomain.
Certificates issued by `(STAGING) Let's Encrypt` are considered not secure by browsers and cURL.

```bash
curl --insecure https://a.evgeniy-khyst.com
curl --insecure https://www.a.evgeniy-khyst.com
curl --insecure https://b.evgeniy-khyst.com/hello?name=Eugene
curl --insecure https://www.b.evgeniy-khyst.com/hello?name=Eugene
```

### <a id="83c24af0719383a90a1576484c8a3e08"></a>Step 6 - Switch to a Let's Encrypt production environment

Run the CLI tool, choose `Switch to a Let's Encrypt production environment` and follow the instructions.

```bash
docker compose run --rm cli
```

![letsencrypt-docker-compose CLI switch to a Let's Encrypt production environment
](https://raw.githubusercontent.com/evgeniy-khist/letsencrypt-docker-compose/main/examples/switch-to-prod-env.svg)

### <a id="faeaa1e19a5682e52d8201a099044c56"></a>Step 7 - Verify that HTTPS works with the production certificates

For each domain, check `https://${domain}` and `https://www.${domain}` if you configured the `www` subdomain.
Certificates issued by `Let's Encrypt` are considered secure by browsers and cURL.

```bash
curl https://a.evgeniy-khyst.com
curl https://www.a.evgeniy-khyst.com
curl https://b.evgeniy-khyst.com/hello?name=Eugene
curl https://www.b.evgeniy-khyst.com/hello?name=Eugene
```

Optionally check your domains with [SSL Labs SSL Server Test](https://www.ssllabs.com/ssltest/) and review the SSL Reports.

The `cron` service will automatically renew the Let's Encrypt production certificates when the time comes.

## <a id="bd3ae334a9689684121c98cc58fd5750"></a>Adding new domains without downtime

### <a id="26fc80a8473e501027bfd6d8e774a62d"></a>Step 1 - Create new DNS records

Create DNS A or AAAA record, or both.
Also, create CNAME record for `www` subdomain if needed.

**DNS records**

| Type  | Hostname                  | Value                                |
| ----- | ------------------------- | ------------------------------------ |
| A     | `c.evgeniy-khyst.com`     | directs to IPv4 address              |
| AAAA  | `c.evgeniy-khyst.com`     | directs to IPv6 address              |
| CNAME | `www.c.evgeniy-khyst.com` | is an alias of `c.evgeniy-khyst.com` |

### <a id="57c073bed3e25df087a43db30090819a"></a>Step 2 - Copy static content or define upstream service

Repeat the actions described in the [subsection of the same name in the "Initial setup" section](#ef4ad5646a9d2e1f6fd1bbbf55ef278e).

### <a id="52187f842989030546941fc5e6bf8b96"></a>Step 3 - Update the configuration using the CLI tool

Run the CLI tool, choose `Add new domains` and follow the instructions.

```bash
docker compose run --rm cli
```

### <a id="ef5e718a6533a9cbacecbfc090a1fd3f"></a>Step 4 - Verify that HTTPS works

For each new domain, check `https://${domain}` and `https://www.${domain}` if you configured the `www` subdomain.

## <a id="e17bbf60a7959ee0aeb00254bcc5f2f7"></a>Removing existing domains without downtime

Run the CLI tool, choose `Remove existing domains` and follow the instructions.

```bash
docker compose run --rm cli
```

## <a id="1c9c317c41bc07f2bbc0d79f868482a5"></a>Manually renewing all Let's Encrypt certificates

You can manually renew all of your certificates.

Certbot renewal will be executed with `--force-renewal` flag that causes the expiration time of the certificates to be ignored when considering renewal, and attempts to renew each and every installed certificate regardless of its age.

This operation is not appropriate to run daily because each certificate will be renewed every day, which will quickly run into the Let's Encrypt rate limit.

Run the CLI tool, choose `Manually renew all Let's Encrypt certificates (force renewal)` and follow the instructions.

```bash
docker compose run --rm cli
```

## <a id="b879ea2c4367eac8be407f516c2a7e8d"></a>Running on a local machine not directed to by DNS records

Running Certbot on a local machine not directed to by DNS records makes no sense
because Let’s Encrypt servers will fail to validate that you control the domain names in the certificate.

But it may be useful to run all services locally with disabled Certbot.
It is possible in dry run mode.

### <a id="ef749984c45138b34638df669ff9c1f1"></a>Step 1 - Perform an initial setup using the CLI tool

```bash
docker compose run --rm cli
```

### <a id="a62de837fdc7d81a2ab336edb62497f3"></a>Step 2 - Start the services in dry run mode

Enable dry run mode by setting the environment variable `DRY_RUN=true`.

```bash
DRY_RUN=true docker compose up -d
```

## <a id="2f76e2a844c9521949ed6083ed96655b"></a>Advanced Nginx configuration

You can configure Nginx by manually editing the `nginx-conf/nginx.conf`.

Configure virtual hosts (`server` blocks) by editing the `nginx-conf/conf.d/${domain}.conf`.

Any `.conf` file from the `nginx-conf/conf.d` directory is included in the Nginx configuration.

For example, to declare upstream servers, edit `nginx-conf/conf.d/upstreams.conf`

```
upstream backend {
    server backend1.example.com:8080;
    server backend2.example.com:8080;
}
```

After editing the Nginx configuration, do a hot reload of the Nginx configuration.

```bash
docker compose exec --no-TTY nginx nginx -s reload
```

## <a id="f9987558925ac3a1ca42e184e10d7b73"></a>SSL configuration for A+ rating

SSL in Nginx is configured accoring to best practices to get A+ rating in [SSL Labs SSL Server Test](https://www.ssllabs.com/ssltest/).

Read more about the best practices and rating:

- https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices
- https://github.com/ssllabs/research/wiki/SSL-Server-Rating-Guide
