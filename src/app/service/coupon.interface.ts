export interface Coupon {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  fechaInicio: string;
  fechaFin: string;
  disponibles: number;
  disponiblesTotal?: number;
  oferta?: string;
  vigencia?: string;
  estado: string;
  categoriaId?: number;
  terminos?: string;
  rawDescripcion?: string;
  precio?: number | null;
  descuento?: number | null;
  imagePreview?: string | null;
  imageMimeType?: string;
  onView?: (coupon: Coupon) => void;
  onStats?: (coupon: Coupon) => void;
}
