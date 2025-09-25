#!/bin/sh

ln -snf /usr/share/zoneinfo/"$TZ" /etc/localtime && echo "$TZ" > /etc/timezone

{
  echo "timezone: \"$TZ\""
  echo "dataDirectory: \"/data\""
  echo "authConfigDirectory: \"/data\""
  echo "httpPort: \"$PORT_HTTP\""
  echo "httpsPort: \"$PORT_HTTPS\""
  echo "dbClient: \"$DBCLIENT\""
  echo "dbHost: \"$DBHOST\""
  echo "dbPort: \"$DBPORT\""
  echo "dbName: \"$DBNAME\""
  echo "dbUsername: \"$DBUSERNAME\""
  echo "dbPassword: \"$DBPASSWORD\""
  echo "importDatafile: \"$IMPORTDATAFILE\""
  echo "exportDatafile: \"$EXPORTDATAFILE\""
  echo "adminUser: \"$INITIALADMINUSER\""
  echo "initialAdminPassword: \"$INITIALADMINUSERPASSWORD\""
  echo "fintsProductId: \"$FINTSPRODUCTID\""
  echo "fintsProductVersion: \"$FINTSPRODUCTVERSION\""
  echo "privateKeyPassphrase: \"$PRIVATEKEYPASSPHRASE\""
} >  /app/settings.yaml

if [ ! -f /data/key.pem ]
then
  if [ -n "${SSL_CERT_SUBJ:+x}" ]; then
    openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout /data/key.pem -out /data/cert.pem -subj "$SSL_CERT_SUBJ";
  fi
fi

npm rebuild node-sass && npm rebuild sqlite3
node ./app.js
