import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Coupon } from './coupon.interface';
import { Message } from './message.interface';
import { Company } from './companies.interface';
import { User } from './user.interface';
import { Category } from './category.interface';

@Injectable({
  providedIn: 'root',
})
export class CouponsMockService {
  getCoupons(): Observable<Coupon[]> {
    return of<Coupon[]>([
      {
        id: 1,
        titulo: 'Descuento en tipo sedán',
        descripcion: 'Obtén un excelente descuento para tu carro sedán.',
        categoria: 'Turismo',
        fechaInicio: '12/12/2025',
        fechaFin: '22/01/2026',
        disponibles: 21,
        estado: 'Borrador',
      },
      {
        id: 2,
        titulo: 'Descuento en servicios',
        descripcion: 'Empresa 1',
        categoria: 'Turismo',
        fechaInicio: '12/12/2025',
        fechaFin: '22/01/2026',
        disponibles: 4,
        estado: 'Publicado',
      },
      {
        id: 3,
        titulo: 'Descuento en tipo sedán',
        descripcion: 'Obtén un excelente descuento para tu carro sedán.',
        categoria: 'Turismo',
        fechaInicio: '12/12/2025',
        fechaFin: '22/01/2026',
        disponibles: 21,
        estado: 'Borrador',
      },
      {
        id: 4,
        titulo: 'Descuento en servicios',
        descripcion: 'Empresa 1',
        categoria: 'Turismo',
        fechaInicio: '12/12/2025',
        fechaFin: '22/01/2026',
        disponibles: 4,
        estado: 'Publicado',
      },
      {
        id: 5,
        titulo: 'Descuento en tipo sedán',
        descripcion: 'Obtén un excelente descuento para tu carro sedán.',
        categoria: 'Turismo',
        fechaInicio: '12/12/2025',
        fechaFin: '22/01/2026',
        disponibles: 21,
        estado: 'Borrador',
      },
      {
        id: 6,
        titulo: 'Descuento en servicios',
        descripcion: 'Empresa 1',
        categoria: 'Turismo',
        fechaInicio: '12/12/2025',
        fechaFin: '22/01/2026',
        disponibles: 4,
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
        empresa: 'Consultores empresa S.A. de C. V.',
        documentoLegal: '8624-654321-789-0',
        coreo: 'consultores.empresa@sadecv.com.sv',
        estado: 'Pendiente',
      },
      {
        id: 2,
        empresa: 'Fábrica de ejemplos',
        documentoLegal: '7893-654321-789-0',
        coreo: 'fabrica.de.ejemplos@hotmail.com.sv',
        estado: 'Activa',
      },
      {
        id: 3,
        empresa: 'Sociedad de empresas',
        documentoLegal: '1234-654321-789-0',
        coreo: 'sociedad.de.empresas@sadecv.com.sv',
        estado: 'No activa',
      },
      {
        id: 4,
        empresa: 'Fábrica de ejemplos',
        documentoLegal: '7893-654321-789-0',
        coreo: 'fabrica.de.ejemplos@hotmail.com.sv',
        estado: 'Pendiente',
      },
      {
        id: 5,
        empresa: 'Fábrica de ejemplos',
        documentoLegal: '7893-654321-789-0',
        coreo: 'fabrica.de.ejemplos@hotmail.com.sv',
        estado: 'Activa',
      },
    ]);
  }

  getUsers(): Observable<User[]> {
    return of<User[]>([
      {
        id: 1,
        nombre: 'Consultores empresa S.A. de C. V.',
        tipoCuenta: 'Usuario',
        email: 'consultores.empresa@sadecv.com.sv',
        estado: 'No activa',
      },
      {
        id: 2,
        nombre: 'Fábrica de ejemplos',
        tipoCuenta: 'Empresa',
        email: 'fabrica.de.ejemplos@hotmail.com.sv',
        estado: 'Activa',
      },
      {
        id: 3,
        nombre: 'Sociedad de empresas',
        tipoCuenta: 'Usuario',
        email: 'sociedad.de.empresas@sadecv.com.sv',
        estado: 'No activa',
      },
      {
        id: 4,
        nombre: 'Fábrica de ejemplos',
        tipoCuenta: 'Empresa',
        email: 'fabrica.de.ejemplos@hotmail.com.sv',
        estado: 'Activa',
      },
    ]);
  }

  getCategories(): Observable<Category[]> {
    return of<Category[]>([
      {
        id: 1,
        categoria: 'Turismo',
        descripcion: 'Viajes, experiencias únicas y destinos inolvidables.',
        estado: 'No activa',
      },
      {
        id: 2,
        categoria: 'Gastronomía',
        descripcion: 'Sabores auténticos, restaurantes y experiencias culinarias.',
        estado: 'Activa'
      },
      {
        id: 3,
        categoria: 'Belleza',
        descripcion: 'Cuidado personal, estética y tratamientos especializados.',
        estado: 'No activa',
      },
      {
        id: 4,
        categoria: 'Educación',
        descripcion: 'Cursos, talleres y aprendizaje continuo accesible.',
        estado: 'Activa'
      },
      {
        id: 5,
        categoria: 'Mascotas',
        descripcion: 'Productos, servicios y bienestar para animales.',
        estado: 'No activa',
      },
      {
        id: 6,
        categoria: 'Servicios financieros',
        descripcion: 'Soluciones, asesorías y beneficios económicos confiables.',
        estado: 'Activa',
      },
      {
        id: 7,
        categoria: 'Salud',
        descripcion: 'Bienestar físico, prevención y atención médica.',
        estado: 'Activa',
      },
      {
        id: 8,
        categoria: 'Decoración',
        descripcion: 'Estilo, diseño y detalles para tu espacio.',
        estado: 'Activa',
      },
    ]);
  }
}
