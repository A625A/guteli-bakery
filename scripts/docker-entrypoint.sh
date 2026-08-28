#!/bin/sh
set -eu

uploads_root="${UPLOADS_ROOT:-/app/uploads}"

mkdir -p "$uploads_root"

if [ ! -d "$uploads_root" ]; then
  echo "UPLOADS_ROOT is not a directory: $uploads_root" >&2
  exit 1
fi

touch "$uploads_root/.write-check"
rm -f "$uploads_root/.write-check"

exec "$@"
