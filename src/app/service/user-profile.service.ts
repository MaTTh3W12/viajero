import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';

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

interface GetUserCompanyLogoData {
  viajerosv_users_with_logo_base64: UserCompanyLogo[];
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
  company_mobile?: string | null;
  company_logo_url?: string | null;
  company_description?: string | null;
  description?: string | null;
  company_address?: string | null;
  company_category?: number | null;
  company_website?: string | null;
  company_map_url?: string | null;
  company_facebook?: string | null;
  company_instagram?: string | null;
  company_twitter?: string | null;
  company_youtube?: string | null;
  company_profile_completed?: boolean | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  document_id?: string | null;
  document_type_id?: string | null;
  email: string;
}

export interface UserCompanyLogo {
  id: string;
  company_logo_base64: string | null;
  company_logo_size: number | null;
  company_logo_mime_type: string | null;
}

export interface UserCompanyLogo {
  id: string;
  company_logo_base64: string | null;
  company_logo_size: number | null;
  company_logo_mime_type: string | null;
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
  company_commercial_name: string | null;
  company_nit: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_mobile?: string | null;
  company_logo_url: string | null;
  company_description: string | null;
  description?: string | null;
  company_address: string | null;
  company_category?: number | null;
  company_website?: string | null;
  company_map_url?: string | null;
  company_facebook?: string | null;
  company_instagram?: string | null;
  company_twitter?: string | null;
  company_youtube?: string | null;
  company_profile_completed: boolean | null;
  image?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  document_id?: string | null;
  document_type_id?: string | null;
  phone?: string | null;
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
      mutation UpsertUserFromJwt(
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
            active: true
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
          returning {
            id
            role
            email
            first_name
            last_name
            document_id
            document_type_id
            phone
            city
            active
            created_at
            updated_at
            country
            countryByCountry {
              code
              phone_code
              name
            }
          }
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
    const mutationWithDescription = `
      mutation UpsertCompanyProfile(
        $company_commercial_name: String,
        $company_nit: String,
        $company_email: String,
        $company_phone: String,
        $company_mobile: String,
        $company_logo_url: String,
        $company_description: String,
        $description: String,
        $company_address: String,
        $company_category: bigint,
        $company_website: String,
        $company_map_url: String,
        $company_facebook: String,
        $company_instagram: String,
        $company_twitter: String,
        $company_youtube: String,
        $company_profile_completed: Boolean,
        $image: String,
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
            company_commercial_name: $company_commercial_name,
            company_nit: $company_nit,
            company_email: $company_email,
            company_phone: $company_phone,
            company_mobile: $company_mobile,
            company_logo_url: $company_logo_url,
            company_description: $company_description,
            description: $description,
            company_address: $company_address,
            company_category: $company_category,
            company_website: $company_website,
            company_map_url: $company_map_url,
            company_facebook: $company_facebook,
            company_instagram: $company_instagram,
            company_twitter: $company_twitter,
            company_youtube: $company_youtube,
            company_profile_completed: $company_profile_completed,
            company_logo_base64_upload: $image,
            first_name: $first_name,
            last_name: $last_name,
            document_id: $document_id,
            document_type_id: $document_type_id,
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
              company_mobile,
              company_logo_url,
              company_description,
              description,
              company_address,
              company_category,
              company_website,
              company_map_url,
              company_facebook,
              company_instagram,
              company_twitter,
              company_youtube,
              company_profile_completed,
              company_logo_base64_upload,
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
          returning {
            id
          }
        }
      }
    `;

    const mutationFallback = `
      mutation UpsertCompanyProfile(
        $company_commercial_name: String,
        $company_nit: String,
        $company_email: String,
        $company_phone: String,
        $company_mobile: String,
        $company_logo_url: String,
        $company_description: String,
        $company_address: String,
        $company_category: bigint,
        $company_website: String,
        $company_map_url: String,
        $company_facebook: String,
        $company_instagram: String,
        $company_twitter: String,
        $company_youtube: String,
        $company_profile_completed: Boolean,
        $image: String,
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
            company_commercial_name: $company_commercial_name,
            company_nit: $company_nit,
            company_email: $company_email,
            company_phone: $company_phone,
            company_mobile: $company_mobile,
            company_logo_url: $company_logo_url,
            company_description: $company_description,
            company_address: $company_address,
            company_category: $company_category,
            company_website: $company_website,
            company_map_url: $company_map_url,
            company_facebook: $company_facebook,
            company_instagram: $company_instagram,
            company_twitter: $company_twitter,
            company_youtube: $company_youtube,
            company_profile_completed: $company_profile_completed,
            company_logo_base64_upload: $image,
            first_name: $first_name,
            last_name: $last_name,
            document_id: $document_id,
            document_type_id: $document_type_id,
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
              company_mobile,
              company_logo_url,
              company_description,
              company_address,
              company_category,
              company_website,
              company_map_url,
              company_facebook,
              company_instagram,
              company_twitter,
              company_youtube,
              company_profile_completed,
              company_logo_base64_upload,
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
          returning {
            id
          }
        }
      }
    `;

    const fallbackData: Omit<UpsertCompanyVariables, 'description'> = { ...data };
    delete (fallbackData as { description?: string | null }).description;

    return this.executeOperation<UpsertMutationData, UpsertCompanyVariables>(
      token,
      mutationWithDescription,
      data
    ).pipe(
      catchError(() =>
        this.executeOperation<UpsertMutationData, Omit<UpsertCompanyVariables, 'description'>>(
          token,
          mutationFallback,
          fallbackData
        )
      ),
      map(() => void 0)
    );
  }

  getUserCompanyLogo(token: string, id: string): Observable<UserCompanyLogo | null> {
    const query = `
      query GetUserCompanyLogo($id: uuid!) {
        viajerosv_users_with_logo_base64(where: { id: { _eq: $id } }) {
          id
          company_logo_base64
          company_logo_size
          company_logo_mime_type
        }
      }
    `;

    return this.executeOperation<GetUserCompanyLogoData, { id: string }>(token, query, { id }).pipe(
      map((data) => data.viajerosv_users_with_logo_base64[0] ?? null)
    );
  }

  getCurrentUserCompanyLogo(token: string): Observable<UserCompanyLogo | null> {
    const query = `
      query GetCurrentUserCompanyLogo {
        viajerosv_users_with_logo_base64(limit: 1) {
          id
          company_logo_base64
          company_logo_size
          company_logo_mime_type
        }
      }
    `;

    return this.executeOperation<GetUserCompanyLogoData, Record<string, never>>(token, query, {}).pipe(
      map((data) => data.viajerosv_users_with_logo_base64[0] ?? null)
    );
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
            company_mobile
            company_logo_url
            company_description
            description
            company_address
            company_category
            company_website
            company_map_url
            company_facebook
            company_instagram
            company_twitter
            company_youtube
            company_profile_completed
            country
            city
            first_name
            last_name
            document_id
            document_type_id
            phone
            email
          }
        }
      `;

      const queryByEmailPhoneAlias = `
        query GetUserByEmailPhoneAlias($email: String!) {
          viajerosv_users(where: { email: { _eq: $email } }, limit: 1) {
            id
            company_commercial_name
            company_nit
            company_email
            company_phone: phone
            company_mobile
            company_logo_url
            company_description
            description
            company_address
            company_category
            company_website
            company_map_url
            company_facebook
            company_instagram
            company_twitter
            company_youtube
            company_profile_completed
            country
            city
            first_name
            last_name
            document_id
            document_type_id
            phone
            email
          }
        }
      `;

      const queryByEmailFallback = `
        query GetUserByEmailFallback($email: String!) {
          viajerosv_users(where: { email: { _eq: $email } }, limit: 1) {
            id
            company_commercial_name
            company_nit
            company_email
            company_phone
            company_mobile
            company_logo_url
            company_description
            company_address
            company_category
            company_website
            company_map_url
            company_facebook
            company_instagram
            company_twitter
            company_youtube
            company_profile_completed
            country
            city
            first_name
            last_name
            document_id
            document_type_id
            phone
            email
          }
        }
      `;

      const queryByEmailPhoneAliasFallback = `
        query GetUserByEmailPhoneAliasFallback($email: String!) {
          viajerosv_users(where: { email: { _eq: $email } }, limit: 1) {
            id
            company_commercial_name
            company_nit
            company_email
            company_phone: phone
            company_mobile
            company_logo_url
            company_description
            company_address
            company_category
            company_website
            company_map_url
            company_facebook
            company_instagram
            company_twitter
            company_youtube
            company_profile_completed
            country
            city
            first_name
            last_name
            document_id
            document_type_id
            phone
            email
          }
        }
      `;

      return this.executeOperation<GetCurrentUserProfileData, GetUserByEmailVariables>(
        token,
        queryByEmail,
        { email }
      ).pipe(
        catchError(() =>
          this.executeOperation<GetCurrentUserProfileData, GetUserByEmailVariables>(
            token,
            queryByEmailPhoneAlias,
            { email }
          )
        ),
        catchError(() =>
          this.executeOperation<GetCurrentUserProfileData, GetUserByEmailVariables>(
            token,
            queryByEmailFallback,
            { email }
          )
        ),
        catchError(() =>
          this.executeOperation<GetCurrentUserProfileData, GetUserByEmailVariables>(
            token,
            queryByEmailPhoneAliasFallback,
            { email }
          )
        ),
        map((data) => data.viajerosv_users[0] ?? null)
      );
    }

    const queryCurrent = `
      query GetCurrentUserProfile {
        viajerosv_users(limit: 1) {
          id
          company_commercial_name
          company_nit
          company_email
          company_phone
          company_mobile
          company_logo_url
          company_description
          description
          company_address
          company_category
          company_website
          company_map_url
          company_facebook
          company_instagram
          company_twitter
          company_youtube
          company_profile_completed
          country
          city
          first_name
          last_name
          document_id
          document_type_id
          phone
          email
        }
      }
    `;

    const queryCurrentPhoneAlias = `
      query GetCurrentUserProfilePhoneAlias {
        viajerosv_users(limit: 1) {
          id
          company_commercial_name
          company_nit
          company_email
          company_phone: phone
          company_mobile
          company_logo_url
          company_description
          description
          company_address
          company_category
          company_website
          company_map_url
          company_facebook
          company_instagram
          company_twitter
          company_youtube
          company_profile_completed
          country
          city
          first_name
          last_name
          document_id
          document_type_id
          phone
          email
        }
      }
    `;

    const queryCurrentFallback = `
      query GetCurrentUserProfileFallback {
        viajerosv_users(limit: 1) {
          id
          company_commercial_name
          company_nit
          company_email
          company_phone
          company_mobile
          company_logo_url
          company_description
          company_address
          company_category
          company_website
          company_map_url
          company_facebook
          company_instagram
          company_twitter
          company_youtube
          company_profile_completed
          country
          city
          first_name
          last_name
          document_id
          document_type_id
          phone
          email
        }
      }
    `;

    const queryCurrentPhoneAliasFallback = `
      query GetCurrentUserProfilePhoneAliasFallback {
        viajerosv_users(limit: 1) {
          id
          company_commercial_name
          company_nit
          company_email
          company_phone: phone
          company_mobile
          company_logo_url
          company_description
          company_address
          company_category
          company_website
          company_map_url
          company_facebook
          company_instagram
          company_twitter
          company_youtube
          company_profile_completed
          country
          city
          first_name
          last_name
          document_id
          document_type_id
          phone
          email
        }
      }
    `;

    return this.executeOperation<GetCurrentUserProfileData, Record<string, never>>(
      token,
      queryCurrent,
      {}
    ).pipe(
      catchError(() =>
        this.executeOperation<GetCurrentUserProfileData, Record<string, never>>(
          token,
          queryCurrentPhoneAlias,
          {}
        )
      ),
      catchError(() =>
        this.executeOperation<GetCurrentUserProfileData, Record<string, never>>(
          token,
          queryCurrentFallback,
          {}
        )
      ),
      catchError(() =>
        this.executeOperation<GetCurrentUserProfileData, Record<string, never>>(
          token,
          queryCurrentPhoneAliasFallback,
          {}
        )
      ),
      map((data) => data.viajerosv_users[0] ?? null)
    );
  }
}
