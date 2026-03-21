#!/bin/sh
set -e

cat <<EOF > /usr/share/nginx/html/config.js
window.__ENV__ = {
  AUTH_DOMAIN: "${AUTH_DOMAIN:-auth.grupoavanza.work}",
  HASURA_GRAPHQL_ENDPOINT: "${HASURA_GRAPHQL_ENDPOINT:-https://api.grupoavanza.work/v1/graphql}",
};
EOF

mkdir -p /usr/share/nginx/html/assets
cat <<EOF > /usr/share/nginx/html/assets/config.js
window.__ENV__ = {
  AUTH_DOMAIN: "${AUTH_DOMAIN:-auth.grupoavanza.work}",
  HASURA_GRAPHQL_ENDPOINT: "${HASURA_GRAPHQL_ENDPOINT:-https://api.grupoavanza.work/v1/graphql}",
};
EOF

exec "$@"
