FROM alpine:3.17

RUN apk update && \
    apk add --no-cache docker-cli docker-cli-compose

ENV RENEW_CERTS_PERIODICITY=daily
COPY renew_certs.sh /etc/periodic/${RENEW_CERTS_PERIODICITY}/renew_certs
RUN chmod +x /etc/periodic/${RENEW_CERTS_PERIODICITY}/renew_certs

WORKDIR /workdir

CMD ["crond", "-f", "-l", "0"]
