#!/bin/sh
set -eu
fail() { echo 'GUTELI_DATABASE_VOLUME_UNAVAILABLE' >&2; exit 1; }
awk '$5 == "/data" { found=1 } END { exit !found }' /proc/self/mountinfo || fail
[ "$(cat /data/.guteli-volume 2>/dev/null)" = guteli-data-v1 ] || fail
[ "$(cat /data/postgres/PG_VERSION 2>/dev/null)" = 17 ] || fail
[ -w /data/postgres ] || fail
exec /usr/local/bin/docker-entrypoint.sh "$@"
