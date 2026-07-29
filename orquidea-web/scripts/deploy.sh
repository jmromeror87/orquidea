#!/usr/bin/env bash
set -euo pipefail
REMOTE_USER="ubuntu"
REMOTE_HOST="TU_IP_SERVIDOR"
NGINX_PATH="/var/www/orquidea/public"
echo "🏗  Construyendo frontend..."
npm run build
echo "📤 Subiendo dist/ al servidor..."
rsync -avz --delete dist/ ${REMOTE_USER}@${REMOTE_HOST}:${NGINX_PATH}/
echo "✅ Frontend desplegado en Nginx"
