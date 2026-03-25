declare global {
  interface Window {
    __ENV__?: {
      AUTH_DOMAIN?: string;
      HASURA_GRAPHQL_ENDPOINT?: string;
    };
  }
}

const MISSING_HASURA_ENDPOINT =
  'HASURA_GRAPHQL_ENDPOINT no está definido en window.__ENV__. Verifica que config.js esté cargado correctamente.';

export function getHasuraGraphqlEndpoint(): string {
  const url = window.__ENV__?.HASURA_GRAPHQL_ENDPOINT?.trim();

  if (!url) {
    console.error('HASURA_GRAPHQL_ENDPOINT no definido en window.__ENV__');
    return '';
  }

  return url;
}
