import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

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

interface CompanyCountryReference {
  code: string;
  phone_code: string | null;
  name: string | null;
}

interface CompanyStatusValue {
  value: string | null;
}

interface CompanyListRow {
  id: number | string;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  company_commercial_name: string | null;
  company_nit: string | null;
  company_description: string | null;
  company_address: string | null;
  company_profile_completed: boolean | null;
  company_email: string | null;
  company_phone: string | null;
  company_logo_url: string | null;
  company_category?: number | string | null;
  city: string | null;
  country: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  countryByCountry: CompanyCountryReference | null;
  company_statuses: CompanyStatusValue[] | null;
}

interface GetCompaniesData {
  viajerosv_users: CompanyListRow[];
  viajerosv_users_aggregate: {
    aggregate: {
      count: number;
    } | null;
  } | null;
}

interface CompanyAccessMutationData {
  update_viajerosv_users: {
    affected_rows: number;
  } | null;
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

export interface GetCompaniesPagedVariables {
  limit: number;
  offset: number;
  where: Record<string, unknown>;
  order_by?: Array<Record<string, 'asc' | 'desc'>>;
}

export interface CompanyListItem {
  id: number | string;
  active: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
  companyCommercialName: string | null;
  companyNit: string | null;
  companyDescription: string | null;
  companyAddress: string | null;
  companyProfileCompleted: boolean | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyLogoUrl: string | null;
  companyCategoryId: number | null;
  city: string | null;
  country: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  countryRef: CompanyCountryReference | null;
  statusValue: string | null;
}

export interface CompaniesPagedResult {
  rows: CompanyListItem[];
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

  getCompaniesPaged(
    token: string,
    variables: GetCompaniesPagedVariables
  ): Observable<CompaniesPagedResult> {
    const queryWithCategory = `
      query GetCompanies(
        $limit: Int!,
        $offset: Int!,
        $where: viajerosv_users_bool_exp!,
        $order_by: [viajerosv_users_order_by!]
      ) {
        viajerosv_users(
          limit: $limit,
          offset: $offset,
          where: $where,
          order_by: $order_by
        ) {
          id
          active
          created_at
          updated_at
          company_commercial_name
          company_nit
          company_description
          company_address
          company_profile_completed
          company_email
          company_phone
          company_logo_url
          company_category
          city
          country
          first_name
          last_name
          email
          countryByCountry {
            code
            phone_code
            name
          }
          company_statuses {
            value
          }
        }
        viajerosv_users_aggregate(where: $where) {
          aggregate {
            count
          }
        }
      }
    `;

    const queryFallback = `
      query GetCompanies(
        $limit: Int!,
        $offset: Int!,
        $where: viajerosv_users_bool_exp!,
        $order_by: [viajerosv_users_order_by!]
      ) {
        viajerosv_users(
          limit: $limit,
          offset: $offset,
          where: $where,
          order_by: $order_by
        ) {
          id
          active
          created_at
          updated_at
          company_commercial_name
          company_nit
          company_description
          company_address
          company_profile_completed
          company_email
          company_phone
          company_logo_url
          city
          country
          first_name
          last_name
          email
          countryByCountry {
            code
            phone_code
            name
          }
          company_statuses {
            value
          }
        }
        viajerosv_users_aggregate(where: $where) {
          aggregate {
            count
          }
        }
      }
    `;

    return this.executeOperation<GetCompaniesData, GetCompaniesPagedVariables>(
      token,
      queryWithCategory,
      variables
    ).pipe(
      catchError(() =>
        this.executeOperation<GetCompaniesData, GetCompaniesPagedVariables>(
          token,
          queryFallback,
          variables
        )
      ),
      map((data) => ({
        rows: (data.viajerosv_users ?? [])
          .map((row) => this.mapCompanyListRow(row))
          .filter((row): row is CompanyListItem => row !== null),
        total: data.viajerosv_users_aggregate?.aggregate?.count ?? 0,
      }))
    );
  }

  approveCompany(token: string, id: number | string): Observable<void> {
    return this.updateCompanyAccessState(token, id, {
      active: true,
      company_profile_completed: true,
    });
  }

  rejectCompany(token: string, id: number | string, _reason?: string): Observable<void> {
    return this.updateCompanyAccessState(token, id, {
      active: false,
      company_profile_completed: false,
    });
  }

  deactivateCompany(token: string, id: number | string, _reason?: string): Observable<void> {
    return this.updateCompanyAccessState(token, id, {
      active: false,
      company_profile_completed: false,
    });
  }

  reactivateCompany(token: string, id: number | string): Observable<void> {
    return this.updateCompanyAccessState(token, id, {
      active: true,
      company_profile_completed: true,
    });
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

  private updateCompanyAccessState(
    token: string,
    id: number | string,
    state: { active: boolean; company_profile_completed: boolean }
  ): Observable<void> {
    const queryByUuid = `
      mutation UpdateCompanyAccessByUuid(
        $id: uuid!,
        $active: Boolean!,
        $company_profile_completed: Boolean!
      ) {
        update_viajerosv_users(
          where: { id: { _eq: $id } }
          _set: {
            active: $active,
            company_profile_completed: $company_profile_completed
          }
        ) {
          affected_rows
        }
      }
    `;

    const queryByBigInt = `
      mutation UpdateCompanyAccessByBigint(
        $id: bigint!,
        $active: Boolean!,
        $company_profile_completed: Boolean!
      ) {
        update_viajerosv_users(
          where: { id: { _eq: $id } }
          _set: {
            active: $active,
            company_profile_completed: $company_profile_completed
          }
        ) {
          affected_rows
        }
      }
    `;

    const queryByString = `
      mutation UpdateCompanyAccessByString(
        $id: String!,
        $active: Boolean!,
        $company_profile_completed: Boolean!
      ) {
        update_viajerosv_users(
          where: { id: { _eq: $id } }
          _set: {
            active: $active,
            company_profile_completed: $company_profile_completed
          }
        ) {
          affected_rows
        }
      }
    `;

    const idAsString = String(id ?? '').trim();
    if (!idAsString) {
      return throwError(() => new Error('No se recibió un identificador de empresa válido.'));
    }

    const idAsNumber = Number(id);
    const canUseNumericFallback = Number.isFinite(idAsNumber);

    const baseVariables = {
      active: state.active,
      company_profile_completed: state.company_profile_completed,
    };

    return this.executeOperation<CompanyAccessMutationData, {
      id: string;
      active: boolean;
      company_profile_completed: boolean;
    }>(token, queryByUuid, { id: idAsString, ...baseVariables }).pipe(
      catchError(() => {
        if (!canUseNumericFallback) {
          return throwError(() =>
            new Error('No se pudo resolver un id numérico para actualizar estado de empresa.')
          );
        }

        return this.executeOperation<CompanyAccessMutationData, {
          id: number;
          active: boolean;
          company_profile_completed: boolean;
        }>(token, queryByBigInt, { id: idAsNumber, ...baseVariables });
      }),
      catchError(() =>
        this.executeOperation<CompanyAccessMutationData, {
          id: string;
          active: boolean;
          company_profile_completed: boolean;
        }>(token, queryByString, { id: idAsString, ...baseVariables })
      ),
      map(() => void 0)
    );
  }

  private mapCompanyListRow(row: CompanyListRow | null | undefined): CompanyListItem | null {
    if (!row) return null;

    return {
      id: row.id,
      active: row.active ?? null,
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
      companyCommercialName: row.company_commercial_name ?? null,
      companyNit: row.company_nit ?? null,
      companyDescription: row.company_description ?? null,
      companyAddress: row.company_address ?? null,
      companyProfileCompleted: row.company_profile_completed ?? null,
      companyEmail: row.company_email ?? null,
      companyPhone: row.company_phone ?? null,
      companyLogoUrl: row.company_logo_url ?? null,
      companyCategoryId: this.toFiniteNumber(row.company_category),
      city: row.city ?? null,
      country: row.country ?? null,
      firstName: row.first_name ?? null,
      lastName: row.last_name ?? null,
      email: row.email ?? null,
      countryRef: row.countryByCountry ?? null,
      statusValue: row.company_statuses?.[0]?.value ?? null,
    };
  }

  private toFiniteNumber(value: number | string | null | undefined): number | null {
    if (value == null) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
}
