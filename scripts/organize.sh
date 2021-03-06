#!/bin/sh
set -e

if [ -d organize/$1 ]; then
  echo "Skipping organize, directory exists: organize/$1"
else
  cp -r ./extract/$1 ./organize/$1
  time ./scripts/organize.js ./extract/$1 ./organize/$1
  npm run build
  cp -r ./static/* ./organize/$1
fi
