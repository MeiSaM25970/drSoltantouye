#!/usr/bin/env bash
# Run on the server, inside the unzipped folder:   ./install.sh
# Needs Docker with the compose plugin. nginx is installed by hand (see deploy/nginx/).
set -euo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo "Missing .env (copy .env.production.example to .env and fill it in)"; exit 1; }

if [ -d images ]; then
  for f in images/*.tar.gz; do
    [ -e "$f" ] || continue
    echo "Loading $f"
    gunzip -c "$f" | docker load
  done
  docker compose -f docker-compose.prod.yml up -d --no-build
else
  echo "No prebuilt images: building from source (needs internet for Docker Hub and npm)"
  docker compose -f docker-compose.prod.yml up -d --build
fi

echo
docker compose -f docker-compose.prod.yml ps
echo
echo "Web: http://127.0.0.1:8010   API: http://127.0.0.1:8011"
echo "Next: install deploy/nginx/drsoltantouye.ir.conf into /etc/nginx/conf.d/ and run: nginx -t && systemctl reload nginx"
