export interface Coupon {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  fechaInicio: string;
  fechaFin: string;
  disponibles: number;
  estado: string;
  terminos: string[];
}
