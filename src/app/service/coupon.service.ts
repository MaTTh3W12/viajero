import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

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
  extensions?: {
    code?: string;
    internal?: {
      error?: {
        message?: string;
      };
    };
  };
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

interface GetCouponsByIdsData {
  viajerosv_coupons: Coupon[];
}

interface GetCouponsWithStatusByIdsData {
  viajerosv_coupons_with_status: CouponHighlightRow[];
}

interface GetUsersBasicByIdsData {
  viajerosv_users: UserBasic[];
}

interface GetHomeFeaturedCouponsAggregateData {
  aggregate: {
    count: number;
  };
}

interface GetCouponImageData {
  viajerosv_coupons_with_image_base64: CouponImagePreview[];
}

interface CouponWithImagePublicSnapshotRow {
  id: number | string;
  image_base64?: string | null;
  image_mime_type?: string | null;
  image_size?: number | null;
  title?: string | null;
  description?: string | null;
  price?: string | number | null;
  price_discount?: string | number | null;
  start_date?: string | null;
  end_date?: string | null;
  user?: {
    company_commercial_name?: string | null;
    company_address?: string | null;
    company_map_url?: string | null;
  } | null;
}

interface GetCouponWithImagePublicSnapshotsData {
  viajerosv_coupons_with_image_base64: CouponWithImagePublicSnapshotRow[];
}

interface PublicCouponCompanyRow {
  id: number;
  user_public: {
    id: string | number;
    company_commercial_name: string | null;
    company_address: string | null;
    company_map_url: string | null;
  } | null;
}

interface GetPublicCouponCompaniesByIdsData {
  viajerosv_coupons: PublicCouponCompanyRow[];
}

interface PublicUserCompanyRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_commercial_name: string | null;
  company_address: string | null;
  company_map_url: string | null;
}

interface GetUsersPublicByIdsData {
  viajerosv_users_public: PublicUserCompanyRow[];
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

interface CouponAcquiredWithImageRow {
  id: number | string;
  unique_code: string;
  acquired_at: string;
  redeemed: boolean;
  redeemed_at: string | null;
  user_id: number | string;
  validated_by: number | string | null;
  user_public?: {
    id: string | number;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  userPublicByValidatedBy?: {
    id?: string | number;
    first_name: string | null;
    last_name: string | null;
    company_commercial_name?: string | null;
    company_address?: string | null;
    company_map_url?: string | null;
    company_facebook?: string | null;
    company_instagram?: string | null;
    company_youtube?: string | null;
    company_twitter?: string | null;
    company_website?: string | null;
  } | null;
  coupon?: {
    id?: number | string | null;
    user_id?: number | string | null;
    category_id?: number | null;
    active?: boolean | null;
    title?: string | null;
    description?: string | null;
    price?: string | number | null;
    price_discount?: string | number | null;
    start_date?: string | null;
    end_date?: string | null;
    user_public?: {
      id?: string | number;
      company_commercial_name?: string | null;
      company_address?: string | null;
      company_map_url?: string | null;
    } | null;
  } | null;
  coupon_with_image_base64?: {
    id?: number | string | null;
    title?: string | null;
    description?: string | null;
    price?: string | number | null;
    price_discount?: string | number | null;
    start_date?: string | null;
    end_date?: string | null;
    image_base64?: string | null;
    image_size?: number | null;
    image_mime_type?: string | null;
    image?: string | null;
    user?: {
      company_commercial_name?: string | null;
      company_address?: string | null;
      company_map_url?: string | null;
    } | null;
  } | null;
}

interface GetCouponWithImageByCodeData {
  viajerosv_coupons_acquired: CouponAcquiredWithImageRow[];
}

interface RedeemCouponData {
  viajerosv_redeem_coupon: CouponAcquired | null;
}

interface TransferCouponData {
  viajerosv_transfer_coupon: TransferCouponResult | null;
}

interface CouponStatsWithCompanyRow {
  coupon_id: number | string;
  company_id: number | string;
  title: string | null;
  stock_total: number | null;
  stock_available: number | null;
  total_acquired: number | null;
  total_redeemed: number | null;
  total_pending: number | null;
}

interface GetCouponStatsWithCompanyData {
  viajerosv_coupon_statistics: CouponStatsWithCompanyRow[];
}

interface CouponMonthlyRedemptionHistoryRow {
  month_name: string;
  redemption_year: number;
  total_redemptions: number | null;
}

interface GetCouponMonthlyRedemptionHistoryData {
  viajerosv_coupon_redemption_monthly_stats: CouponMonthlyRedemptionHistoryRow[];
}

interface CompanyCouponStatsRow {
  company_id: number | string;
  total_acquired: number | null;
  total_redeemed: number | null;
  total_expired: number | null;
  total_upcoming_expiration: number | null;
}

interface GetCompanyCouponStatsData {
  viajerosv_company_coupon_stats: CompanyCouponStatsRow[];
}

interface RedemptionPerformanceRow {
  redemption_date: string;
  redemption_count: number | null;
  coupon_id: number | string | null;
  coupon_title: string | null;
}

interface GetMonthlyRedemptionPerformanceData {
  viajerosv_redemption_performance: RedemptionPerformanceRow[];
}

interface CompanyTopRedeemedCouponRow {
  coupon_id: number | string;
  coupon_name: string | null;
  redemption_count: number | null;
}

interface GetCompanyTopRedeemedCouponsData {
  viajerosv_company_top_redeemed_coupons: CompanyTopRedeemedCouponRow[];
}

interface AdminDashboardStatsRow {
  total_companies: number | null;
  active_users: number | null;
  active_coupons: number | null;
  total_redemptions: number | null;
}

interface GetAdminDashboardStatsData {
  viajerosv_admin_dashboard_stats: AdminDashboardStatsRow[];
}

interface CouponPerformanceTopRow {
  title: string | null;
  redemption_count: number | null;
}

interface GetCouponPerformanceTopData {
  viajerosv_coupon_performance_top_5: CouponPerformanceTopRow[];
}

interface CompanyRedemptionShareRow {
  company_name: string | null;
  total_redemptions: number | null;
  percentage: number | null;
}

interface GetCompanyRedemptionShareData {
  viajerosv_company_redemptions_30_days: CompanyRedemptionShareRow[];
}

interface ImmediateManagementCountsRow {
  pending_validations_count: number | null;
  pending_messages_count: number | null;
  expiring_coupons_count: number | null;
}

interface GetImmediateManagementCountsData {
  viajerosv_immediate_management_counts: ImmediateManagementCountsRow[];
}

interface AuditLogRow {
  id: number | string;
  reference_id: number | string | null;
  action_type: string | null;
  entity: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
  user_id: string | null;
  user_public: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface GetAuditLogsDynamicData {
  viajerosv_audit_logs: AuditLogRow[];
  viajerosv_audit_logs_aggregate: {
    aggregate: {
      count: number;
    };
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
  user_public: {
    company_commercial_name: string | null;
    company_address: string | null;
    company_map_url: string | null;
    company_facebook?: string | null;
    company_instagram?: string | null;
    company_youtube?: string | null;
    company_twitter?: string | null;
    company_website?: string | null;
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
  active?: boolean | null;
  user_id: number | string;
  terms: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  end_date?: string | null;
  user_public: {
    company_commercial_name: string | null;
    company_address: string | null;
    company_map_url: string | null;
    company_facebook?: string | null;
    company_instagram?: string | null;
    company_youtube?: string | null;
    company_twitter?: string | null;
    company_website?: string | null;
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
  active?: boolean;
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
    company_nit?: string | null;
    company_address: string | null;
    company_map_url: string | null;
  } | null;
  user_public?: {
    id?: string | number;
    company_commercial_name: string | null;
    company_nit?: string | null;
    company_address: string | null;
    company_map_url: string | null;
    company_facebook?: string | null;
    company_instagram?: string | null;
    company_youtube?: string | null;
    company_twitter?: string | null;
    company_website?: string | null;
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
  company_address?: string | null;
  company_map_url?: string | null;
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
  user_public?: {
    id: string | number;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  coupon?: {
    id?: number | string | null;
    title: string | null;
    description: string | null;
    price?: string | number | null;
    price_discount: string | number | null;
    start_date?: string | null;
    end_date: string | null;
    user_public?: {
      id: string | number;
      company_commercial_name: string | null;
      company_address: string | null;
      company_map_url: string | null;
    } | null;
  } | null;
  coupon_with_image_base64?: {
    id?: number | string | null;
    title?: string | null;
    description?: string | null;
    price?: string | number | null;
    price_discount?: string | number | null;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
  userPublicByValidatedBy?: {
    id?: string | number;
    first_name: string | null;
    last_name: string | null;
    company_commercial_name?: string | null;
    company_address?: string | null;
    company_map_url?: string | null;
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
  image_base64?: string | null;
}

export interface CouponAcquiredWithImage {
  id: number | string;
  unique_code: string;
  acquired_at: string;
  redeemed: boolean;
  redeemed_at: string | null;
  user_id: number | string;
  validated_by: number | string | null;
  user_public?: {
    id: string | number;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  userPublicByValidatedBy?: {
    id?: string | number;
    first_name: string | null;
    last_name: string | null;
    company_commercial_name?: string | null;
    company_address?: string | null;
    company_map_url?: string | null;
    company_facebook?: string | null;
    company_instagram?: string | null;
    company_youtube?: string | null;
    company_twitter?: string | null;
    company_website?: string | null;
  } | null;
  coupon?: {
    id?: number | string | null;
    user_id?: number | string | null;
    category_id?: number | null;
    active?: boolean | null;
    title?: string | null;
    description?: string | null;
    price?: string | number | null;
    price_discount?: string | number | null;
    start_date?: string | null;
    end_date?: string | null;
    user_public?: {
      id?: string | number;
      company_commercial_name?: string | null;
      company_address?: string | null;
      company_map_url?: string | null;
    } | null;
  } | null;
  coupon_with_image_base64: CouponWithImageDetails | null;
}

export interface CompanyCouponStats {
  companyId: number | string;
  totalAcquired: number;
  totalRedeemed: number;
  totalExpired: number;
  totalUpcomingExpiration: number;
}

export interface MonthlyRedemptionPerformance {
  redemptionDate: string;
  redemptionCount: number;
  couponId: number | string | null;
  couponTitle: string | null;
}

export interface CompanyTopRedeemedCoupon {
  couponId: number | string;
  couponName: string;
  redemptionCount: number;
}

export interface CouponStatsWithCompany {
  couponId: number | string;
  companyId: number | string;
  title: string;
  stockTotal: number;
  stockAvailable: number;
  totalAcquired: number;
  totalRedeemed: number;
  totalPending: number;
}

export interface CouponMonthlyRedemptionHistory {
  monthName: string;
  redemptionYear: number;
  totalRedemptions: number;
}

export interface AuditLogUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export interface AuditLog {
  id: number | string;
  referenceId: number | string | null;
  actionType: string;
  entity: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  userId: string | null;
  userPublic: AuditLogUser | null;
}

export interface GetAuditLogsVariables {
  limit: number;
  offset: number;
  where: Record<string, unknown>;
}

export interface AuditLogListResult {
  rows: AuditLog[];
  total: number;
}

export interface AdminDashboardStats {
  totalCompanies: number;
  activeUsers: number;
  activeCoupons: number;
  totalRedemptions: number;
}

export interface AdminCouponPerformance {
  title: string;
  redemptionCount: number;
}

export interface CompanyRedemptionShare {
  companyName: string;
  totalRedemptions: number;
  percentage: number;
}

export interface ImmediateManagementCounts {
  pendingValidationsCount: number;
  pendingMessagesCount: number;
  expiringCouponsCount: number;
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
  stock_total?: number | null;
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

export interface CompanySocialLinks {
  company_facebook: string | null;
  company_instagram: string | null;
  company_youtube: string | null;
  company_twitter: string | null;
  company_website: string | null;
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
      active
      category_id
      user_id
      user_public {
        id
        company_commercial_name
        company_address
        company_map_url
        company_facebook
        company_instagram
        company_youtube
        company_twitter
        company_website
      }
      terms
      created_at
      updated_at
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
      user_public {
        company_commercial_name
        company_address
        company_map_url
        company_facebook
        company_instagram
        company_youtube
        company_twitter
        company_website
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
      user_public {
        company_commercial_name
        company_address
        company_map_url
        company_facebook
        company_instagram
        company_youtube
        company_twitter
        company_website
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
      user_public {
        company_commercial_name
        company_address
        company_map_url
        company_facebook
        company_instagram
        company_youtube
        company_twitter
        company_website
      }
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class CouponService {
  constructor(private http: HttpClient) {}

  private getGraphQLErrorMessage(errors: GraphQLError[]): string {
    const messages = errors
      .map((error) => error.extensions?.internal?.error?.message || error.message)
      .filter((message): message is string => !!message)
      .map((message) => message.trim())
      .filter((message) => message.length > 0);

    if (!messages.length) return 'Error en operación GraphQL';
    return Array.from(new Set(messages)).join(' | ');
  }

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
            throw new Error(this.getGraphQLErrorMessage(response.errors));
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
            throw new Error(this.getGraphQLErrorMessage(response.errors));
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
    return this.getPublicCoupons({
      limit: 1,
      offset: 0,
      where: {
        _and: [
          { id: { _eq: id } },
          { active: { _eq: true } },
          { published: { _eq: true } },
        ],
      },
    }).pipe(
      map((data) => data.rows[0] ?? null)
    );
  }

  getCouponCompanySocials(token: string, id: number): Observable<CompanySocialLinks | null> {
    void token;

    return this.getPublicCoupons({
      limit: 1,
      offset: 0,
      where: {
        _and: [
          { id: { _eq: id } },
          { active: { _eq: true } },
          { published: { _eq: true } },
        ],
      },
    }).pipe(
      map((data) => data.rows[0]?.user_public ?? null),
      map((userPublic) => {
        if (!userPublic) return null;

        return {
          company_facebook: userPublic.company_facebook ?? null,
          company_instagram: userPublic.company_instagram ?? null,
          company_youtube: userPublic.company_youtube ?? null,
          company_twitter: userPublic.company_twitter ?? null,
          company_website: userPublic.company_website ?? null,
        };
      })
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

    return forkJoin(
      uniqueIds.map((id) => this.getCouponImage(token, id).pipe(map((image) => image ?? null)))
    ).pipe(map((images) => images.filter((image): image is CouponImagePreview => image !== null)));
  }

  getPublicCouponImagesByIds(ids: number[]): Observable<CouponImagePreview[]> {
    const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id))));
    if (uniqueIds.length === 0) {
      return of([]);
    }

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

    return forkJoin(
      uniqueIds.map((id) =>
        this.executePublicOperation<GetCouponImageData, { id: number }>(query, { id }).pipe(
          map((data) => data.viajerosv_coupons_with_image_base64[0] ?? null),
          catchError(() => of(null))
        )
      )
    ).pipe(map((images) => images.filter((image): image is CouponImagePreview => image !== null)));
  }

  getPublicCouponImageSnapshotsByIds(ids: number[]): Observable<CouponWithImagePublicSnapshotRow[]> {
    const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id))));
    if (uniqueIds.length === 0) {
      return of([]);
    }

    const query = `
      query GetCouponWithImagePublicSnapshotsByIds($ids: [bigint!]!) {
        viajerosv_coupons_with_image_base64(where: { id: { _in: $ids } }) {
          id
          image_base64
          image_size
          image_mime_type
          user {
            company_commercial_name
            company_address
            company_map_url
          }
        }
      }
    `;

    return this.executePublicOperation<GetCouponWithImagePublicSnapshotsData, { ids: number[] }>(query, {
      ids: uniqueIds,
    }).pipe(map((data) => data.viajerosv_coupons_with_image_base64 ?? []));
  }

  getPublicCouponsByIds(ids: number[]): Observable<Coupon[]> {
    const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id))));
    if (uniqueIds.length === 0) {
      return of([]);
    }

    const query = `
      query GetPublicCouponsByIds($ids: [bigint!]!) {
        viajerosv_coupons(where: { id: { _in: $ids } }) {
          category_id
          id
          user_id
          active
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
          user_public {
            id
            company_commercial_name
            company_address
            company_map_url
          }
        }
      }
    `;

    return this.executePublicOperation<GetCouponsByIdsData, { ids: number[] }>(query, { ids: uniqueIds }).pipe(
      map((data) => data.viajerosv_coupons ?? [])
    );
  }

  getCouponsWithStatusByIds(token: string, ids: number[]): Observable<Coupon[]> {
    void token;
    void ids;
    return of([]);
  }

  getPublicCouponCompaniesByIds(ids: number[]): Observable<PublicCouponCompanyRow[]> {
    const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id))));
    if (uniqueIds.length === 0) {
      return of([]);
    }

    const query = `
      query GetPublicCouponCompaniesByIds($ids: [bigint!]!) {
        viajerosv_coupons(where: { id: { _in: $ids } }) {
          id
          user_public {
            id
            company_commercial_name
            company_address
            company_map_url
          }
        }
      }
    `;

    return this.executePublicOperation<GetPublicCouponCompaniesByIdsData, { ids: number[] }>(query, { ids: uniqueIds }).pipe(
      map((data) => data.viajerosv_coupons ?? [])
    );
  }

  getUsersPublicByIds(ids: string[]): Observable<PublicUserCompanyRow[]> {
    const uniqueIds = Array.from(new Set(ids.map((id) => String(id).trim()).filter((id) => !!id)));
    if (uniqueIds.length === 0) {
      return of([]);
    }

    const query = `
      query GetUsersPublicByIds($ids: [uuid!]!) {
        viajerosv_users_public(where: { id: { _in: $ids } }) {
          id
          first_name
          last_name
          company_commercial_name
          company_address
          company_map_url
        }
      }
    `;

    return this.executePublicOperation<GetUsersPublicByIdsData, { ids: string[] }>(query, { ids: uniqueIds }).pipe(
      map((data) => data.viajerosv_users_public ?? [])
    );
  }


  getCouponOwner(token: string, id: number): Observable<CouponOwner | null> {
    return this.getCoupons(token, {
      limit: 1,
      offset: 0,
      where: { id: { _eq: id } },
    }).pipe(
      map((data) => {
        const row = data.rows[0];
        if (!row) return null;

        return {
          id: row.id,
          user_id: row.user_id,
        };
      })
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
    const queryWithCompany = `
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
            user_public {
              id
              company_commercial_name
              company_address
              company_map_url
            }
          }
          userPublicByValidatedBy {
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

    const queryBasic = `
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
          userPublicByValidatedBy {
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

    return this.executeOperation<GetCouponsAcquiredData, typeof safeVariables>(token, queryWithCompany, safeVariables).pipe(
      map((data) => ({
        rows: data.viajerosv_coupons_acquired,
        total: data.viajerosv_coupons_acquired_aggregate.aggregate.count,
      })),
      catchError((error) => {
        console.warn('[COUPONS] getCouponsAcquired fallback to basic coupon payload', error);
        return this.executeOperation<GetCouponsAcquiredData, typeof safeVariables>(token, queryBasic, safeVariables).pipe(
          map((data) => ({
            rows: data.viajerosv_coupons_acquired,
            total: data.viajerosv_coupons_acquired_aggregate.aggregate.count,
          }))
        );
      })
    );
  }

  getCouponsByIds(token: string, couponIds: number[]): Observable<Coupon[]> {
    const queryWithCompany = `
      query GetCouponsByIds($ids: [bigint!]!) {
        viajerosv_coupons(where: { id: { _in: $ids } }) {
          category_id
          id
          user_id
          active
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
          user_public {
            id
            company_commercial_name
            company_address
            company_map_url
          }
        }
      }
    `;

    const queryBasic = `
      query GetCouponsByIdsBasic($ids: [bigint!]!) {
        viajerosv_coupons(where: { id: { _in: $ids } }) {
          category_id
          id
          user_id
          active
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

    return this.executeOperation<GetCouponsByIdsData, { ids: number[] }>(token, queryWithCompany, { ids: couponIds }).pipe(
      map((data) => data.viajerosv_coupons ?? []),
      catchError((error) => {
        console.warn('[COUPONS] getCouponsByIds fallback to basic query', error);
        return this.executeOperation<GetCouponsByIdsData, { ids: number[] }>(token, queryBasic, { ids: couponIds }).pipe(
          map((data) => data.viajerosv_coupons ?? [])
        );
      })
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
        }
      }
    `;

    return this.executeOperation<GetUsersBasicByIdsData, { ids: string[] }>(token, query, { ids: uniqueIds }).pipe(
      map((data) => data.viajerosv_users ?? [])
    );
  }

  hasAcquiredCoupon(token: string, couponId: number): Observable<boolean> {
    return this.getCouponsAcquired(token, {
      limit: 1,
      offset: 0,
      where: { coupon_id: { _eq: couponId } },
    }).pipe(
      map((data) => (data.total ?? 0) > 0)
    );
  }

  getCouponStatsWithCompany(token: string, couponId: number): Observable<CouponStatsWithCompany | null> {
    const query = `
      query GetCouponStatsWithCompany($coupon_id: bigint!) {
        viajerosv_coupon_statistics(where: { coupon_id: { _eq: $coupon_id } }) {
          coupon_id
          company_id
          title
          stock_total
          stock_available
          total_acquired
          total_redeemed
          total_pending
        }
      }
    `;

    return this.executeOperation<GetCouponStatsWithCompanyData, { coupon_id: number }>(token, query, { coupon_id: couponId }).pipe(
      map((data) => {
        const row = data.viajerosv_coupon_statistics?.[0];
        if (!row) return null;

        return {
          couponId: row.coupon_id,
          companyId: row.company_id,
          title: row.title?.trim() || 'Cupón sin nombre',
          stockTotal: row.stock_total ?? 0,
          stockAvailable: row.stock_available ?? 0,
          totalAcquired: row.total_acquired ?? 0,
          totalRedeemed: row.total_redeemed ?? 0,
          totalPending: row.total_pending ?? 0,
        };
      })
    );
  }

  getMonthlyRedemptionHistory(token: string, couponId: number): Observable<CouponMonthlyRedemptionHistory[]> {
    const query = `
      query GetMonthlyRedemptionHistory($coupon_id: bigint!) {
        viajerosv_coupon_redemption_monthly_stats(
          where: { coupon_id: { _eq: $coupon_id } }
          order_by: { redemption_year: asc, redemption_month: asc }
        ) {
          month_name
          redemption_year
          total_redemptions
        }
      }
    `;

    return this.executeOperation<GetCouponMonthlyRedemptionHistoryData, { coupon_id: number }>(token, query, { coupon_id: couponId }).pipe(
      map((data) =>
        (data.viajerosv_coupon_redemption_monthly_stats ?? []).map((row) => ({
          monthName: row.month_name,
          redemptionYear: row.redemption_year,
          totalRedemptions: row.total_redemptions ?? 0,
        }))
      )
    );
  }

  getCompanyCouponStats(token: string): Observable<CompanyCouponStats | null> {
    const query = `
      query GetCompanyCouponStats {
        viajerosv_company_coupon_stats {
          company_id
          total_acquired
          total_redeemed
          total_expired
          total_upcoming_expiration
        }
      }
    `;

    return this.executeOperation<GetCompanyCouponStatsData, Record<string, never>>(token, query, {}).pipe(
      map((data) => {
        const row = data.viajerosv_company_coupon_stats?.[0];
        if (!row) {
          return {
            companyId: 0,
            totalAcquired: 0,
            totalRedeemed: 0,
            totalExpired: 0,
            totalUpcomingExpiration: 0,
          };
        }

        return {
          companyId: row.company_id,
          totalAcquired: row.total_acquired ?? 0,
          totalRedeemed: row.total_redeemed ?? 0,
          totalExpired: row.total_expired ?? 0,
          totalUpcomingExpiration: row.total_upcoming_expiration ?? 0,
        };
      })
    );
  }

  getMonthlyRedemptionPerformance(token: string): Observable<MonthlyRedemptionPerformance[]> {
    const query = `
      query GetMonthlyRedemptionPerformance {
        viajerosv_redemption_performance(order_by: { redemption_date: asc }) {
          redemption_date
          redemption_count
          coupon_id
          coupon_title
        }
      }
    `;

    return this.executeOperation<GetMonthlyRedemptionPerformanceData, Record<string, never>>(token, query, {}).pipe(
      map((data) =>
        (data.viajerosv_redemption_performance ?? []).map((row) => ({
          redemptionDate: row.redemption_date,
          redemptionCount: row.redemption_count ?? 0,
          couponId: row.coupon_id ?? null,
          couponTitle: row.coupon_title ?? null,
        }))
      )
    );
  }

  getCompanyTopRedeemedCoupons(token: string): Observable<CompanyTopRedeemedCoupon[]> {
    const query = `
      query GetMyTop5Coupons {
        viajerosv_company_top_redeemed_coupons(
          limit: 5
          order_by: { redemption_count: desc }
        ) {
          coupon_id
          coupon_name
          redemption_count
        }
      }
    `;

    return this.executeOperation<GetCompanyTopRedeemedCouponsData, Record<string, never>>(token, query, {}).pipe(
      map((data) =>
        (data.viajerosv_company_top_redeemed_coupons ?? []).map((row) => ({
          couponId: row.coupon_id,
          couponName: row.coupon_name?.trim() || 'Cupón sin nombre',
          redemptionCount: row.redemption_count ?? 0,
        }))
      )
    );
  }

  getAdminDashboardStats(token: string): Observable<AdminDashboardStats> {
    const query = `
      query GetAdminDashboard {
        viajerosv_admin_dashboard_stats {
          total_companies
          active_users
          active_coupons
          total_redemptions
        }
      }
    `;

    return this.executeOperation<GetAdminDashboardStatsData, Record<string, never>>(token, query, {}).pipe(
      map((data) => {
        const row = data.viajerosv_admin_dashboard_stats?.[0];

        return {
          totalCompanies: row?.total_companies ?? 0,
          activeUsers: row?.active_users ?? 0,
          activeCoupons: row?.active_coupons ?? 0,
          totalRedemptions: row?.total_redemptions ?? 0,
        };
      })
    );
  }

  getCouponPerformanceTop5(token: string): Observable<AdminCouponPerformance[]> {
    const query = `
      query GetCouponPerformanceChart {
        viajerosv_coupon_performance_top_5 {
          title
          redemption_count
        }
      }
    `;

    return this.executeOperation<GetCouponPerformanceTopData, Record<string, never>>(token, query, {}).pipe(
      map((data) =>
        (data.viajerosv_coupon_performance_top_5 ?? []).map((row) => ({
          title: row.title?.trim() || 'Cupón sin nombre',
          redemptionCount: row.redemption_count ?? 0,
        }))
      )
    );
  }

  getCompanyRedemptionShare(token: string): Observable<CompanyRedemptionShare[]> {
    const query = `
      query GetCompanyRedemptionShare {
        viajerosv_company_redemptions_30_days {
          company_name
          total_redemptions
          percentage
        }
      }
    `;

    return this.executeOperation<GetCompanyRedemptionShareData, Record<string, never>>(token, query, {}).pipe(
      map((data) =>
        (data.viajerosv_company_redemptions_30_days ?? []).map((row) => ({
          companyName: row.company_name?.trim() || 'Empresa sin nombre',
          totalRedemptions: row.total_redemptions ?? 0,
          percentage: row.percentage ?? 0,
        }))
      )
    );
  }

  getImmediateManagementCounts(token: string): Observable<ImmediateManagementCounts> {
    const query = `
      query GetManagementBadges {
        viajerosv_immediate_management_counts {
          pending_validations_count
          pending_messages_count
          expiring_coupons_count
        }
      }
    `;

    return this.executeOperation<GetImmediateManagementCountsData, Record<string, never>>(token, query, {}).pipe(
      map((data) => {
        const row = data.viajerosv_immediate_management_counts?.[0];

        return {
          pendingValidationsCount: row?.pending_validations_count ?? 0,
          pendingMessagesCount: row?.pending_messages_count ?? 0,
          expiringCouponsCount: row?.expiring_coupons_count ?? 0,
        };
      })
    );
  }

  getAuditLogsDynamic(token: string, variables: GetAuditLogsVariables): Observable<AuditLogListResult> {
    const query = `
      query GetAuditLogsDynamic(
        $limit: Int!
        $offset: Int!
        $where: viajerosv_audit_logs_bool_exp!
      ) {
        viajerosv_audit_logs(
          limit: $limit
          offset: $offset
          order_by: { created_at: desc }
          where: $where
        ) {
          id
          reference_id
          action_type
          entity
          details
          ip_address
          created_at
          user_id
          user_public {
            id
            first_name
            last_name
            email
          }
        }
        viajerosv_audit_logs_aggregate(where: $where) {
          aggregate {
            count
          }
        }
      }
    `;

    return this.executeOperation<GetAuditLogsDynamicData, GetAuditLogsVariables>(token, query, variables).pipe(
      map((data) => ({
        rows: (data.viajerosv_audit_logs ?? []).map((row) => ({
          id: row.id,
          referenceId: row.reference_id,
          actionType: row.action_type ?? '',
          entity: row.entity ?? '',
          details: row.details ?? null,
          ipAddress: row.ip_address ?? null,
          createdAt: row.created_at,
          userId: row.user_id ?? null,
          userPublic: row.user_public
            ? {
                id: row.user_public.id,
                firstName: row.user_public.first_name ?? null,
                lastName: row.user_public.last_name ?? null,
                email: row.user_public.email ?? null,
              }
            : null,
        })),
        total: data.viajerosv_audit_logs_aggregate?.aggregate?.count ?? 0,
      }))
    );
  }

  getCouponWithImageByCode(token: string, uniqueCode: string): Observable<CouponAcquiredWithImage | null> {
    const queryWithImagePreview = `
      query GetCouponWithImageByCode($unique_code: String!) {
        viajerosv_coupons_acquired(where: { unique_code: { _eq: $unique_code } }) {
          id
          unique_code
          acquired_at
          redeemed
          redeemed_at
          user_public {
            id
            first_name
            last_name
            email
          }
          userPublicByValidatedBy {
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
          }
          coupon {
            id
            user_id
            category_id
            active
            title
            description
            price
            price_discount
            start_date
            end_date
            user_public {
              id
              company_commercial_name
              company_address
              company_map_url
            }
          }
          coupon_with_image_base64 {
            id
            image_base64
            image_mime_type
            image_size
            user {
              company_commercial_name
              company_address
              company_map_url
            }
          }
          user_id
          validated_by
        }
      }
    `;

    const queryWithoutImage = `
      query GetCouponWithImageByCode($unique_code: String!) {
        viajerosv_coupons_acquired(where: { unique_code: { _eq: $unique_code } }) {
          id
          unique_code
          acquired_at
          redeemed
          redeemed_at
          user_public {
            id
            first_name
            last_name
            email
          }
          userPublicByValidatedBy {
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
          }
          coupon {
            id
            user_id
            category_id
            active
            title
            description
            price
            price_discount
            start_date
            end_date
            user_public {
              id
              company_commercial_name
              company_address
              company_map_url
            }
          }
          user_id
          validated_by
        }
      }
    `;

    return this.executeOperation<GetCouponWithImageByCodeData, { unique_code: string }>(
      token,
      queryWithImagePreview,
      { unique_code: uniqueCode }
    ).pipe(
      map((data) => this.mapCouponAcquiredWithImage(data.viajerosv_coupons_acquired[0] ?? null)),
      catchError((error) => {
        console.info('[COUPONS] getCouponWithImageByCode fallback sin campos de detalle', error);
        return this.executeOperation<GetCouponWithImageByCodeData, { unique_code: string }>(token, queryWithoutImage, {
          unique_code: uniqueCode,
        }).pipe(map((data) => this.mapCouponAcquiredWithImage(data.viajerosv_coupons_acquired[0] ?? null)));
      })
    );
  }

  private mapCouponAcquiredWithImage(row: CouponAcquiredWithImageRow | null): CouponAcquiredWithImage | null {
    if (!row) return null;

    const coupon = row.coupon ?? null;
    const imageRow = row.coupon_with_image_base64 ?? null;

    const fallbackCouponId = Number(coupon?.id ?? imageRow?.id ?? NaN);
    const couponId = Number.isFinite(fallbackCouponId) ? fallbackCouponId : null;

    const title = String(coupon?.title ?? imageRow?.title ?? '').trim();
    const description = coupon?.description ?? imageRow?.description ?? null;
    const price = coupon?.price != null ? String(coupon.price) : imageRow?.price != null ? String(imageRow.price) : null;
    const priceDiscount =
      coupon?.price_discount != null
        ? String(coupon.price_discount)
        : imageRow?.price_discount != null
          ? String(imageRow.price_discount)
          : null;
    const startDate = coupon?.start_date ?? imageRow?.start_date ?? '';
    const endDate = coupon?.end_date ?? imageRow?.end_date ?? '';
    const imageBase64 = imageRow?.image_base64 ?? imageRow?.image ?? null;
    const imageMime = imageRow?.image_mime_type ?? null;
    const imageSize = imageRow?.image_size ?? null;
    const imageUserPublic = imageRow?.user
      ? {
          id: String(row.validated_by ?? row.user_id ?? row.id),
          company_commercial_name: imageRow.user.company_commercial_name ?? null,
          company_address: imageRow.user.company_address ?? null,
          company_map_url: imageRow.user.company_map_url ?? null,
        }
      : null;

    const normalizedDetails: CouponWithImageDetails | null = couponId != null
      ? {
          id: couponId,
          title,
          description,
          price,
          price_discount: priceDiscount,
          start_date: startDate,
          end_date: endDate,
          image_mime_type: imageMime,
          image_size: imageSize,
          image: imageBase64,
          image_base64: imageBase64,
        }
      : null;

    const normalizedCoupon =
      coupon != null
        ? {
            id: coupon.id ?? null,
            user_id: coupon.user_id ?? null,
            category_id: coupon.category_id ?? null,
            active: coupon.active ?? null,
            title: coupon.title ?? imageRow?.title ?? null,
            description: coupon.description ?? imageRow?.description ?? null,
            price: coupon.price ?? imageRow?.price ?? null,
            price_discount: coupon.price_discount ?? imageRow?.price_discount ?? null,
            start_date: coupon.start_date ?? imageRow?.start_date ?? null,
            end_date: coupon.end_date ?? imageRow?.end_date ?? null,
            user_public: coupon.user_public ?? imageUserPublic,
          }
        : couponId != null
          ? {
              id: couponId,
              user_id: row.user_id ?? null,
              category_id: null,
              active: null,
              title: imageRow?.title ?? null,
              description: imageRow?.description ?? null,
              price: imageRow?.price ?? null,
              price_discount: imageRow?.price_discount ?? null,
              start_date: imageRow?.start_date ?? null,
              end_date: imageRow?.end_date ?? null,
              user_public: imageUserPublic,
            }
          : null;

    return {
      id: row.id,
      unique_code: row.unique_code,
      acquired_at: row.acquired_at,
      redeemed: !!row.redeemed,
      redeemed_at: row.redeemed_at ?? null,
      user_id: row.user_id,
      validated_by: row.validated_by ?? null,
      user_public: row.user_public ?? null,
      userPublicByValidatedBy: row.userPublicByValidatedBy ?? null,
      coupon: normalizedCoupon,
      coupon_with_image_base64: normalizedDetails,
    };
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
        $stock_total: Int
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
          id
          user_id
          title
          published
          created_at
          updated_at
          auto_published
          category_id
          description
          end_date
          price
          price_discount
          start_date
          stock_available
          stock_total
          terms
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
      active: coupon.active ?? undefined,
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
      user_public: coupon.user_public,
    };
  }
}
