declare global {
  interface Window {
    __ENV__?: {
      AUTH_DOMAIN?: string;
      HASURA_GRAPHQL_ENDPOINT?: string;
    };
  }
}

const MISSING_HASURA_ENDPOINT =
  'HASURA_GRAPHQL_ENDPOINT no está definido en window.__ENV__. Carga /assets/config.js antes de la aplicación.';

export function getHasuraGraphqlEndpoint(): string {
  const url = window.__ENV__?.HASURA_GRAPHQL_ENDPOINT?.trim();
  if (!url) {
    throw new Error(MISSING_HASURA_ENDPOINT);
  }
  return url;
}
