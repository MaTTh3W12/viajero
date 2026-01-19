export interface Coupon {
  id: number;
  empresa: string;
  titulo: string;
  descuento: string;
  disponibles: number;
  adquiridos: number;
  expiracion: string;
  estado: 'Publicado' | 'No publicado' | 'Expirado' | 'Indefinido';
}
