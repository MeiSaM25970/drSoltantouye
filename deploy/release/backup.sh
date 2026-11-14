#!/usr/bin/env bash
# Database dump + uploaded files into ./backups/
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
stamp=$(date +%Y%m%d-%H%M%S)
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U clinic clinic | gzip > "backups/db-$stamp.sql.gz"
docker compose -f docker-compose.prod.yml exec -T api tar -C /app/apps/api -czf - uploads > "backups/uploads-$stamp.tar.gz"
echo "Saved backups/db-$stamp.sql.gz and backups/uploads-$stamp.tar.gz"
