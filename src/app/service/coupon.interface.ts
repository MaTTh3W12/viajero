export interface Coupon {
  id: number;
  titulo: string;
  descripcion: string;
  empresaNombre?: string;
  empresaNit?: string;
  categoria: string;
  fechaInicio: string;
  fechaFin: string;
  disponibles: number;
  disponiblesTotal?: number;
  oferta?: string;
  vigencia?: string;
  estado: string;
  categoriaId?: number;
  autoPublicado?: boolean;
  terminos?: string;
  rawDescripcion?: string;
  precio?: number | null;
  descuento?: number | null;
  imagePreview?: string | null;
  imageMimeType?: string;
  onView?: (coupon: Coupon) => void;
  onStats?: (coupon: Coupon) => void;
}
