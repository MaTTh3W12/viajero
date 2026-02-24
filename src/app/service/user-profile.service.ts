import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

declare global {
  interface Window {
    __ENV__?: {
      AUTH_DOMAIN?: string;
      HASURA_GRAPHQL_ENDPOINT?: string;
    };
  }
}

interface GraphQLError {
  message: string;
}

interface GraphQLResponse<TData> {
  data?: TData;
  errors?: GraphQLError[];
}

interface UpsertMutationData {
  insert_viajerosv_users: {
    affected_rows: number;
  };
}

interface GetUserByKeycloakIdData {
  viajerosv_users: UserCompanyProfile[];
}

interface GetUserByKeycloakIdVariables {
  keycloak_id: string;
}

export interface UserCompanyProfile {
  id: number;
  keycloak_id: string;
  company_commercial_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export interface UpsertUserVariables {
  keycloak_id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  document_id: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
}

export interface UpsertCompanyVariables {
  keycloak_id: string;
  email: string;
  role: string;
  company_commercial_name: string;
  company_nit: string;
  company_email: string;
  company_phone: string;
  company_logo_url: string | null;
  company_description: string | null;
  company_address: string;
  company_profile_completed: boolean;
  phone: string | null;
  country: string | null;
  city: string | null;
}

const DEFAULT_HASURA_ENDPOINT = 'https://api.grupoavanza.work/v1/graphql';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  constructor(private http: HttpClient) {}

  private get endpoint(): string {
    return window.__ENV__?.HASURA_GRAPHQL_ENDPOINT ?? DEFAULT_HASURA_ENDPOINT;
  }

  private executeOperation<TData, TVariables extends object>(
    token: string,
    query: string,
    variables: TVariables
  ): Observable<TData> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    return this.http
      .post<GraphQLResponse<TData>>(this.endpoint, { query, variables }, { headers })
      .pipe(
        map((response) => {
          if (response.errors?.length) {
            throw new Error(response.errors.map((e) => e.message).join(' | '));
          }

          if (!response.data) {
            throw new Error('GraphQL response sin data');
          }

          return response.data;
        })
      );
  }

  upsertUser(token: string, data: UpsertUserVariables): Observable<void> {
    const mutation = `
      mutation UpsertUser(
        $keycloak_id: uuid!,
        $email: String!,
        $role: String!,
        $first_name: String,
        $last_name: String,
        $document_id: String,
        $phone: String,
        $country: String,
        $city: String
      ) {
        insert_viajerosv_users(
          objects: {
            keycloak_id: $keycloak_id,
            email: $email,
            role: $role,
            first_name: $first_name,
            last_name: $last_name,
            document_id: $document_id,
            phone: $phone,
            country: $country,
            city: $city,
            active: true
          },
          on_conflict: {
            constraint: users_keycloak_id_key,
            update_columns: [
              email,
              first_name,
              last_name,
              document_id,
              phone,
              country,
              city,
              updated_at
            ]
          }
        ) {
          affected_rows
        }
      }
    `;

    return this.executeOperation<UpsertMutationData, UpsertUserVariables>(
      token,
      mutation,
      data
    ).pipe(map(() => void 0));
  }

  upsertCompany(token: string, data: UpsertCompanyVariables): Observable<void> {
    console.log('[USER-PROFILE] upsertCompany request', { endpoint: this.endpoint, data });
    const mutation = `
      mutation UpsertCompanyProfile(
        $keycloak_id: uuid!,
        $email: String!,
        $role: String!,
        $company_commercial_name: String,
        $company_nit: String,
        $company_email: String,
        $company_phone: String,
        $company_logo_url: String,
        $company_description: String,
        $company_address: String,
        $company_profile_completed: Boolean,
        $phone: String,
        $country: String,
        $city: String
      ) {
        insert_viajerosv_users(
          objects: {
            keycloak_id: $keycloak_id,
            email: $email,
            role: $role,
            company_commercial_name: $company_commercial_name,
            company_nit: $company_nit,
            company_email: $company_email,
            company_phone: $company_phone,
            company_logo_url: $company_logo_url,
            company_description: $company_description,
            company_address: $company_address,
            company_profile_completed: $company_profile_completed,
            phone: $phone,
            country: $country,
            city: $city,
            active: true
          },
          on_conflict: {
            constraint: users_keycloak_id_key,
            update_columns: [
              company_commercial_name,
              company_nit,
              company_email,
              company_phone,
              company_logo_url,
              company_description,
              company_address,
              company_profile_completed,
              phone,
              country,
              city,
              updated_at
            ]
          }
        ) {
          affected_rows
        }
      }
    `;

    return this.executeOperation<UpsertMutationData, UpsertCompanyVariables>(
      token,
      mutation,
      data
    ).pipe(map(() => void 0));
  }

  getUserByKeycloakId(token: string, keycloakId: string): Observable<UserCompanyProfile | null> {
    const query = `
      query GetUserByKeycloakId($keycloak_id: uuid!) {
        viajerosv_users(where: { keycloak_id: { _eq: $keycloak_id } }, limit: 1) {
          id
          keycloak_id
          company_commercial_name
          first_name
          last_name
          email
        }
      }
    `;

    return this.executeOperation<GetUserByKeycloakIdData, GetUserByKeycloakIdVariables>(
      token,
      query,
      { keycloak_id: keycloakId }
    ).pipe(map((data) => data.viajerosv_users[0] ?? null));
  }
}
