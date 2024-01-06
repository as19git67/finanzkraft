#!/usr/bin/env bash
# exit on error
set -e

# remove old dist directory
rm -rf dist

# build ui
cd node_modules/finanzkraftui
npm install
npm run build

# install (move) dist to server
cd ../..
mv node_modules/finanzkraftui/dist .
