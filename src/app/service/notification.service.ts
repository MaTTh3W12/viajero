import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { getHasuraGraphqlEndpoint } from './hasura-endpoint';

// ---------------------------------------------------------------------------
// Email template registry
// ---------------------------------------------------------------------------

export enum EmailTemplate {
  USER_CREATED = 'user-created',
  COMPANY_APPROVED = 'company-approved',
  COMPANY_REJECTED = 'account-disabled',
  CONTACT_MESSAGE = 'contact-message',
  TRANSFER_COUPON = 'transfer-coupon',
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface GraphQLError {
  message: string;
  extensions?: {
    code?: string;
    internal?: { error?: { message?: string } };
  };
}

interface GraphQLResponse<TData> {
  data?: TData;
  errors?: GraphQLError[];
}

export interface SendNotificationResult {
  code: string;
  message: string;
}

export interface UpsertNotificationResult {
  affected_rows: number;
}

export interface NotificationRow {
  id: number;
  code: string;
  subject: string;
  body_html: string;
}

interface SendNotificationData {
  send_notification: SendNotificationResult;
}

interface UpsertNotificationData {
  insert_viajerosv_notifications: UpsertNotificationResult;
}

interface GetNotificationsData {
  viajerosv_notifications: NotificationRow[];
}

export interface GetNotificationsVariables {
  limit: number;
  offset: number;
  where?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// GraphQL operations
// ---------------------------------------------------------------------------

const SEND_NOTIFICATION_MUTATION = `
  mutation SendNotification($email: String!, $subject: String!, $body_html: String!) {
    send_notification(email: $email, subject: $subject, body_html: $body_html) {
      code
      message
    }
  }
`;

const UPSERT_NOTIFICATION_MUTATION = `
  mutation UpsertNotification($code: String!, $subject: String!, $body_html: String!) {
    insert_viajerosv_notifications(
      objects: { code: $code, subject: $subject, body_html: $body_html },
      on_conflict: {
        constraint: notifications_code_key,
        update_columns: [subject, body_html]
      }
    ) {
      affected_rows
    }
  }
`;

const GET_NOTIFICATIONS_QUERY = `
  query GetNotifications($limit: Int!, $offset: Int!) {
    viajerosv_notifications(limit: $limit, offset: $offset, order_by: { created_at: desc }) {
      id
      code
      subject
      body_html
    }
  }
`;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private http: HttpClient) {}

  private get endpoint(): string {
    return getHasuraGraphqlEndpoint();
  }

  // -------------------------------------------------------------------------
  // Template utilities
  // -------------------------------------------------------------------------

  /**
   * Replaces every {{variable}} placeholder in the template string
   * with the matching value from the variables map.
   */
  renderTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '');
  }

  /**
   * Fetches an HTML email template from /assets/emails/.
   * Accepts either an EmailTemplate enum value or a plain file stem (no extension).
   */
  private loadTemplate(templateName: string): Observable<string> {
    const url = `/assets/emails/${templateName}.html`;
    return this.http.get(url, { responseType: 'text' }).pipe(
      catchError(() => throwError(() => new Error(`No se pudo cargar la plantilla: ${url}`))),
    );
  }

  // -------------------------------------------------------------------------
  // GraphQL executor
  // -------------------------------------------------------------------------

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
            throw new Error(response.errors.map((e) => e.message).join(' | '));
          }
          if (!response.data) {
            throw new Error('GraphQL response sin data');
          }
          return response.data;
        }),
      );
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Loads the template, replaces variables, then sends the resulting HTML
   * email via the send_notification Hasura action.
   */
  sendNotification(
    token: string,
    email: string,
    subject: string,
    templateName: EmailTemplate | string,
    variables: Record<string, string> = {},
  ): Observable<SendNotificationResult> {
    return this.loadTemplate(templateName).pipe(
      map((html) => this.renderTemplate(html, variables)),
      switchMap((body_html) =>
        this.executeOperation<SendNotificationData, { email: string; subject: string; body_html: string }>(
          token,
          SEND_NOTIFICATION_MUTATION,
          { email, subject, body_html },
        ),
      ),
      map((data) => data.send_notification),
    );
  }

  /**
   * Loads the template, replaces variables, then upserts the notification
   * record in the viajerosv_notifications table.
   */
  upsertNotification(
    token: string,
    code: string,
    subject: string,
    templateName: EmailTemplate | string,
    variables: Record<string, string> = {},
  ): Observable<UpsertNotificationResult> {
    return this.loadTemplate(templateName).pipe(
      map((html) => this.renderTemplate(html, variables)),
      switchMap((body_html) =>
        this.executeOperation<UpsertNotificationData, { code: string; subject: string; body_html: string }>(
          token,
          UPSERT_NOTIFICATION_MUTATION,
          { code, subject, body_html },
        ),
      ),
      map((data) => data.insert_viajerosv_notifications),
    );
  }

  /**
   * Retrieves a paginated list of stored notifications.
   */
  getNotifications(
    token: string,
    variables: GetNotificationsVariables,
  ): Observable<NotificationRow[]> {
    return this.executeOperation<GetNotificationsData, GetNotificationsVariables>(
      token,
      GET_NOTIFICATIONS_QUERY,
      variables,
    ).pipe(map((data) => data.viajerosv_notifications));
  }
}
