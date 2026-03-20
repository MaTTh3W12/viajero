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

interface GetMessagesData {
  viajerosv_messages: ContactCenterMessageRow[];
  viajerosv_messages_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

interface GetUnreadMessagesCountData {
  viajerosv_messages_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

interface GetUnreadMessagesCountVariables {
  where: Record<string, unknown>;
}

interface GetMessageTypesData {
  viajerosv_message_types: ContactCenterMessageTypeRow[];
}

interface InsertMessagesData {
  insert_viajerosv_messages: {
    affected_rows: number;
    returning: ContactCenterMessageRow[];
  };
}

export interface ContactCenterMessageRow {
  id: number;
  user_id: string;
  subject: string | null;
  message: string | null;
  message_type?: string | null;
  messageTypeByMessageType?: {
    value: string;
    description?: string | null;
  } | null;
  message_status?: {
    value: string;
  } | null;
  status?: string | null;
  created_at: string;
}

export interface ContactCenterMessageTypeRow {
  value: string;
  description: string;
}

export interface ContactCenterListResult {
  rows: ContactCenterMessageRow[];
  total: number;
}

export interface GetMessagesVariables {
  limit: number;
  offset: number;
  where: Record<string, unknown>;
}

export interface InsertMessageVariables {
  message: string;
  subject: string;
  message_type: string;
}

const DEFAULT_HASURA_ENDPOINT = 'https://api.grupoavanza.work/v1/graphql';

const GET_MESSAGES_QUERY = `
  query GetMessages(
    $limit: Int = 10,
    $offset: Int = 0,
    $where: viajerosv_messages_bool_exp!
  ) {
    viajerosv_messages(
      limit: $limit,
      offset: $offset,
      order_by: { created_at: desc },
      where: $where
    ) {
      id
      user_id
      subject
      message
      status
      message_type
      created_at
      messageTypeByMessageType {
        value
        description
      }
      message_status {
        value
      }
    }

    viajerosv_messages_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

const GET_MESSAGE_TYPES_QUERY = `
  query GetMessageTypes {
    viajerosv_message_types(order_by: { value: asc }) {
      value
      description
    }
  }
`;

const INSERT_MESSAGES_MUTATION = `
  mutation InsertMessages(
    $message: String!
    $subject: String = ""
    $message_type: String!
  ) {
    insert_viajerosv_messages(
      objects: {
        message: $message
        subject: $subject
        message_type: $message_type
      }
    ) {
      affected_rows
      returning {
        id
        user_id
        subject
        message
        status
        message_type
        created_at
        messageTypeByMessageType {
          value
          description
        }
        message_status {
          value
        }
      }
    }
  }
`;

const GET_UNREAD_MESSAGES_COUNT_QUERY = `
  query GetUnreadMessagesCount(
    $where: viajerosv_messages_bool_exp!
  ) {
    viajerosv_messages_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class ContactCenterService {
  constructor(private http: HttpClient) {}

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

  getMessages(token: string, variables: GetMessagesVariables): Observable<ContactCenterListResult> {
    return this.executeOperation<GetMessagesData, GetMessagesVariables>(token, GET_MESSAGES_QUERY, variables).pipe(
      map((data) => ({
        rows: data.viajerosv_messages,
        total: data.viajerosv_messages_aggregate.aggregate.count,
      }))
    );
  }

  getUnreadMessagesCount(
    token: string,
    where: Record<string, unknown> = { status: { _eq: 'SENT' } }
  ): Observable<number> {
    return this.executeOperation<GetUnreadMessagesCountData, GetUnreadMessagesCountVariables>(
      token,
      GET_UNREAD_MESSAGES_COUNT_QUERY,
      { where }
    ).pipe(
      map((data) => data.viajerosv_messages_aggregate.aggregate.count ?? 0)
    );
  }

  getMessageTypes(token: string): Observable<ContactCenterMessageTypeRow[]> {
    return this.executeOperation<GetMessageTypesData, Record<string, never>>(token, GET_MESSAGE_TYPES_QUERY, {}).pipe(
      map((data) => data.viajerosv_message_types ?? [])
    );
  }

  insertMessage(token: string, variables: InsertMessageVariables): Observable<ContactCenterMessageRow | null> {
    return this.executeOperation<InsertMessagesData, InsertMessageVariables>(token, INSERT_MESSAGES_MUTATION, variables).pipe(
      map((data) => data.insert_viajerosv_messages.returning[0] ?? null)
    );
  }
}
