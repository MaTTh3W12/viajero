import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContactCenterService } from './contact-center.service';

const TEST_HASURA_ENDPOINT = 'https://test-hasura.example/v1/graphql';

describe('ContactCenterService', () => {
  let service: ContactCenterService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    window.__ENV__ = { HASURA_GRAPHQL_ENDPOINT: TEST_HASURA_ENDPOINT };

    TestBed.configureTestingModule({
      providers: [ContactCenterService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ContactCenterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch messages including sender and responses mapping', () => {
    let result: unknown;

    service
      .getMessages('jwt-token', {
        limit: 10,
        offset: 0,
        where: {},
      })
      .subscribe((response) => {
        result = response;
      });

    const req = httpMock.expectOne(TEST_HASURA_ENDPOINT);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    expect(req.request.body.query).toContain('user_public');
    expect(req.request.body.query).toContain('message_responses');

    req.flush({
      data: {
        viajerosv_messages: [
          {
            id: 1,
            user_id: '3',
            subject: 'Consulta cupón',
            message: '¿Incluye desayuno?',
            message_type: 'SUPPORT',
            status: 'SENT',
            created_at: '2026-03-21T10:00:00.000Z',
            messageTypeByMessageType: { value: 'SUPPORT', description: 'Soporte' },
            message_status: { value: 'SENT' },
            user_public: {
              id: '3',
              first_name: 'Pedro',
              last_name: 'Pérez',
              email: 'pedro@correo.com',
            },
            message_responses: [],
          },
        ],
        viajerosv_messages_aggregate: {
          aggregate: {
            count: 1,
          },
        },
      },
    });

    expect(result).toEqual({
      rows: [
        {
          id: 1,
          user_id: '3',
          subject: 'Consulta cupón',
          message: '¿Incluye desayuno?',
          message_type: 'SUPPORT',
          status: 'SENT',
          created_at: '2026-03-21T10:00:00.000Z',
          messageTypeByMessageType: { value: 'SUPPORT', description: 'Soporte' },
          message_status: { value: 'SENT' },
          user_public: {
            id: '3',
            first_name: 'Pedro',
            last_name: 'Pérez',
            email: 'pedro@correo.com',
          },
          message_responses: [],
        },
      ],
      total: 1,
    });
  });

  it('should call mark message as received by admin mutation', () => {
    let result: unknown;

    service.markMessageAsReceivedByAdmin('jwt-token', 7).subscribe((response) => {
      result = response;
    });

    const req = httpMock.expectOne(TEST_HASURA_ENDPOINT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.query).toContain('viajerosv_mark_message_as_read_by_admin');
    expect(req.request.body.variables).toEqual({ messageId: 7 });

    req.flush({
      data: {
        viajerosv_mark_message_as_read_by_admin: {
          id: 7,
          subject: 'Error',
          status: 'RECEIVED_BY_ADMIN',
        },
      },
    });

    expect(result).toEqual({
      id: 7,
      subject: 'Error',
      status: 'RECEIVED_BY_ADMIN',
    });
  });

  it('should insert message response for admin', () => {
    let result: unknown;

    service
      .insertMessageResponse('jwt-token', {
        messageId: 11,
        responseText: 'Ya fue corregido.',
      })
      .subscribe((response) => {
        result = response;
      });

    const req = httpMock.expectOne(TEST_HASURA_ENDPOINT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.query).toContain('insert_viajerosv_message_responses_one');
    expect(req.request.body.variables).toEqual({
      messageId: 11,
      responseText: 'Ya fue corregido.',
    });

    req.flush({
      data: {
        insert_viajerosv_message_responses_one: {
          id: 22,
          response: 'Ya fue corregido.',
          created_at: '2026-03-21T12:00:00.000Z',
          user_public: {
            first_name: 'Admin',
            last_name: 'Uno',
            email: 'admin@correo.com',
          },
          message: {
            id: 11,
            status: 'ANSWERED',
          },
        },
      },
    });

    expect(result).toEqual({
      id: 22,
      response: 'Ya fue corregido.',
      created_at: '2026-03-21T12:00:00.000Z',
      user_public: {
        first_name: 'Admin',
        last_name: 'Uno',
        email: 'admin@correo.com',
      },
      message: {
        id: 11,
        status: 'ANSWERED',
      },
    });
  });
});
