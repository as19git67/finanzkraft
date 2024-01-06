# syntax=docker/dockerfile:1

# example docker run:
# docker run --env=PORT_HTTP=8000 --env=PORT_HTTPS=8008 --env="SSL_CERT_SUBJ=/C=DE/ST=Bavaria/O=Feuerwehr XYZ/CN=firenotifier.example.com" --env="BEARER_TOKENS_JSON={ \"aagkdd\": \"testapp\" }" -p 8008:8008 -p 8000:8000 -d ghcr.io/as19git67/firenotifier:main

FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build

VOLUME ["/data"]

ARG ARG_PORT_HTTP="3000"
ENV PORT_HTTP=${ARG_PORT_HTTP}
ARG ARG_PORT_HTTPS="3001"
ENV PORT_HTTPS=${ARG_PORT_HTTPS}
ARG ARG_SSL_CERT_SUBJ=""
ENV SSL_CERT_SUBJ=${ARG_SSL_CERT_SUBJ}


RUN yarn install --production
RUN apk update && apk add --no-cache openssl tzdata

ARG ARG_TZ="Europe/Berlin"
ENV TZ=${ARG_TZ}

CMD ["/bin/sh", "./start.sh"]

EXPOSE $PORT_HTTP
EXPOSE $PORT_HTTPS
