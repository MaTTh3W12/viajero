import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';

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

interface GetCouponsData {
  viajerosv_coupons: Coupon[];
  viajerosv_coupons_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

interface GetHomeFeaturedCouponsAggregateData {
  aggregate: {
    count: number;
  };
}

interface GetCouponImageData {
  viajerosv_coupons_with_image_base64: CouponImagePreview[];
}

interface GetCouponOwnerData {
  viajerosv_coupons_by_pk: CouponOwner | null;
}

interface GetCouponByIdData {
  viajerosv_coupons_by_pk: Coupon | null;
}

interface InsertCouponData {
  insert_viajerosv_coupons: {
    affected_rows: number;
    returning: CouponSummary[];
  };
}

interface UpdateCouponData {
  update_viajerosv_coupons_by_pk: CouponSummary | Coupon | null;
}

interface DeleteCouponData {
  delete_viajerosv_coupons: {
    affected_rows: number;
  };
}

interface ChangeStatusData {
  viajerosv_change_coupon_status: {
    id: number;
    active: boolean;
  };
}

interface AcquireCouponData {
  viajerosv_acquire_coupon: AcquiredCoupon | null;
}

interface GetCouponsAcquiredData {
  viajerosv_coupons_acquired: CouponAcquired[];
  viajerosv_coupons_acquired_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

interface GetCouponWithImageByCodeData {
  viajerosv_coupons_acquired: CouponAcquiredWithImage[];
}

interface RedeemCouponData {
  viajerosv_redeem_coupon: CouponAcquired | null;
}

interface TransferCouponData {
  viajerosv_transfer_coupon: TransferCouponResult | null;
}

interface GetCouponsByIdsData {
  viajerosv_coupons: Coupon[];
}

interface GetUsersBasicByIdsData {
  viajerosv_users: UserBasic[];
}

interface HasAcquiredCouponData {
  viajerosv_coupons_acquired_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

interface GetCouponStatisticsData {
  acquired: {
    aggregate: {
      count: number;
    } | null;
  };
  redeemed: {
    aggregate: {
      count: number;
    } | null;
  };
}

interface HomeFeaturedCouponRow {
  id: number;
  title: string;
  description: string | null;
  price: number | string | null;
  price_discount: number | string | null;
  stock_available: number | null;
  stock_total: number | null;
  start_date: string | null;
  end_date: string | null;
  published: boolean;
  auto_published: boolean;
  category_id: number;
  user_id: number | string;
  terms: string | null;
  created_at: string;
  updated_at: string;
  user: {
    company_commercial_name: string | null;
    company_address: string | null;
    company_map_url: string | null;
  } | null;
}

interface GetHomeFeaturedCouponsData {
  viajerosv_featured_coupons: HomeFeaturedCouponRow[];
  viajerosv_featured_coupons_aggregate: GetHomeFeaturedCouponsAggregateData;
}

interface CouponHighlightRow {
  id: number;
  title: string;
  description: string | null;
  price: number | string | null;
  price_discount: number | string | null;
  stock_available: number | null;
  stock_total: number | null;
  start_date: string | null;
  category_id: number;
  published: boolean;
  auto_published: boolean;
  user_id: number | string;
  terms: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  end_date?: string | null;
  user: {
    company_commercial_name: string | null;
    company_address: string | null;
    company_map_url: string | null;
  } | null;
}

interface GetCouponsHighlightData {
  viajerosv_coupons: CouponHighlightRow[];
  viajerosv_coupons_aggregate?: {
    aggregate: {
      count: number;
    };
  };
}

export interface Coupon {
  id: number;
  user_id: number | string;
  category_id: number;
  auto_published: boolean;
  published: boolean;
  title: string;
  end_date: string;
  start_date: string;
  stock_available: number | null;
  stock_total: number | null;
  price: string | null;
  price_discount: string | null;
  description: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    company_commercial_name: string | null;
    company_address: string | null;
    company_map_url: string | null;
  } | null;
}

export interface CouponSummary {
  id: number;
  user_id: number | string;
  title: string;
  published: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CouponImagePreview {
  id: number;
  image_base64: string | null;
  image_size: number | null;
  image_mime_type: string | null;
}

export interface CouponOwner {
  id: number;
  user_id: number | string;
}

export interface UserBasic {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company_commercial_name?: string | null;
}

export interface AcquiredCoupon {
  id: number | string;
  coupon_id: number | string;
  user_id: number | string;
  unique_code: string;
  acquired_at: string;
  redeemed: boolean;
}

export interface CouponAcquired {
  coupon_id: number | string;
  id: number | string;
  user_id: number | string;
  validated_by: number | string | null;
  redeemed: boolean;
  unique_code: string;
  acquired_at: string;
  redeemed_at: string | null;
  coupon?: {
    title: string | null;
    description: string | null;
    price_discount: string | number | null;
    end_date: string | null;
  } | null;
  userByValidatedBy?: {
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
  } | null;
}

export interface TransferCouponResult {
  id: number | string;
  unique_code: string;
  user_id: number | string;
  acquired_at: string;
}

export interface CouponWithImageDetails {
  id: number;
  title: string;
  description: string | null;
  price: string | null;
  price_discount: string | null;
  start_date: string;
  end_date: string;
  image_mime_type: string | null;
  image_size: number | null;
  image: string | null;
}

export interface CouponAcquiredWithImage {
  id: number | string;
  unique_code: string;
  acquired_at: string;
  redeemed: boolean;
  redeemed_at: string | null;
  user_id: number | string;
  validated_by: number | string | null;
  coupon_with_image_base64: CouponWithImageDetails | null;
}

export interface GetCouponsVariables {
  limit?: number;
  offset?: number;
  where?: Record<string, unknown>;
  order_by?: Array<Record<string, 'asc' | 'desc' | 'asc_nulls_first' | 'asc_nulls_last' | 'desc_nulls_first' | 'desc_nulls_last'>>;
}

export interface GetCouponsAcquiredVariables {
  limit?: number;
  offset?: number;
  where?: Record<string, unknown>;
}

export interface InsertCouponVariables {
  category_id: number;
  end_date: string;
  start_date: string;
  stock_available: number | null;
  stock_total: number | null;
  price: string | number | null;
  price_discount: string | number | null;
  description: string | null;
  terms: string | null;
  auto_published?: boolean;
  published?: boolean;
  title: string;
  image?: string | null;
}

export interface UpdateCouponVariables {
  id: number;
  category_id?: number;
  end_date?: string;
  start_date?: string;
  stock_available?: number | null;
  price?: string | number | null;
  price_discount?: string | number | null;
  description?: string | null;
  terms?: string | null;
  auto_published?: boolean;
  published?: boolean;
  title?: string;
  image?: string | null;
}

export interface PublishCouponVariables {
  id: number;
  published: boolean;
}

export interface CouponListResult {
  rows: Coupon[];
  total: number;
}

export interface CouponAcquiredListResult {
  rows: CouponAcquired[];
  total: number;
}

const DEFAULT_HASURA_ENDPOINT = 'https://api.grupoavanza.work/v1/graphql';
const GET_COUPONS_QUERY = `
  query GetCoupons(
    $limit: Int!,
    $offset: Int!,
    $where: viajerosv_coupons_bool_exp!,
    $order_by: [viajerosv_coupons_order_by!]
  ) {
    viajerosv_coupons(
      limit: $limit,
      offset: $offset,
      order_by: $order_by,
      where: $where
    ) {
      category_id
      id
      user_id
      auto_published
      published
      title
      description
      price
      price_discount
      stock_available
      stock_total
      start_date
      end_date
      terms
      created_at
      updated_at
      user {
        company_commercial_name
        company_address
        company_map_url
      }
    }
    viajerosv_coupons_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

const GET_HOME_FEATURED_COUPONS_QUERY = `
  query GetHomeFeaturedCoupons {
    viajerosv_featured_coupons {
      id
      title
      description
      price
      price_discount
      stock_available
      stock_total
      start_date
      end_date
      published
      auto_published
      category_id
      user_id
      terms
      created_at
      updated_at
      user {
        company_commercial_name
        company_address
        company_map_url
      }
    }
    viajerosv_featured_coupons_aggregate {
      aggregate {
        count
      }
    }
  }
`;

const GET_EXPIRING_SOON_COUPONS_QUERY = `
  query GetExpiringSoonCoupons {
    viajerosv_coupons(
      limit: 3,
      order_by: { end_date: asc },
      where: {
        _and: [
          { active: { _eq: true } }
          { published: { _eq: true } }
          { end_date: { _gte: "now()" } }
          { stock_available: { _gt: 0 } }
        ]
      }
    ) {
      id
      title
      description
      price
      price_discount
      stock_available
      stock_total
      start_date
      end_date
      published
      auto_published
      category_id
      user_id
      terms
      created_at
      updated_at
      user {
        company_commercial_name
        company_address
        company_map_url
      }
    }
    viajerosv_coupons_aggregate {
      aggregate {
        count
      }
    }
  }
`;

const GET_LATEST_COUPONS_QUERY = `
  query GetLatestCoupons($limit: Int = 3) {
    viajerosv_coupons(
      limit: $limit,
      order_by: { created_at: desc },
      where: {
        _and: [
          { active: { _eq: true } }
          { published: { _eq: true } }
        ]
      }
    ) {
      id
      title
      description
      price
      price_discount
      stock_available
      stock_total
      start_date
      end_date
      published
      auto_published
      user_id
      terms
      created_at
      updated_at
      category_id
      user {
        company_commercial_name
        company_address
        company_map_url
      }
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class CouponService {
  constructor(private http: HttpClient) {}

  private readonly defaultPublicCouponsWhere: Record<string, unknown> = {
    _and: [
      { active: { _eq: true } },
      { published: { _eq: true } },
    ],
  };

  private get endpoint(): string {
    if (typeof window === 'undefined') {
      return DEFAULT_HASURA_ENDPOINT;
    }
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
            throw new Error(response.errors.map((error) => error.message).join(' | '));
          }

          if (!response.data) {
            throw new Error('GraphQL response sin data');
          }

          return response.data;
        })
      );
  }

  private executePublicOperation<TData, TVariables extends object>(
    query: string,
    variables: TVariables
  ): Observable<TData> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http
      .post<GraphQLResponse<TData>>(this.endpoint, { query, variables }, { headers })
      .pipe(
        map((response) => {
          if (response.errors?.length) {
            throw new Error(response.errors.map((error) => error.message).join(' | '));
          }

          if (!response.data) {
            throw new Error('GraphQL response sin data');
          }

          return response.data;
        })
      );
  }

  getCoupons(token: string, variables: GetCouponsVariables = {}): Observable<CouponListResult> {
    const requestVariables: GetCouponsVariables = {
      limit: variables.limit ?? 40,
      offset: variables.offset ?? 0,
      where: variables.where ?? {},
      order_by: variables.order_by ?? [{ created_at: 'desc' }],
    };

    return this.executeOperation<GetCouponsData, GetCouponsVariables>(token, GET_COUPONS_QUERY, requestVariables).pipe(
      map((data) => ({
        rows: data.viajerosv_coupons,
        total: data.viajerosv_coupons_aggregate.aggregate.count,
      }))
    );
  }

  getPublicCoupons(variables: GetCouponsVariables = {}): Observable<CouponListResult> {
    const requestVariables: GetCouponsVariables = {
      limit: variables.limit ?? 40,
      offset: variables.offset ?? 0,
      where: variables.where ?? this.defaultPublicCouponsWhere,
      order_by: variables.order_by ?? [{ created_at: 'desc' }],
    };

    return this.executePublicOperation<GetCouponsData, GetCouponsVariables>(GET_COUPONS_QUERY, requestVariables).pipe(
      map((data) => ({
        rows: data.viajerosv_coupons,
        total: data.viajerosv_coupons_aggregate.aggregate.count,
      }))
    );
  }

  getPublicCouponById(id: number): Observable<Coupon | null> {
    const query = `
      query GetPublicCouponById($id: bigint!) {
        viajerosv_coupons_by_pk(id: $id) {
          category_id
          id
          user_id
          auto_published
          published
          title
          end_date
          start_date
          stock_available
          stock_total
          price
          price_discount
          description
          terms
          created_at
          updated_at
          user {
            company_commercial_name
            company_address
            company_map_url
          }
        }
      }
    `;

    return this.executePublicOperation<GetCouponByIdData, { id: number }>(query, { id }).pipe(
      map((data) => data.viajerosv_coupons_by_pk ?? null)
    );
  }

  getHomeFeaturedCoupons(): Observable<Coupon[]> {
    return this.executePublicOperation<GetHomeFeaturedCouponsData, Record<string, never>>(
      GET_HOME_FEATURED_COUPONS_QUERY,
      {}
    ).pipe(
      map((data) => (data.viajerosv_featured_coupons ?? []).map((coupon) => this.mapCouponHighlight(coupon)))
    );
  }

  getExpiringSoonCoupons(): Observable<Coupon[]> {
    return this.executePublicOperation<GetCouponsHighlightData, Record<string, never>>(
      GET_EXPIRING_SOON_COUPONS_QUERY,
      {}
    ).pipe(
      map((data) => (data.viajerosv_coupons ?? []).map((coupon) => this.mapCouponHighlight(coupon)))
    );
  }

  getLatestCoupons(limit = 3): Observable<Coupon[]> {
    return this.executePublicOperation<GetCouponsHighlightData, { limit: number }>(
      GET_LATEST_COUPONS_QUERY,
      { limit }
    ).pipe(
      map((data) => (data.viajerosv_coupons ?? []).map((coupon) => this.mapCouponHighlight(coupon)))
    );
  }


  getCouponImage(token: string, id: number): Observable<CouponImagePreview | null> {
    const query = `
      query GetCouponsImage($id: bigint!) {
        viajerosv_coupons_with_image_base64(where: { id: { _eq: $id } }) {
          id
          image_base64
          image_size
          image_mime_type
        }
      }
    `;

    return this.executeOperation<GetCouponImageData, { id: number }>(token, query, { id }).pipe(
      map((data) => data.viajerosv_coupons_with_image_base64[0] ?? null)
    );
  }

  getCouponImagesByIds(token: string, ids: number[]): Observable<CouponImagePreview[]> {
    const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id))));
    if (uniqueIds.length === 0) {
      return of([]);
    }

    const query = `
      query GetCouponsImagesByIds($ids: [bigint!]!) {
        viajerosv_coupons_with_image_base64(where: { id: { _in: $ids } }) {
          id
          image_base64
          image_size
          image_mime_type
        }
      }
    `;

    return this.executeOperation<GetCouponImageData, { ids: number[] }>(token, query, { ids: uniqueIds }).pipe(
      map((data) => data.viajerosv_coupons_with_image_base64 ?? [])
    );
  }

  getPublicCouponImagesByIds(ids: number[]): Observable<CouponImagePreview[]> {
    const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id))));
    if (uniqueIds.length === 0) {
      return of([]);
    }

    const query = `
      query GetPublicCouponsImagesByIds($ids: [bigint!]!) {
        viajerosv_coupons_with_image_base64(where: { id: { _in: $ids } }) {
          id
          image_base64
          image_size
          image_mime_type
        }
      }
    `;

    return this.executePublicOperation<GetCouponImageData, { ids: number[] }>(query, { ids: uniqueIds }).pipe(
      map((data) => data.viajerosv_coupons_with_image_base64 ?? [])
    );
  }


  getCouponOwner(token: string, id: number): Observable<CouponOwner | null> {
    const query = `
      query GetCouponOwner($id: bigint!) {
        viajerosv_coupons_by_pk(id: $id) {
          id
          user_id
        }
      }
    `;

    return this.executeOperation<GetCouponOwnerData, { id: number }>(token, query, { id }).pipe(
      map((data) => data.viajerosv_coupons_by_pk)
    );
  }

  acquireCoupon(token: string, couponId: number): Observable<AcquiredCoupon | null> {
    const mutation = `
      mutation Acquire($coupon_id: bigint!) {
        viajerosv_acquire_coupon(args: { p_coupon_id: $coupon_id }) {
          id
          coupon_id
          user_id
          unique_code
          acquired_at
          redeemed
        }
      }
    `;

    return this.executeOperation<AcquireCouponData, { coupon_id: number }>(token, mutation, { coupon_id: couponId }).pipe(
      map((data) => data.viajerosv_acquire_coupon ?? null)
    );
  }

  getCouponsAcquired(
    token: string,
    variables: GetCouponsAcquiredVariables = { limit: 10, offset: 0, where: { redeemed: { _eq: true } } }
  ): Observable<CouponAcquiredListResult> {
    const query = `
      query GetCouponsAcquired(
        $limit: Int!,
        $offset: Int!,
        $where: viajerosv_coupons_acquired_bool_exp!
      ) {
        viajerosv_coupons_acquired(
          limit: $limit,
          offset: $offset,
          order_by: { acquired_at: desc },
          where: $where
        ) {
          coupon_id
          id
          user_id
          validated_by
          redeemed
          unique_code
          acquired_at
          redeemed_at
          user_public {
            id
            first_name
            last_name
            email
          }
          coupon {
            id
            title
            description
            price_discount
            end_date
          }
          userByValidatedBy: userPublicByValidatedBy {
            id
            first_name
            last_name
            company_commercial_name
            company_address
            company_map_url
            company_facebook
            company_instagram
            company_youtube
            company_twitter
            company_website
            email
          }
        }
        viajerosv_coupons_acquired_aggregate(where: $where) {
          aggregate {
            count
          }
        }
      }
    `;

    const safeVariables: Required<Pick<GetCouponsAcquiredVariables, 'limit' | 'offset' | 'where'>> = {
      limit: variables.limit ?? 10,
      offset: variables.offset ?? 0,
      where: variables.where ?? {},
    };

    return this.executeOperation<GetCouponsAcquiredData, typeof safeVariables>(token, query, safeVariables).pipe(
      map((data) => ({
        rows: data.viajerosv_coupons_acquired,
        total: data.viajerosv_coupons_acquired_aggregate.aggregate.count,
      }))
    );
  }

  getCouponsByIds(token: string, couponIds: number[]): Observable<Coupon[]> {
    const query = `
      query GetCouponsByIds($ids: [bigint!]!) {
        viajerosv_coupons(where: { id: { _in: $ids } }) {
          category_id
          id
          user_id
          auto_published
          published
          title
          end_date
          start_date
          stock_available
          stock_total
          price
          price_discount
          description
          terms
          created_at
          updated_at
        }
      }
    `;

    return this.executeOperation<GetCouponsByIdsData, { ids: number[] }>(token, query, { ids: couponIds }).pipe(
      map((data) => data.viajerosv_coupons ?? [])
    );
  }

  getUsersBasicByIds(token: string, userIds: string[]): Observable<UserBasic[]> {
    const uniqueIds = [...new Set(userIds.filter((id) => !!id))];
    if (uniqueIds.length === 0) {
      return of([]);
    }

    const query = `
      query GetUsersBasicByIds($ids: [uuid!]!) {
        viajerosv_users(where: { id: { _in: $ids } }) {
          id
          first_name
          last_name
          email
          company_commercial_name
        }
      }
    `;

    return this.executeOperation<GetUsersBasicByIdsData, { ids: string[] }>(token, query, { ids: uniqueIds }).pipe(
      map((data) => data.viajerosv_users ?? [])
    );
  }

  hasAcquiredCoupon(token: string, couponId: number): Observable<boolean> {
    const query = `
      query HasAcquiredCoupon($coupon_id: bigint!) {
        viajerosv_coupons_acquired_aggregate(where: { coupon_id: { _eq: $coupon_id } }) {
          aggregate {
            count
          }
        }
      }
    `;

    return this.executeOperation<HasAcquiredCouponData, { coupon_id: number }>(token, query, { coupon_id: couponId }).pipe(
      map((data) => (data.viajerosv_coupons_acquired_aggregate.aggregate.count ?? 0) > 0)
    );
  }

  getCouponStatistics(token: string, couponId: number): Observable<{ acquired: number; redeemed: number }> {
    const query = `
      query GetCouponStatistics($coupon_id: bigint!) {
        acquired: viajerosv_coupons_acquired_aggregate(where: { coupon_id: { _eq: $coupon_id } }) {
          aggregate {
            count
          }
        }
        redeemed: viajerosv_coupons_acquired_aggregate(
          where: { coupon_id: { _eq: $coupon_id }, redeemed: { _eq: true } }
        ) {
          aggregate {
            count
          }
        }
      }
    `;

    return this.executeOperation<GetCouponStatisticsData, { coupon_id: number }>(token, query, { coupon_id: couponId }).pipe(
      map((data) => ({
        acquired: data.acquired?.aggregate?.count ?? 0,
        redeemed: data.redeemed?.aggregate?.count ?? 0,
      }))
    );
  }

  getCouponWithImageByCode(token: string, uniqueCode: string): Observable<CouponAcquiredWithImage | null> {
    const query = `
      query GetCouponWithImageByCode($unique_code: String!) {
        viajerosv_coupons_acquired(
          where: {
            _or: [
              { unique_code: { _eq: $unique_code } }
              { unique_code: { _ilike: $unique_code } }
            ]
          }
        ) {
          id
          unique_code
          acquired_at
          redeemed
          redeemed_at
          coupon_with_image_base64 {
            id
            title
            description
            price
            price_discount
            start_date
            end_date
            image_mime_type
            image_size
            image
          }
          user_id
          validated_by
        }
      }
    `;

    return this.executeOperation<GetCouponWithImageByCodeData, { unique_code: string }>(
      token,
      query,
      { unique_code: uniqueCode }
    ).pipe(map((data) => data.viajerosv_coupons_acquired[0] ?? null));
  }

  redeemCouponByCode(token: string, uniqueCode: string): Observable<CouponAcquired | null> {
    const mutation = `
      mutation Redeem($unique_code: String!) {
        viajerosv_redeem_coupon(args: { p_unique_code: $unique_code }) {
          id
          coupon_id
          user_id
          unique_code
          redeemed
          redeemed_at
          validated_by
        }
      }
    `;

    return this.executeOperation<RedeemCouponData, { unique_code: string }>(
      token,
      mutation,
      { unique_code: uniqueCode }
    ).pipe(map((data) => data.viajerosv_redeem_coupon ?? null));
  }

  transferCoupon(token: string, uniqueCode: string, email: string): Observable<TransferCouponResult | null> {
    const mutation = `
      mutation TransferCoupon($unique_code: String!, $email: String!) {
        viajerosv_transfer_coupon(
          args: {
            p_unique_code: $unique_code,
            p_dest_email: $email
          }
        ) {
          id
          unique_code
          user_id
          acquired_at
        }
      }
    `;

    return this.executeOperation<TransferCouponData, { unique_code: string; email: string }>(
      token,
      mutation,
      { unique_code: uniqueCode, email }
    ).pipe(map((data) => data.viajerosv_transfer_coupon ?? null));
  }

  insertCoupon(token: string, variables: InsertCouponVariables): Observable<CouponSummary | null> {
    const mutation = `
      mutation InsertCoupon(
        $category_id: bigint!
        $end_date: date!
        $start_date: date!
        $stock_available: Int
        $stock_total: Int
        $price: numeric
        $price_discount: numeric
        $description: String
        $terms: String
        $auto_published: Boolean = false
        $published: Boolean = false
        $title: String!
        $image: String
      ) {
        insert_viajerosv_coupons(
          objects: {
            category_id: $category_id
            end_date: $end_date
            start_date: $start_date
            stock_available: $stock_available
            stock_total: $stock_total
            price: $price
            price_discount: $price_discount
            description: $description
            terms: $terms
            auto_published: $auto_published
            published: $published
            title: $title
            image_base64_upload: $image
          }
        ) {
          affected_rows
          returning {
            id
            user_id
            title
            published
            created_at
            updated_at
          }
        }
      }
    `;

    return this.executeOperation<InsertCouponData, InsertCouponVariables>(
      token,
      mutation,
      variables
    ).pipe(map((data) => data.insert_viajerosv_coupons.returning[0] ?? null));
  }

  updateCoupon(token: string, variables: UpdateCouponVariables): Observable<CouponSummary | null> {
    const mutation = `
      mutation UpdateCoupon(
        $id: bigint!
        $category_id: bigint
        $end_date: date
        $start_date: date
        $stock_available: Int
        $price: numeric
        $price_discount: numeric
        $description: String
        $terms: String
        $auto_published: Boolean
        $published: Boolean
        $title: String
        $image: String
      ) {
        update_viajerosv_coupons_by_pk(
          pk_columns: { id: $id }
          _set: {
            category_id: $category_id
            end_date: $end_date
            start_date: $start_date
            stock_available: $stock_available
            price: $price
            price_discount: $price_discount
            description: $description
            terms: $terms
            auto_published: $auto_published
            published: $published
            title: $title
            image_base64_upload: $image
          }
        ) {
          id
          user_id
          title
          published
          updated_at
        }
      }
    `;

    return this.executeOperation<UpdateCouponData, UpdateCouponVariables>(token, mutation, variables).pipe(
      map((data) => (data.update_viajerosv_coupons_by_pk as CouponSummary | null) ?? null)
    );
  }



  deleteCoupon(token: string, id: number): Observable<boolean> {
    const mutation = `
      mutation ChangeStatus($id: bigint!, $active: Boolean!) {
        viajerosv_change_coupon_status(
          args: {
            p_coupon_id: $id
            p_active: $active
          }
        ) {
          id
          active
        }
      }
    `;

    return this.executeOperation<ChangeStatusData, { id: number; active: boolean }>(token, mutation, { id, active: false }).pipe(
      map((data) => data.viajerosv_change_coupon_status.id > 0)
    );
  }
  setCouponPublished(
    token: string,
    variables: PublishCouponVariables
  ): Observable<Coupon | null> {
    const mutation = `
      mutation UpdateCoupon($id: bigint!, $published: Boolean) {
        update_viajerosv_coupons_by_pk(
          pk_columns: { id: $id }
          _set: { published: $published }
        ) {
          category_id
          id
          user_id
          auto_published
          published
          title
          end_date
          start_date
          stock_available
          stock_total
          price
          price_discount
          description
          terms
          created_at
          updated_at
        }
      }
    `;

    return this.executeOperation<UpdateCouponData, PublishCouponVariables>(
      token,
      mutation,
      variables
    ).pipe(map((data) => (data.update_viajerosv_coupons_by_pk as Coupon | null) ?? null));
  }

  private mapCouponHighlight(coupon: CouponHighlightRow): Coupon {
    return {
      id: coupon.id,
      user_id: coupon.user_id ?? 0,
      category_id: coupon.category_id,
      auto_published: coupon.auto_published ?? false,
      published: coupon.published ?? true,
      title: coupon.title,
      end_date: coupon.end_date ?? '',
      start_date: coupon.start_date ?? '',
      stock_available: coupon.stock_available,
      stock_total: coupon.stock_total ?? null,
      price: coupon.price != null ? String(coupon.price) : null,
      price_discount: coupon.price_discount != null ? String(coupon.price_discount) : null,
      description: coupon.description,
      terms: coupon.terms ?? null,
      created_at: coupon.created_at ?? '',
      updated_at: coupon.updated_at ?? coupon.created_at ?? coupon.end_date ?? '',
      user: coupon.user,
    };
  }
}
