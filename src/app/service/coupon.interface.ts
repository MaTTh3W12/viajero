export interface Coupon {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  fechaInicio: string;
  fechaFin: string;
  disponibles: number;
  estado: string;
  categoriaId?: number;
  terminos?: string;
  rawDescripcion?: string;
  imagePreview?: string | null;
  imageMimeType?: string;
}
