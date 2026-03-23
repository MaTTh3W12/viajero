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

interface GetCategoriesPagedData {
  viajerosv_categories: Category[];
  viajerosv_categories_aggregate: {
    aggregate: {
      count: number;
    } | null;
  } | null;
}

interface UpsertCategoryData {
  insert_viajerosv_categories: {
    affected_rows: number;
    returning: Category[];
  };
}

interface ChangeCategoryStatusData {
  viajerosv_change_category_status: Category[];
}

export interface Category {
  id: number | string;
  name: string;
  description: string | null;
  active: boolean;
  icon?: string | null;
}

export interface UpsertCategoryVariables {
  name: string;
  description: string | null;
  active: boolean;
  icon?: string | null;
}

export interface GetCategoriesPagedVariables {
  limit: number;
  offset: number;
  where: Record<string, unknown>;
}

export interface GetCategoriesPagedResult {
  rows: Category[];
  total: number;
}

export interface ChangeCategoryStatusVariables {
  id: string;
  active: boolean;
}

const DEFAULT_HASURA_ENDPOINT = 'https://api.grupoavanza.work/v1/graphql';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
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

  getCategories(token: string): Observable<Category[]> {
    return this.getCategoriesPaged(token, {
      limit: 500,
      offset: 0,
      where: {},
    }).pipe(map((data) => data.rows));
  }

  getCategoriesPaged(
    token: string,
    variables: GetCategoriesPagedVariables
  ): Observable<GetCategoriesPagedResult> {
    const query = `
      query GetCategoriesPaged(
        $limit: Int!,
        $offset: Int!,
        $where: viajerosv_categories_bool_exp!
      ) {
        viajerosv_categories(
          limit: $limit,
          offset: $offset,
          order_by: { name: asc },
          where: $where
        ) {
          id
          name
          description
          active
          icon
        }
        viajerosv_categories_aggregate(where: $where) {
          aggregate {
            count
          }
        }
      }
    `;

    return this.executeOperation<GetCategoriesPagedData, GetCategoriesPagedVariables>(
      token,
      query,
      variables
    ).pipe(
      map((data) => ({
        rows: (data.viajerosv_categories ?? [])
          .map((row) => this.mapCategory(row))
          .filter((row): row is Category => row !== null),
        total: data.viajerosv_categories_aggregate?.aggregate?.count ?? 0,
      }))
    );
  }

  upsertCategory(token: string, variables: UpsertCategoryVariables): Observable<Category | null> {
    const mutation = `
      mutation UpsertCategory($name: String!, $description: String, $active: Boolean!, $icon: String) {
        insert_viajerosv_categories(
          objects: { name: $name, description: $description, active: $active, icon: $icon },
          on_conflict: {
            constraint: categories_name_key,
            update_columns: [name, description, active, icon]
          }
        ) {
          affected_rows
          returning {
            id
            name
            description
            active
            icon
          }
        }
      }
    `;

    return this.executeOperation<UpsertCategoryData, UpsertCategoryVariables>(
      token,
      mutation,
      variables
    ).pipe(map((data) => this.mapCategory(data.insert_viajerosv_categories.returning[0] ?? null)));
  }

  changeCategoryStatus(
    token: string,
    variables: ChangeCategoryStatusVariables
  ): Observable<Category | null> {
    const mutation = `
      mutation ChangeCategoryStatus($id: uuid!, $active: Boolean!) {
        viajerosv_change_category_status(
          args: {
            p_category_id: $id
            p_active: $active
          }
        ) {
          id
          name
          active
          icon
          description
        }
      }
    `;

    return this.executeOperation<ChangeCategoryStatusData, ChangeCategoryStatusVariables>(
      token,
      mutation,
      variables
    ).pipe(map((data) => this.mapCategory(data.viajerosv_change_category_status?.[0] ?? null)));
  }

  private mapCategory(category: Category | null | undefined): Category | null {
    if (!category) return null;

    return {
      id: category.id,
      name: category.name,
      description: category.description ?? null,
      active: Boolean(category.active),
      icon: category.icon ?? null,
    };
  }
}
