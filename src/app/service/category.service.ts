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

interface GetCategoriesData {
  viajerosv_categories: Category[];
}

interface UpsertCategoryData {
  insert_viajerosv_categories: {
    affected_rows: number;
    returning: Category[];
  };
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
}

export interface UpsertCategoryVariables {
  name: string;
  description: string | null;
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
    const query = `
      query GetCategories {
        viajerosv_categories {
          id
          active
          name
          description
        }
      }
    `;

    return this.executeOperation<GetCategoriesData, Record<string, never>>(token, query, {}).pipe(
      map((data) => data.viajerosv_categories)
    );
  }

  upsertCategory(token: string, variables: UpsertCategoryVariables): Observable<Category | null> {
    const mutation = `
      mutation UpsertCategory($name: String!, $description: String, $active: Boolean!) {
        insert_viajerosv_categories(
          objects: { name: $name, description: $description, active: $active },
          on_conflict: {
            constraint: categories_name_key,
            update_columns: [name, description, active]
          }
        ) {
          affected_rows
          returning {
            id
            name
            description
            active
          }
        }
      }
    `;

    return this.executeOperation<UpsertCategoryData, UpsertCategoryVariables>(
      token,
      mutation,
      variables
    ).pipe(map((data) => data.insert_viajerosv_categories.returning[0] ?? null));
  }
}
