import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../service/auth.service';
import { ContactCenterService } from '../../../service/contact-center.service';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { ContactCenterComponent } from './contact-center.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: '',
})
class TopbarStubComponent {
  @Input() location = '';
}

describe('ContactCenterComponent', () => {
  let fixture: ComponentFixture<ContactCenterComponent>;
  let component: ContactCenterComponent;

  const contactCenterServiceMock = {
    getMessages: jasmine.createSpy('getMessages'),
    getUnreadMessagesCount: jasmine.createSpy('getUnreadMessagesCount'),
    getMessageTypes: jasmine.createSpy('getMessageTypes'),
    insertMessage: jasmine.createSpy('insertMessage'),
    markMessageAsReceivedByAdmin: jasmine.createSpy('markMessageAsReceivedByAdmin'),
    insertMessageResponse: jasmine.createSpy('insertMessageResponse'),
  };

  const authServiceMock = {
    token: 'fake-token',
    getRole: jasmine.createSpy('getRole'),
    isAdmin: jasmine.createSpy('isAdmin'),
    isEmpresa: jasmine.createSpy('isEmpresa'),
  };

  const defaultMessagesResult = { rows: [], total: 0 };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactCenterComponent],
      providers: [
        { provide: ContactCenterService, useValue: contactCenterServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    })
      .overrideComponent(ContactCenterComponent, {
        remove: {
          imports: [TopbarComponent],
        },
        add: {
          imports: [TopbarStubComponent],
        },
      })
      .compileComponents();
  });

  beforeEach(() => {
    contactCenterServiceMock.getMessages.calls.reset();
    contactCenterServiceMock.getUnreadMessagesCount.calls.reset();
    contactCenterServiceMock.getMessageTypes.calls.reset();
    contactCenterServiceMock.insertMessage.calls.reset();
    contactCenterServiceMock.markMessageAsReceivedByAdmin.calls.reset();
    contactCenterServiceMock.insertMessageResponse.calls.reset();

    contactCenterServiceMock.getMessages.and.returnValue(of(defaultMessagesResult));
    contactCenterServiceMock.getUnreadMessagesCount.and.returnValue(of(0));
    contactCenterServiceMock.getMessageTypes.and.returnValue(of([]));
    contactCenterServiceMock.insertMessage.and.returnValue(of(null));
    contactCenterServiceMock.markMessageAsReceivedByAdmin.and.returnValue(of(null));
    contactCenterServiceMock.insertMessageResponse.and.returnValue(of(null));

    authServiceMock.token = 'fake-token';
    authServiceMock.getRole.calls.reset();
    authServiceMock.isAdmin.calls.reset();
    authServiceMock.isEmpresa.calls.reset();
  });

  function createComponentForRole(role: 'admin' | 'empresa'): void {
    authServiceMock.getRole.and.returnValue(role);
    authServiceMock.isAdmin.and.returnValue(role === 'admin');
    authServiceMock.isEmpresa.and.returnValue(role === 'empresa');

    fixture = TestBed.createComponent(ContactCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create in admin mode and load messages without loading message types', () => {
    createComponentForRole('admin');

    expect(component).toBeTruthy();
    expect(component.isAdminPortal()).toBeTrue();
    expect(contactCenterServiceMock.getMessages).toHaveBeenCalled();
    expect(contactCenterServiceMock.getMessageTypes).not.toHaveBeenCalled();
  });

  it('should load message types in empresa mode', () => {
    createComponentForRole('empresa');

    expect(component.isAdminPortal()).toBeFalse();
    expect(contactCenterServiceMock.getMessageTypes).toHaveBeenCalled();
  });

  it('should apply admin pending status filter when changing tab', () => {
    createComponentForRole('admin');

    component.changeAdminTab('pending');

    const lastCallArgs = contactCenterServiceMock.getMessages.calls.mostRecent().args;
    expect(lastCallArgs[1].where).toEqual({
      _and: [
        {
          _or: [
            {
              status: {
                _in: ['SENT', 'RECEIVED_BY_ADMIN'],
              },
            },
            {
              message_status: {
                value: {
                  _in: ['SENT', 'RECEIVED_BY_ADMIN'],
                },
              },
            },
          ],
        },
        {
          _not: {
            message_responses: {},
          },
        },
      ],
    });
  });

  it('should apply company received filter using status and message_status', () => {
    createComponentForRole('empresa');

    component.changeCompanyTab('received');

    const lastCallArgs = contactCenterServiceMock.getMessages.calls.mostRecent().args;
    expect(lastCallArgs[1].where).toEqual({
      _or: [
        {
          status: {
            _eq: 'RECEIVED_BY_ADMIN',
          },
        },
        {
          message_status: {
            value: {
              _eq: 'RECEIVED_BY_ADMIN',
            },
          },
        },
      ],
    });
  });

  it('should apply company answered filter using status, message_status and responses', () => {
    createComponentForRole('empresa');

    component.changeCompanyTab('answered');

    const lastCallArgs = contactCenterServiceMock.getMessages.calls.mostRecent().args;
    expect(lastCallArgs[1].where).toEqual({
      _or: [
        {
          status: {
            _eq: 'ANSWERED',
          },
        },
        {
          message_status: {
            value: {
              _eq: 'ANSWERED',
            },
          },
        },
        {
          message_responses: {},
        },
      ],
    });
  });

  it('should include sender search filter in admin mode', () => {
    createComponentForRole('admin');

    component.adminSearchInput.set('pedro@correo.com');
    component.applyAdminSearch();

    const lastCallArgs = contactCenterServiceMock.getMessages.calls.mostRecent().args;
    expect(lastCallArgs[1].where).toEqual({
      user: {
        _or: [
          { first_name: { _ilike: '%pedro@correo.com%' } },
          { last_name: { _ilike: '%pedro@correo.com%' } },
          { email: { _ilike: '%pedro@correo.com%' } },
        ],
      },
    });
  });

  it('should mark message as received when opening reply modal for sent message', () => {
    createComponentForRole('admin');

    component.openReplyModal({
      id: 9,
      title: 'Prueba',
      type: 'Consulta',
      date: '2026-03-21',
      description: 'Mensaje de prueba',
      status: 'sent',
      senderName: 'Pedro Perez',
      senderEmail: 'pedro@correo.com',
    });

    expect(contactCenterServiceMock.markMessageAsReceivedByAdmin).toHaveBeenCalledWith(
      'fake-token',
      9,
    );
    expect(component.adminModalView()).toBe('reply');
  });

  it('should send reply and show success state', () => {
    createComponentForRole('admin');

    component.openReplyModal({
      id: 2,
      title: 'Error en escaneo',
      type: 'Consulta',
      date: '2026-03-21',
      description: 'No funciona',
      status: 'received',
      senderName: 'Empresa X',
      senderEmail: 'empresa@correo.com',
    });

    component.adminReplyText.set('Respuesta enviada');
    component.submitAdminReply();

    expect(contactCenterServiceMock.insertMessageResponse).toHaveBeenCalledWith('fake-token', {
      messageId: 2,
      responseText: 'Respuesta enviada',
    });
    expect(component.adminModalView()).toBe('success');
  });
});
