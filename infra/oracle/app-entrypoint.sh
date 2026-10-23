#!/bin/sh
set -eu
fail() { echo 'GUTELI_STORAGE_UNAVAILABLE' >&2; exit 1; }
[ "${UPLOADS_ROOT:-}" = /app/uploads ] || fail
# A path in the image is not a mounted volume.
awk '$5 == "/app/uploads" { found=1 } END { exit !found }' /proc/self/mountinfo || fail
[ "$(cat /app/uploads/.guteli-volume 2>/dev/null)" = guteli-uploads-v1 ] || fail
[ -w /app/uploads ] || fail
probe=$(mktemp /app/uploads/.probe.XXXXXX) || fail
rm "$probe"
exec "$@"
