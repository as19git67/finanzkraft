#!/bin/sh

docker run --env=PORT_HTTP=8000 --env=PORT_HTTPS=8008 \
 --env="SSL_CERT_SUBJ=/C=DE/ST=Bavaria/O=Anton Schegg/CN=finanzkraft.schegg.net"\
 -v /Users/anton/finanzkraft_data:/data -p 8008:8008 -p 8000:8000 \
 -d ghcr.io/as19git67/finanzkraft:latest
