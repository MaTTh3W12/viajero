import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Coupon } from './coupon.interface';
import { Message } from './message.interface';
import { Company } from './companies.interface';

@Injectable({
  providedIn: 'root',
})
export class CouponsMockService {
  getCoupons(): Observable<Coupon[]> {
    return of<Coupon[]>([
      {
        id: 1,
        empresa: 'Empresa 1',
        titulo: 'Descuento en servicios',
        descuento: '10%',
        disponibles: 150,
        adquiridos: 1,
        expiracion: '01-08-2026',
        estado: 'Publicado',
      },
      {
        id: 2,
        empresa: 'Empresa 2',
        titulo: 'Descuento especial en tratamiento para pacientes',
        descuento: '$25.00',
        disponibles: 150,
        adquiridos: 1,
        expiracion: 'Expirado',
        estado: 'No publicado',
      },
      {
        id: 3,
        empresa: 'Empresa 3',
        titulo: 'Descuento en servicios',
        descuento: '10%',
        disponibles: 150,
        adquiridos: 1,
        expiracion: 'Indefinido',
        estado: 'Publicado',
      },
      {
        id: 4,
        empresa: 'Empresa 4',
        titulo: 'Descuento en servicios',
        descuento: '15%',
        disponibles: 150,
        adquiridos: 1,
        expiracion: '01-08-2026',
        estado: 'Publicado',
      },
      {
        id: 5,
        empresa: 'Empresa 5',
        titulo: 'Descuento en servicios',
        descuento: '30%',
        disponibles: 150,
        adquiridos: 1,
        expiracion: '01-08-2026',
        estado: 'Publicado',
      },
    ]);
  }

  getMessages(): Observable<Message[]> {
    return of<Message[]>([
      {
        id: 1,
        nombre: 'Nombre Apellido',
        correo: 'ejemplo@correo.com',
        mensaje: 'Mensaje',
        fecha: '23-12-2025',
        estado: {
          type: 'Nuevo'
        }
      },
      {
        id: 2,
        nombre: 'Nombre Apellido',
        correo: 'ejemplo@correo.com',
        mensaje: 'Mensaje',
        fecha: '23-12-2025',
        estado: {
          type: 'Revisado',
          reviewedBy: 'Herberth Funes',
        }
      },
      {
        id: 3,
        nombre: 'Nombre Apellido',
        correo: 'ejemplo@correo.com',
        mensaje: 'Mensaje',
        fecha: '23-12-2025',
        estado: { type: 'Nuevo' },
      },
      {
        id: 4,
        nombre: 'Nombre Apellido',
        correo: 'ejemplo@correo.com',
        mensaje: 'Mensaje',
        fecha: '23-12-2025',
        estado: { type: 'Nuevo' },
      },
    ]);
  }

  getCompanies(): Observable<Company[]> {
    return of<Company[]>([
      {
        id: 1,
        empresa: 'Empresa 1',
        categoria: 'Alojamiento',
        telefono: '0000-0000',
        coreo: 'ejemplo@correo.com',
        direccion: 'Dirección completa',
      },
      {
        id: 1,
        empresa: 'Empresa 2',
        categoria: 'Transporte',
        telefono: '0000-0000',
        coreo: 'ejemplo@correo.com',
        direccion: 'Dirección completa',
      },
      {
        id: 1,
        empresa: 'Empresa 3',
        categoria: 'Alimentos y Bebidas',
        telefono: '0000-0000',
        coreo: 'ejemplo@correo.com',
        direccion: 'Dirección completa',
      },
      {
        id: 1,
        empresa: 'Empresa 4',
        categoria: 'Productos',
        telefono: '0000-0000',
        coreo: 'ejemplo@correo.com',
        direccion: 'Dirección completa',
      },
      {
        id: 1,
        empresa: 'Empresa 5',
        categoria: 'Productos y Servicios',
        telefono: '0000-0000',
        coreo: 'ejemplo@correo.com',
        direccion: 'Dirección completa',
      },
    ]);
  }
}
