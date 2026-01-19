import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Coupon } from './coupon.interface';

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
}
