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

interface GetCouponsData {
  viajerosv_coupons: Coupon[];
  viajerosv_coupons_aggregate: {
    aggregate: {
      count: number;
    };
  };
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

export interface Coupon {
  id: number;
  user_id: number;
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
}

export interface CouponSummary {
  id: number;
  user_id: number;
  title: string;
  published: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GetCouponsVariables {
  limit?: number;
  offset?: number;
}

export interface InsertCouponVariables {
  user_id: number;
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
}

export interface PublishCouponVariables {
  id: number;
  published: boolean;
}

export interface CouponListResult {
  rows: Coupon[];
  total: number;
}

const DEFAULT_HASURA_ENDPOINT = 'https://api.grupoavanza.work/v1/graphql';

@Injectable({
  providedIn: 'root',
})
export class CouponService {
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
    const query = `
      query GetCoupons($limit: Int, $offset: Int) {
        viajerosv_coupons(limit: $limit, offset: $offset) {
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
        viajerosv_coupons_aggregate {
          aggregate {
            count
          }
        }
      }
    `;

    return this.executeOperation<GetCouponsData, GetCouponsVariables>(token, query, variables).pipe(
      map((data) => ({
        rows: data.viajerosv_coupons,
        total: data.viajerosv_coupons_aggregate.aggregate.count,
      }))
    );
  }

  insertCoupon(token: string, variables: InsertCouponVariables): Observable<CouponSummary | null> {
    const mutation = `
      mutation InsertCoupon(
        $user_id: bigint!
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
      ) {
        insert_viajerosv_coupons(
          objects: {
            user_id: $user_id
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
}
