declare global {
  interface Window {
    __ENV__?: {
      AUTH_DOMAIN?: string;
      HASURA_GRAPHQL_ENDPOINT?: string;
    };
  }
}

// 🔹 Hasura
export function getHasuraGraphqlEndpoint(): string {
  const url = window.__ENV__?.HASURA_GRAPHQL_ENDPOINT?.trim();

  if (!url) {
    console.error('HASURA_GRAPHQL_ENDPOINT no definido en window.__ENV__');
    return '';
  }

  return url;
}

// 🔹 Auth
export function getAuthDomain(): string {
  const domain = window.__ENV__?.AUTH_DOMAIN?.trim();

  if (!domain) {
    console.error('AUTH_DOMAIN no definido en window.__ENV__');
    return '';
  }

  return domain;
}
