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
  company_legal_name?: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_logo_url: string | null;
  company_category?: number | string | null;
  company_website?: string | null;
  company_map_url?: string | null;
  company_facebook?: string | null;
  company_instagram?: string | null;
  company_twitter?: string | null;
  company_youtube?: string | null;
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
  company_legal_name?: string | null;
  company_description?: string | null;
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
  companyLegalName: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyLogoUrl: string | null;
  companyCategoryId: number | null;
  companyWebsite: string | null;
  companyMapUrl: string | null;
  companyFacebook: string | null;
  companyInstagram: string | null;
  companyTwitter: string | null;
  companyYoutube: string | null;
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
  company_legal_name?: string | null;
  company_description: string | null;
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
  private supportsCompanyLegalNameField: boolean | null = null;
  private supportsLegacyDescriptionField: boolean | null = null;
  private supportsCompanyPhoneField: boolean | null = null;

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
    const mutationWithLegalName = `
      mutation UpsertCompanyProfile(
        $company_commercial_name: String,
        $company_nit: String,
        $company_email: String,
        $company_phone: String,
        $company_mobile: String,
        $company_logo_url: String,
        $company_legal_name: String,
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
            company_legal_name: $company_legal_name,
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
              company_legal_name,
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

    const mutationLegacyWithDescription = `
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

    const mutationLegacyNoDescription = `
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

    const legacyWithDescriptionData = {
      ...data,
      company_description: data.company_description ?? data.company_legal_name ?? null,
      description: data.company_legal_name ?? null,
    };
    delete (legacyWithDescriptionData as { company_legal_name?: string | null }).company_legal_name;

    const legacyNoDescriptionData = {
      ...data,
      company_description: data.company_description ?? data.company_legal_name ?? null,
    };
    delete (legacyNoDescriptionData as { company_legal_name?: string | null }).company_legal_name;
    delete (legacyNoDescriptionData as { description?: string | null }).description;

    return this.executeOperation<UpsertMutationData, UpsertCompanyVariables>(
      token,
      mutationWithLegalName,
      data
    ).pipe(
      catchError(() =>
        this.executeOperation<UpsertMutationData, Omit<UpsertCompanyVariables, 'company_legal_name'>>(
          token,
          mutationLegacyWithDescription,
          legacyWithDescriptionData
        )
      ),
      catchError(() =>
        this.executeOperation<UpsertMutationData, Omit<UpsertCompanyVariables, 'company_legal_name' | 'description'>>(
          token,
          mutationLegacyNoDescription,
          legacyNoDescriptionData
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
    const queryWithLegalName = `
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
          company_legal_name
          company_email
          company_phone
          company_logo_url
          company_category
          company_website
          company_map_url
          company_facebook
          company_instagram
          company_twitter
          company_youtube
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

    const queryWithoutLegalName = `
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
          company_website
          company_map_url
          company_facebook
          company_instagram
          company_twitter
          company_youtube
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
      queryWithLegalName,
      variables
    ).pipe(
      catchError((error) => {
        const message = String(error instanceof Error ? error.message : error ?? '');
        if (!message.includes("field 'company_legal_name' not found")) {
          return throwError(() => error);
        }

        return this.executeOperation<GetCompaniesData, GetCompaniesPagedVariables>(
          token,
          queryWithoutLegalName,
          variables
        );
      }),
      map((data) => ({
        rows: (data.viajerosv_users ?? [])
          .map((row) => this.mapCompanyListRow(row))
          .filter((row): row is CompanyListItem => row !== null),
        total: data.viajerosv_users_aggregate?.aggregate?.count ?? 0,
      }))
    );
  }

  getCurrentCompanyProfile(
    token: string,
    email?: string | null,
    companyName?: string | null
  ): Observable<UserCompanyProfile | null> {
    const normalizedEmail = email?.trim() ?? '';
    const normalizedCompanyName = companyName?.trim() ?? '';

    const orConditions: Record<string, unknown>[] = [];

    if (normalizedEmail) {
      const emailFilter = { _eq: normalizedEmail };
      orConditions.push(
        { email: emailFilter },
        { company_email: emailFilter }
      );
    }

    if (normalizedCompanyName) {
      orConditions.push({
        company_commercial_name: { _ilike: `%${normalizedCompanyName}%` }
      });
    }

    if (!orConditions.length) {
      return new Observable<UserCompanyProfile | null>((subscriber) => {
        subscriber.next(null);
        subscriber.complete();
      });
    }

    const where = {
      _and: [
        { role: { _eq: 'COMPANY' } },
        { _or: orConditions }
      ]
    };

    return this.getCompaniesPaged(token, {
      limit: 1,
      offset: 0,
      where,
      order_by: [{ created_at: 'desc' }]
    }).pipe(
      map((result) => this.mapCompanyListItemToProfile(result.rows[0] ?? null))
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
    type QueryOptions = {
      phoneAlias: boolean;
      legalNameSource: 'company_legal_name' | 'description' | 'none';
      descriptionSource: 'company_description' | 'description';
    };
    type QueryPlan = {
      query: string;
      options: QueryOptions;
    };

    const buildProfileFields = (options: QueryOptions): string => `
      id
      company_commercial_name
      company_nit
      company_email
      ${options.phoneAlias ? 'company_phone: phone' : 'company_phone'}
      company_mobile
      company_logo_url
      ${
        options.legalNameSource === 'company_legal_name'
          ? 'company_legal_name'
          : options.legalNameSource === 'description'
            ? 'company_legal_name: description'
            : ''
      }
      ${options.descriptionSource === 'description' ? 'company_description: description' : 'company_description'}
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
    `;

    const buildQueryByEmail = (queryName: string, options: QueryOptions): string => `
      query ${queryName}($email: String!) {
        viajerosv_users(where: { email: { _eq: $email } }, limit: 1) {
          ${buildProfileFields(options)}
        }
      }
    `;

    const buildCurrentQuery = (queryName: string, options: QueryOptions): string => `
      query ${queryName} {
        viajerosv_users(limit: 1) {
          ${buildProfileFields(options)}
        }
      }
    `;

    const keepSupportedQueries = (plans: QueryPlan[]): string[] => {
      return plans.map((plan) => plan.query);
    };

    if (email) {
      const plans: QueryPlan[] = [
        {
          query: buildQueryByEmail('GetUserByEmail', {
            phoneAlias: false,
            legalNameSource: 'company_legal_name',
            descriptionSource: 'company_description',
          }),
          options: {
            phoneAlias: false,
            legalNameSource: 'company_legal_name',
            descriptionSource: 'company_description',
          },
        },
        {
          query: buildQueryByEmail('GetUserByEmailPhoneAlias', {
            phoneAlias: true,
            legalNameSource: 'company_legal_name',
            descriptionSource: 'company_description',
          }),
          options: {
            phoneAlias: true,
            legalNameSource: 'company_legal_name',
            descriptionSource: 'company_description',
          },
        },
        {
          query: buildQueryByEmail('GetUserByEmailLegacyNoLegal', {
            phoneAlias: false,
            legalNameSource: 'none',
            descriptionSource: 'company_description',
          }),
          options: {
            phoneAlias: false,
            legalNameSource: 'none',
            descriptionSource: 'company_description',
          },
        },
        {
          query: buildQueryByEmail('GetUserByEmailPhoneAliasLegacyNoLegal', {
            phoneAlias: true,
            legalNameSource: 'none',
            descriptionSource: 'company_description',
          }),
          options: {
            phoneAlias: true,
            legalNameSource: 'none',
            descriptionSource: 'company_description',
          },
        },
        {
          query: buildQueryByEmail('GetUserByEmailLegacyLegal', {
            phoneAlias: false,
            legalNameSource: 'description',
            descriptionSource: 'company_description',
          }),
          options: {
            phoneAlias: false,
            legalNameSource: 'description',
            descriptionSource: 'company_description',
          },
        },
        {
          query: buildQueryByEmail('GetUserByEmailPhoneAliasLegacyLegal', {
            phoneAlias: true,
            legalNameSource: 'description',
            descriptionSource: 'company_description',
          }),
          options: {
            phoneAlias: true,
            legalNameSource: 'description',
            descriptionSource: 'company_description',
          },
        },
        {
          query: buildQueryByEmail('GetUserByEmailLegacyDescriptionOnly', {
            phoneAlias: false,
            legalNameSource: 'description',
            descriptionSource: 'description',
          }),
          options: {
            phoneAlias: false,
            legalNameSource: 'description',
            descriptionSource: 'description',
          },
        },
        {
          query: buildQueryByEmail('GetUserByEmailPhoneAliasLegacyDescriptionOnly', {
            phoneAlias: true,
            legalNameSource: 'description',
            descriptionSource: 'description',
          }),
          options: {
            phoneAlias: true,
            legalNameSource: 'description',
            descriptionSource: 'description',
          },
        },
      ];

      const queries = keepSupportedQueries(plans);

      return this.executeProfileQueryWithFallback<GetUserByEmailVariables>(token, queries, { email }).pipe(
        map((data) => data.viajerosv_users[0] ?? null)
      );
    }

    const plans: QueryPlan[] = [
      {
        query: buildCurrentQuery('GetCurrentUserProfile', {
          phoneAlias: false,
          legalNameSource: 'company_legal_name',
          descriptionSource: 'company_description',
        }),
        options: {
          phoneAlias: false,
          legalNameSource: 'company_legal_name',
          descriptionSource: 'company_description',
        },
      },
      {
        query: buildCurrentQuery('GetCurrentUserProfilePhoneAlias', {
          phoneAlias: true,
          legalNameSource: 'company_legal_name',
          descriptionSource: 'company_description',
        }),
        options: {
          phoneAlias: true,
          legalNameSource: 'company_legal_name',
          descriptionSource: 'company_description',
        },
      },
      {
        query: buildCurrentQuery('GetCurrentUserProfileLegacyNoLegal', {
          phoneAlias: false,
          legalNameSource: 'none',
          descriptionSource: 'company_description',
        }),
        options: {
          phoneAlias: false,
          legalNameSource: 'none',
          descriptionSource: 'company_description',
        },
      },
      {
        query: buildCurrentQuery('GetCurrentUserProfilePhoneAliasLegacyNoLegal', {
          phoneAlias: true,
          legalNameSource: 'none',
          descriptionSource: 'company_description',
        }),
        options: {
          phoneAlias: true,
          legalNameSource: 'none',
          descriptionSource: 'company_description',
        },
      },
      {
        query: buildCurrentQuery('GetCurrentUserProfileLegacyLegal', {
          phoneAlias: false,
          legalNameSource: 'description',
          descriptionSource: 'company_description',
        }),
        options: {
          phoneAlias: false,
          legalNameSource: 'description',
          descriptionSource: 'company_description',
        },
      },
      {
        query: buildCurrentQuery('GetCurrentUserProfilePhoneAliasLegacyLegal', {
          phoneAlias: true,
          legalNameSource: 'description',
          descriptionSource: 'company_description',
        }),
        options: {
          phoneAlias: true,
          legalNameSource: 'description',
          descriptionSource: 'company_description',
        },
      },
      {
        query: buildCurrentQuery('GetCurrentUserProfileLegacyDescriptionOnly', {
          phoneAlias: false,
          legalNameSource: 'description',
          descriptionSource: 'description',
        }),
        options: {
          phoneAlias: false,
          legalNameSource: 'description',
          descriptionSource: 'description',
        },
      },
      {
        query: buildCurrentQuery('GetCurrentUserProfilePhoneAliasLegacyDescriptionOnly', {
          phoneAlias: true,
          legalNameSource: 'description',
          descriptionSource: 'description',
        }),
        options: {
          phoneAlias: true,
          legalNameSource: 'description',
          descriptionSource: 'description',
        },
      },
    ];

    const queries = keepSupportedQueries(plans);

    return this.executeProfileQueryWithFallback<Record<string, never>>(token, queries, {}).pipe(
      map((data) => data.viajerosv_users[0] ?? null)
    );
  }

  private executeProfileQueryWithFallback<TVariables extends object>(
    token: string,
    queries: string[],
    variables: TVariables
  ): Observable<GetCurrentUserProfileData> {
    if (!queries.length) {
      return throwError(() => new Error('No se definieron queries para obtener el perfil de usuario.'));
    }

    let request$ = this.executeOperation<GetCurrentUserProfileData, TVariables>(
      token,
      queries[0],
      variables
    ).pipe(
      catchError((error) => {
        this.markUnsupportedProfileFields(error);
        return throwError(() => error);
      })
    );

    for (const query of queries.slice(1)) {
      request$ = request$.pipe(
        catchError(() =>
          this.executeOperation<GetCurrentUserProfileData, TVariables>(token, query, variables).pipe(
            catchError((error) => {
              this.markUnsupportedProfileFields(error);
              return throwError(() => error);
            })
          )
        )
      );
    }

    return request$;
  }

  private markUnsupportedProfileFields(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error ?? '');

    if (message.includes("field 'company_legal_name' not found")) {
      this.supportsCompanyLegalNameField = false;
    }

    if (message.includes("field 'description' not found")) {
      this.supportsLegacyDescriptionField = false;
    }

    if (message.includes("field 'company_phone' not found")) {
      this.supportsCompanyPhoneField = false;
    }
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
      companyLegalName: row.company_legal_name ?? null,
      companyEmail: row.company_email ?? null,
      companyPhone: row.company_phone ?? null,
      companyLogoUrl: row.company_logo_url ?? null,
      companyCategoryId: this.toFiniteNumber(row.company_category),
      companyWebsite: row.company_website ?? null,
      companyMapUrl: row.company_map_url ?? null,
      companyFacebook: row.company_facebook ?? null,
      companyInstagram: row.company_instagram ?? null,
      companyTwitter: row.company_twitter ?? null,
      companyYoutube: row.company_youtube ?? null,
      city: row.city ?? null,
      country: row.country ?? null,
      firstName: row.first_name ?? null,
      lastName: row.last_name ?? null,
      email: row.email ?? null,
      countryRef: row.countryByCountry ?? null,
      statusValue: row.company_statuses?.[0]?.value ?? null,
    };
  }

  private mapCompanyListItemToProfile(row: CompanyListItem | null | undefined): UserCompanyProfile | null {
    if (!row) return null;

    return {
      id: row.id,
      company_commercial_name: row.companyCommercialName ?? null,
      company_nit: row.companyNit ?? null,
      company_email: row.companyEmail ?? null,
      company_phone: row.companyPhone ?? null,
      company_mobile: null,
      company_logo_url: row.companyLogoUrl ?? null,
      company_legal_name: row.companyLegalName ?? null,
      company_description: row.companyDescription ?? null,
      company_address: row.companyAddress ?? null,
      company_category: row.companyCategoryId ?? null,
      company_website: row.companyWebsite ?? null,
      company_map_url: row.companyMapUrl ?? null,
      company_facebook: row.companyFacebook ?? null,
      company_instagram: row.companyInstagram ?? null,
      company_twitter: row.companyTwitter ?? null,
      company_youtube: row.companyYoutube ?? null,
      company_profile_completed: row.companyProfileCompleted ?? null,
      phone: row.companyPhone ?? null,
      country: row.country ?? null,
      city: row.city ?? null,
      first_name: row.firstName ?? null,
      last_name: row.lastName ?? null,
      document_id: null,
      document_type_id: null,
      email: row.email ?? row.companyEmail ?? '',
    };
  }

  private toFiniteNumber(value: number | string | null | undefined): number | null {
    if (value == null) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
}
