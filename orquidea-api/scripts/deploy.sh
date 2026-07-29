#!/usr/bin/env bash
# ════════════════════════════════════════════════
#  Deploy: local → producción (Ubuntu / DigitalOcean)
#  Uso: ./scripts/deploy.sh
# ════════════════════════════════════════════════
set -euo pipefail

REMOTE_USER="ubuntu"
REMOTE_HOST="TU_IP_SERVIDOR"
REMOTE_PATH="/var/www/orquidea"

echo "🚀 Iniciando deploy de Orquídea API..."

# Sincronizar archivos (excluye node_modules y .env)
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'logs' \
  --exclude 'src/uploads' \
  ./ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/orquidea-api/

# Comandos remotos
ssh ${REMOTE_USER}@${REMOTE_HOST} << REMOTE
  cd ${REMOTE_PATH}/orquidea-api
  npm install --omit=dev
  node scripts/migrate.js
  pm2 restart orquidea-api || pm2 start src/server.js --name orquidea-api
  echo "✅ API desplegada correctamente"
REMOTE
