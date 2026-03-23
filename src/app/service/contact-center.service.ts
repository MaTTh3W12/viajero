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

interface GetMessageTypesData {
  viajerosv_message_types: ContactCenterMessageTypeRow[];
}

interface InsertMessagesData {
  insert_viajerosv_messages: {
    affected_rows: number;
    returning: ContactCenterMessageRow[];
  };
}

interface MarkMessageAsReceivedByAdminData {
  viajerosv_mark_message_as_read_by_admin: {
    id: number;
    subject: string | null;
    status: string | null;
  } | null;
}

interface InsertMessageResponseData {
  insert_viajerosv_message_responses_one: ContactCenterMessageResponseRow | null;
}

export interface ContactCenterMessageResponseRow {
  id: number;
  response: string | null;
  created_at: string;
  user_public?: ContactCenterUserPublicRow | null;
  message?: {
    id: number;
    status: string | null;
  } | null;
}

export interface ContactCenterUserPublicRow {
  id?: string | number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  company_commercial_name?: string | null;
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
  user_public?: ContactCenterUserPublicRow | null;
  message_responses?: ContactCenterMessageResponseRow[] | null;
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

export interface InsertMessageResponseVariables {
  messageId: number;
  responseText: string;
}

const DEFAULT_HASURA_ENDPOINT = 'https://api.grupoavanza.work/v1/graphql';

const GET_MESSAGES_QUERY = `
  query GetMessagesDynamic(
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
      user_public {
        id
        first_name
        last_name
        email
        company_commercial_name
      }
      message_responses(order_by: { created_at: asc }) {
        id
        response
        created_at
        user_public {
          first_name
          last_name
          email
          company_commercial_name
        }
        message {
          id
          status
        }
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
  query GetUnreadMessagesCount {
    viajerosv_messages_aggregate(
      where: { status: { _eq: "SENT" } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const MARK_MESSAGE_AS_RECEIVED_BY_ADMIN_MUTATION = `
  mutation MarkMessageAsReceivedByAdmin($messageId: bigint!) {
    viajerosv_mark_message_as_read_by_admin(
      args: { p_message_id: $messageId }
    ) {
      id
      subject
      status
    }
  }
`;

const INSERT_MESSAGE_RESPONSE_MUTATION = `
  mutation InsertMessageResponse($messageId: bigint!, $responseText: String!) {
    insert_viajerosv_message_responses_one(
      object: {
        message_id: $messageId,
        response: $responseText
      }
    ) {
      id
      response
      created_at
      user_public {
        first_name
        last_name
        email
        company_commercial_name
      }
      message {
        id
        status
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
    variables: TVariables,
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
        }),
      );
  }

  getMessages(token: string, variables: GetMessagesVariables): Observable<ContactCenterListResult> {
    return this.executeOperation<GetMessagesData, GetMessagesVariables>(
      token,
      GET_MESSAGES_QUERY,
      variables,
    ).pipe(
      map((data) => ({
        rows: data.viajerosv_messages,
        total: data.viajerosv_messages_aggregate.aggregate.count,
      })),
    );
  }

  getUnreadMessagesCount(
    token: string,
    where: Record<string, unknown> = { status: { _eq: 'SENT' } },
  ): Observable<number> {
    const statusFilter = where?.['status'] as Record<string, unknown> | undefined;
    const isDefaultUnreadFilter = String(statusFilter?.['_eq'] ?? '').trim().toUpperCase() === 'SENT';

    if (isDefaultUnreadFilter) {
      return this.executeOperation<GetUnreadMessagesCountData, Record<string, never>>(
        token,
        GET_UNREAD_MESSAGES_COUNT_QUERY,
        {},
      ).pipe(map((data) => data.viajerosv_messages_aggregate.aggregate.count ?? 0));
    }

    return this.getMessages(token, {
      limit: 1,
      offset: 0,
      where,
    }).pipe(map((data) => data.total ?? 0));
  }

  getMessageTypes(token: string): Observable<ContactCenterMessageTypeRow[]> {
    return this.executeOperation<GetMessageTypesData, Record<string, never>>(
      token,
      GET_MESSAGE_TYPES_QUERY,
      {},
    ).pipe(map((data) => data.viajerosv_message_types ?? []));
  }

  insertMessage(
    token: string,
    variables: InsertMessageVariables,
  ): Observable<ContactCenterMessageRow | null> {
    return this.executeOperation<InsertMessagesData, InsertMessageVariables>(
      token,
      INSERT_MESSAGES_MUTATION,
      variables,
    ).pipe(map((data) => data.insert_viajerosv_messages.returning[0] ?? null));
  }

  markMessageAsReceivedByAdmin(
    token: string,
    messageId: number,
  ): Observable<{ id: number; subject: string | null; status: string | null } | null> {
    return this.executeOperation<MarkMessageAsReceivedByAdminData, { messageId: number }>(
      token,
      MARK_MESSAGE_AS_RECEIVED_BY_ADMIN_MUTATION,
      { messageId },
    ).pipe(map((data) => data.viajerosv_mark_message_as_read_by_admin ?? null));
  }

  insertMessageResponse(
    token: string,
    variables: InsertMessageResponseVariables,
  ): Observable<ContactCenterMessageResponseRow | null> {
    return this.executeOperation<InsertMessageResponseData, InsertMessageResponseVariables>(
      token,
      INSERT_MESSAGE_RESPONSE_MUTATION,
      variables,
    ).pipe(map((data) => data.insert_viajerosv_message_responses_one ?? null));
  }
}
