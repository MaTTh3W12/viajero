#!/bin/sh
set -e

echo "🔧 Generando config.js dinámico..."

cat <<EOF > /usr/share/nginx/html/config.js
window.__ENV__ = {
  AUTH_DOMAIN: "${AUTH_DOMAIN:-auth.grupoavanza.work}",
  HASURA_GRAPHQL_ENDPOINT: "${HASURA_GRAPHQL_ENDPOINT:-https://api.grupoavanza.work/v1/graphql}",
};
EOF

echo "✅ config.js generado:"
cat /usr/share/nginx/html/config.js

exec "$@"
