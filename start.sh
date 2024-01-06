#!/bin/sh

ln -snf /usr/share/zoneinfo/"$TZ" /etc/localtime && echo "$TZ" > /etc/timezone

{
  echo "\"timezone\": \"$TZ\""
  echo "\"dataDirectory\": \"/data\""
  echo "\"authConfigDirectory\": \"/data\""
  echo "\"httpPort\": \"$PORT_HTTP\""
  echo "\"httpsPort\": \"$PORT_HTTPS\""
} >  /app/settings.yaml

if [ ! -f /data/key.pem ]
then
  if [ -n "${SSL_CERT_SUBJ:+x}" ]; then
    openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout /data/key.pem -out /data/cert.pem -subj "$SSL_CERT_SUBJ";
  fi
fi
node ./server.js
