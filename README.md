# Nginx and Let’s Encrypt with Docker Compose in less than 3 minutes

- [Overview](#3b878279a04dc47d60932cb294d96259)
- [Directory Structure](#3ea4b283eb322e1c6373d63f91d032be)
- [Configuration File Structure](#4ca1bfef987fafc0bf59774b4e88d407)
- [Initial Setup](#6641666d7bc2748bab0ac80cdec3a2a3)
  - [Prerequisites](#ee68e5b99222bbc29a480fcb0d1d6ee2)
  - [Step 0 - Create DNS records](#288c0835566de0a785d19451eac904a0)
  - [Step 1 - Edit domain names and emails in the configuration](#f24b6b41d1afb4cf65b765cf05a44ac1)
  - [Step 2 - Create named Docker volumes for dummy and Let's Encrypt TLS certificates](#eb07e72448b737f74a22642f6f4948d3)
  - [Step 3 - Build images and start containers](#d29a162d56e4543891fe08143e783c44)
  - [Step 4 - Switch to production Let's Encrypt server after verifying HTTPS works with test certificates](#ecc27bc4675f17370eced9ac6ef645a0)
- [Adding a New Domain to a Running Solution ](#df4dbc9f0317b0524962bc438bed627b)
  - [Step 0 - Create new DNS records](#916908b9675aac57d95610d559b4fc14)
  - [Step 1 - Add domain name and email to the configuration](#d0a4d4424e2e96c4dbe1a28dfddf7224)
  - [Step 2 - Create a web root and add static content ](#10d817b3643b051e8bf78fd5612912b7)
  - [Step 3 - Restart Docker containers](#38f75935bf20b547d1f6788791645d5d)

<!-- Table of contents is made with https://github.com/evgeniy-khist/markdown-toc -->

## <a id="3b878279a04dc47d60932cb294d96259"></a>Overview

This example automatically obtains and renews [Let's Encrypt](https://letsencrypt.org/) TLS certificates and set up HTTPS in Nginx for multiple domain names using Docker Compose.

You can set up HTTPS in Nginx with Let's Encrypt TLS certificates for your domain names and get A+ rating at [SSL Labs SSL Server Test](https://www.ssllabs.com/ssltest/) by changing a few configuration parameters of this example.

Let's Encrypt is a certificate authority that provides free X.509 certificates for TLS encryption.
The certificates are valid for 90 days and can be renewed. Both initial creation and renewal can be automated using [Certbot](https://certbot.eff.org/).

When using Kubernetes Let's Encrypt TLS certificates can be easily obtained and installed using [Cert Manager](https://cert-manager.io/).
For simple web sites and applications Kubernetes is too much overhead and Docker Compose is more suitable.
But for Docker Compose there is no such popular and robust tool for TLS certificate management.

The example supports separate TLS certificates for multiple domain names, e.g. `example.com`, `anotherdomain.net` etc.
For simplicity this example deals with the following domain names:

* `test1.evgeniy-khyst.com`
* `test2.evgeniy-khyst.com`

The idea is simple. There are 3 containers: 

* **Nginx**
* **Certbot** - for obtaining and renewing certificates
* **Cron** - for triggering certificates renewal once a day

The sequence of actions:

* Nginx generates self-signed "dummy" certificates to pass ACME challenge for obtaining Let's Encrypt certificates
* Certbot waits for Nginx to become ready and obtains certificates
* Cron triggers Certbot to try to renew certificates and Nginx to reload configuration on a daily basis

## <a id="3ea4b283eb322e1c6373d63f91d032be"></a>Directory Structure

The directories and files:

* [`docker-compose.yml`](docker-compose.yml)
* [`.env`](.env) - specifies `COMPOSE_PROJECT_NAME` to make container names independent from the base directory name
* [`config.env`](config.env) - specifies project configuration, e.g. domain names, emails etc.
* [`html/`](html/)
    * [`test1.evgeniy-khyst.com/`](html/test1.evgeniy-khyst.com/) - directory mounted as a web root for Nginx server `test1.evgeniy-khyst.com`
        * [`index.html`](html/test1.evgeniy-khyst.com/index.html)
    * [`test2.evgeniy-khyst.com/`](html/test2.evgeniy-khyst.com/) - directory mounted as a web root for Nginx server `test2.evgeniy-khyst.com`
        * [`index.html`](html/test2.evgeniy-khyst.com/index.html)
* [`nginx/`](nginx/)
    * [`Dockerfile`](nginx/Dockerfile)
    * [`nginx.sh`](nginx/nginx.sh) - entrypoint script
    * [`hsts.conf`](nginx/hsts.conf) - HTTP Strict Transport Security (HSTS) policy
    * [`default.conf`](nginx/default.conf) - Nginx configuration with common settings for all domains. The file is copied to `/etc/nginx/conf.d/`
    * [`site.conf.tpl`](nginx/site.conf.tpl) - Nginx configuration template. Contains a configuration to get A+ rating at [SSL Server Test](https://www.ssllabs.com/ssltest/). Configuration files based on this template are created as `/etc/nginx/sites/${domain}.conf`. These configuration files are included by `default.conf`
* [`certbot/`](certbot/)
    * [`Dockerfile`](certbot/Dockerfile)
    * [`certbot.sh`](certbot/certbot.sh) - entrypoint script
* [`cron/`](cron/)
    * [`Dockerfile`](cron/Dockerfile)
    * [`renew_certs.sh`](cron/renew_certs.sh) - script executed on a daily basis to try to renew certificates

## <a id="4ca1bfef987fafc0bf59774b4e88d407"></a>Configuration File Structure

To adapt the example to your domain names you need to change only [`config.env`](config.env):

```properties
DOMAINS=test1.evgeniy-khyst.com test2.evgeniy-khyst.com
CERTBOT_EMAILS=info@evgeniy-khyst.com info@evgeniy-khyst.com
CERTBOT_TEST_CERT=1
CERTBOT_RSA_KEY_SIZE=4096
```

Configuration parameters:

* `DOMAINS` - a space separated list of domains to manage certificates for
* `CERTBOT_EMAILS` - a space separated list of email for corresponding domains. If not specified, certificates will be obtained with `--register-unsafely-without-email`
* `CERTBOT_TEST_CERT` - use Let's Encrypt staging server (`--test-cert`)

Let's Encrypt has rate limits. So, while testing it's better to use staging server by setting `CERTBOT_TEST_CERT=1` (default value).
When you are ready to use production Let's Encrypt server, set `CERTBOT_TEST_CERT=0`.

## <a id="6641666d7bc2748bab0ac80cdec3a2a3"></a>Initial Setup

### <a id="ee68e5b99222bbc29a480fcb0d1d6ee2"></a>Prerequisites

1. [Docker](https://docs.docker.com/install/) and [Docker Compose](https://docs.docker.com/compose/install/) are installed
2. You have a domain name
3. You have a server with a publicly routable IP address
4. You have cloned this repository
   ```bash
   git clone https://github.com/evgeniy-khist/letsencrypt-docker-compose.git
   ```

### <a id="288c0835566de0a785d19451eac904a0"></a>Step 0 - Create DNS records

For all domain names create DNS A records to point to a server where Docker containers will be running.
Also, consider creating CNAME records for `www` subdomains.

**DNS records**

| Type | Hostname | Value |
| --- | --- | --- |
| A | `test1.evgeniy-khyst.com` | directs to IP address `X.X.X.X` |
| A | `test2.evgeniy-khyst.com` | directs to IP address `X.X.X.X` |
| CNAME | `www.test1.evgeniy-khyst.com` | is an alias of `test1.evgeniy-khyst.com` |
| CNAME | `www.test2.evgeniy-khyst.com` | is an alias of `test2.evgeniy-khyst.com` |

### <a id="f24b6b41d1afb4cf65b765cf05a44ac1"></a>Step 1 - Edit domain names and emails in the configuration

Specify your domain names and contact emails for these domains in the [`config.env`](config.env):

```properties
DOMAINS=test1.evgeniy-khyst.com test2.evgeniy-khyst.com
CERTBOT_EMAILS=info@evgeniy-khyst.com info@evgeniy-khyst.com
```

### <a id="eb07e72448b737f74a22642f6f4948d3"></a>Step 2 - Create named Docker volumes for dummy and Let's Encrypt TLS certificates

```bash
docker volume create --name=nginx_ssl
docker volume create --name=letsencrypt_certs
```

### <a id="d29a162d56e4543891fe08143e783c44"></a>Step 3 - Build images and start containers

```bash
docker-compose up -d --build
```

### <a id="ecc27bc4675f17370eced9ac6ef645a0"></a>Step 4 - Switch to production Let's Encrypt server after verifying HTTPS works with test certificates

Stop the containers:

```bash
docker-compose down
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
docker-compose up -d
```

## <a id="df4dbc9f0317b0524962bc438bed627b"></a>Adding a New Domain to a Running Solution 

Let's add a third domain `test3.evgeniy-khyst.com` to the running solution.

### <a id="916908b9675aac57d95610d559b4fc14"></a>Step 0 - Create new DNS records

Create DNS A record and CNAME record for `www` subdomain.

**DNS records**

| Type | Hostname | Value |
| --- | --- | --- |
| A | `test3.evgeniy-khyst.com` | directs to IP address `X.X.X.X` |
| CNAME | `www.test3.evgeniy-khyst.com` | is an alias of `test3.evgeniy-khyst.com` |

### <a id="d0a4d4424e2e96c4dbe1a28dfddf7224"></a>Step 1 - Add domain name and email to the configuration

Add new domain name (`test3.evgeniy-khyst.com`) and contact email to the [`config.env`](config.env):

```properties
DOMAINS=test1.evgeniy-khyst.com test2.evgeniy-khyst.com test3.evgeniy-khyst.com
CERTBOT_EMAILS=info@evgeniy-khyst.com info@evgeniy-khyst.com info@evgeniy-khyst.com
```

### <a id="10d817b3643b051e8bf78fd5612912b7"></a>Step 2 - Create a web root and add static content 

Create a web root for a new domain `test3.evgeniy-khyst.com`:

```bash
mkdir html/test3.evgeniy-khyst.com/
```

Add some static content:

```bash
cp html/test1.evgeniy-khyst.com/index.html html/test3.evgeniy-khyst.com/
```

### <a id="38f75935bf20b547d1f6788791645d5d"></a>Step 3 - Restart Docker containers


```bash
docker-compose down
docker-compose up -d
```
