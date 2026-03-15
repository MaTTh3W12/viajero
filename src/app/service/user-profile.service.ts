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

interface GetCurrentUserProfileData {
  viajerosv_users: UserCompanyProfile[];
}

interface GetUserByEmailVariables {
  email: string;
}

interface GetDocumentTypesData {
  viajerosv_document_types: DocumentTypeOption[];
}

interface GetCountriesPagedData {
  viajerosv_countries: CountryOption[];
  viajerosv_countries_aggregate: {
    aggregate: {
      count: number;
    } | null;
  };
}

export interface UserCompanyProfile {
  id: number | string;
  company_commercial_name: string | null;
  company_nit?: string | null;
  company_email?: string | null;
  company_phone?: string | null;
  company_logo_url?: string | null;
  company_description?: string | null;
  company_address?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
}

export interface DocumentTypeOption {
  id: string;
  description: string;
}

export interface CountryOption {
  code: string;
  name: string;
  phone_code: string | null;
}

export interface GetCountriesPagedVariables {
  limit: number;
  offset: number;
  searchTerm?: string;
}

export interface CountriesPagedResult {
  rows: CountryOption[];
  total: number;
}

export interface UpsertUserVariables {
  first_name: string | null;
  last_name: string | null;
  document_id: string | null;
  document_type_id: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
}

export interface UpsertCompanyVariables {
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
        $first_name: String,
        $last_name: String,
        $document_id: String,
        $document_type_id: String,
        $phone: String,
        $country: bpchar,
        $city: String
      ) {
        insert_viajerosv_users(
          objects: {
            first_name: $first_name,
            last_name: $last_name,
            document_id: $document_id,
            document_type_id: $document_type_id,
            phone: $phone,
            country: $country,
            city: $city,
          },
          on_conflict: {
            constraint: users_pkey,
            update_columns: [
              first_name,
              last_name,
              document_id,
              document_type_id,
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
        $company_commercial_name: String,
        $company_nit: String,
        $company_email: String,
        $company_phone: String,
        $company_logo_url: String,
        $company_description: String,
        $company_address: String,
        $company_profile_completed: Boolean,
        $phone: String,
        $country: bpchar,
        $city: String
      ) {
        insert_viajerosv_users(
          objects: {
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
            city: $city
          },
          on_conflict: {
            constraint: users_pkey,
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

  getDocumentTypes(token: string): Observable<DocumentTypeOption[]> {
    const query = `
      query GetDocumentTypes {
        viajerosv_document_types(where: { active: { _eq: true } }) {
          id
          description
        }
      }
    `;

    return this.executeOperation<GetDocumentTypesData, Record<string, never>>(
      token,
      query,
      {}
    ).pipe(map((data) => data.viajerosv_document_types ?? []));
  }

  getCountriesPaged(
    token: string,
    variables: GetCountriesPagedVariables
  ): Observable<CountriesPagedResult> {
    const query = `
      query GetCountriesPaged($limit: Int!, $offset: Int!, $searchTerm: String = "%%") {
        viajerosv_countries(
          limit: $limit,
          offset: $offset,
          order_by: { name: asc },
          where: {
            active: { _eq: true },
            name: { _ilike: $searchTerm }
          }
        ) {
          code
          name
          phone_code
        }
        viajerosv_countries_aggregate(
          where: {
            active: { _eq: true },
            name: { _ilike: $searchTerm }
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `;

    const payload: GetCountriesPagedVariables = {
      ...variables,
      searchTerm: variables.searchTerm ?? '%%',
    };

    return this.executeOperation<GetCountriesPagedData, GetCountriesPagedVariables>(
      token,
      query,
      payload
    ).pipe(
      map((data) => ({
        rows: data.viajerosv_countries ?? [],
        total: data.viajerosv_countries_aggregate.aggregate?.count ?? 0,
      }))
    );
  }

  getCurrentUserProfile(token: string, email?: string | null): Observable<UserCompanyProfile | null> {
    if (email) {
      const queryByEmail = `
        query GetUserByEmail($email: String!) {
          viajerosv_users(where: { email: { _eq: $email } }, limit: 1) {
            id
            company_commercial_name
            company_nit
            company_email
            company_phone
            company_logo_url
            company_description
            company_address
            phone
            country
            city
            email
          }
        }
      `;

      return this.executeOperation<GetCurrentUserProfileData, GetUserByEmailVariables>(
        token,
        queryByEmail,
        { email }
      ).pipe(map((data) => data.viajerosv_users[0] ?? null));
    }

    const queryCurrent = `
      query GetCurrentUserProfile {
        viajerosv_users(limit: 1) {
          id
          company_commercial_name
          company_nit
          company_email
          company_phone
          company_logo_url
          company_description
          company_address
          phone
          country
          city
          email
        }
      }
    `;

    return this.executeOperation<GetCurrentUserProfileData, Record<string, never>>(
      token,
      queryCurrent,
      {}
    ).pipe(map((data) => data.viajerosv_users[0] ?? null));
  }
}
