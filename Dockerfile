# syntax=docker/dockerfile:1

# example docker run:
# docker run --env=PORT_HTTP=8000 --env=PORT_HTTPS=8008 --env="SSL_CERT_SUBJ=/C=DE/ST=Bavaria/O=Anton Schegg/CN=finanzkraft.schegg.net" -v /Users/anton/finanzkraft_data:/data -p 8008:8008 -p 8000:8000 -d ghcr.io/as19git67/finanzkraft:latest

FROM node:20-alpine
RUN apk update && apk add --no-cache openssl tzdata g++ make py3-pip sqlite
WORKDIR /app
COPY . .
RUN npm install && npm rebuild node-sass && npm rebuild sqlite3 && npm run build

VOLUME ["/data"]

ARG ARG_PORT_HTTP="3000"
ENV PORT_HTTP=${ARG_PORT_HTTP}
ARG ARG_PORT_HTTPS=""
ENV PORT_HTTPS=${ARG_PORT_HTTPS}
ARG ARG_SSL_CERT_SUBJ=""
ENV SSL_CERT_SUBJ=${ARG_SSL_CERT_SUBJ}

ARG ARG_TZ="Europe/Berlin"
ENV TZ=${ARG_TZ}

ARG ARG_DBCLIENT="sqlite3"
ENV DBCLIENT=${ARG_DBCLIENT}
ARG ARG_DBHOST=""
ENV DBHOST=${ARG_DBHOST}
ARG ARG_DBPORT=""
ENV DBPORT=${ARG_DBPORT}
ARG ARG_DBNAME="finanzkraft"
ENV DBNAME=${ARG_DBNAME}
ARG ARG_DBUSERNAME=""
ENV DBUSERNAME=${ARG_DBUSERNAME}
ARG ARG_DBPASSWORD=""
ENV DBPASSWORD=${ARG_DBPASSWORD}
ARG ARG_IMPORTDATAFILE=""
ENV IMPORTDATAFILE=${ARG_IMPORTDATAFILE}

CMD ["/bin/sh", "./start.sh"]

EXPOSE $PORT_HTTP
EXPOSE $PORT_HTTPS
