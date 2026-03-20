export interface Company {
  id: number;
  userId?: number | string | null;
  empresa: string;
  documentoLegal: string;
  coreo: string;
  categoria: string;
  estado: string;
  telefono?: string | null;
  city?: string | null;
  country?: string | null;
  active?: boolean | null;
  companyProfileCompleted?: boolean | null;
  companyCategoryId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  statusRaw?: string | null;
}
