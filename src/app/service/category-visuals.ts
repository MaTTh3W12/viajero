export interface CategoryVisual {
  icon: string;
  bgColor: string;
  activeIcon?: boolean;
  invertIcon?: boolean;
}

export const DEFAULT_CATEGORY_VISUAL: CategoryVisual = {
  icon: 'assets/icons/coupon1.svg',
  bgColor: '#E5E7EB',
};

export const ALL_CATEGORY_VISUAL: CategoryVisual = {
  icon: 'assets/icons/coupon1.svg',
  bgColor: '#1438A0',
  activeIcon: true,
  invertIcon: true,
};

const CATEGORY_VISUAL_BY_SLUG: Record<string, CategoryVisual> = {
  alojamiento: { icon: 'assets/icons/double-bed.svg', bgColor: '#FFF8D2' },
  'alimentos-y-bebidas': { icon: 'assets/icons/dinner.svg', bgColor: '#ABE9FF' },
  turismo: { icon: 'assets/icons/sunbed.svg', bgColor: '#D8D7FF' },
  entretenimiento: { icon: 'assets/icons/gift-bag1.svg', bgColor: '#FFD5D6' },
  'cuidado-personal': { icon: 'assets/icons/lotus1.svg', bgColor: '#D3F6D2' },
  'productos-nostalgicos': { icon: 'assets/icons/product-quality1.svg', bgColor: '#FFD5D6' },
  'productos-y-servicios': { icon: 'assets/icons/gift-bag1.svg', bgColor: '#FFC6B3' },
  'tour-operadores': { icon: 'assets/icons/traveler1.svg', bgColor: '#CAFFFB' },
  transporte: { icon: 'assets/icons/bus1.svg', bgColor: '#CAFFDC' },
  clinicas: { icon: 'assets/icons/hospital1.svg', bgColor: '#FFD9E2' },
  clinica: { icon: 'assets/icons/hospital1.svg', bgColor: '#FFD9E2' },
  automotriz: { icon: 'assets/icons/coupon1.svg', bgColor: '#E8EEFF' },
  autromotriz: { icon: 'assets/icons/coupon1.svg', bgColor: '#E8EEFF' },
  'productos-de-belleza': { icon: 'assets/icons/coupon1.svg', bgColor: '#E8EEFF' },
  'producto-de-belleza': { icon: 'assets/icons/coupon1.svg', bgColor: '#E8EEFF' },
};

export function toCategorySlug(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeCategoryIcon(icon: string | null | undefined): string | null {
  const raw = String(icon ?? '').trim();
  if (!raw) return null;

  const ensureExtension = (path: string): string =>
    /\.[a-z0-9]+$/i.test(path) ? path : `${path}.svg`;

  if (/^(https?:\/\/|data:|\/|assets\/)/i.test(raw)) {
    return /^assets\//i.test(raw) ? ensureExtension(raw) : raw;
  }

  if (/^icons\//i.test(raw)) {
    return ensureExtension(`assets/${raw.replace(/^\/+/, '')}`);
  }

  return ensureExtension(`assets/icons/${raw.replace(/^\/+/, '')}`);
}

export function resolveCategoryVisual(
  categoryName: string | null | undefined,
  endpointIcon?: string | null,
  fallbackVisual: CategoryVisual = DEFAULT_CATEGORY_VISUAL
): CategoryVisual {
  const slug = toCategorySlug(categoryName);
  const bySlug = CATEGORY_VISUAL_BY_SLUG[slug];
  const visual = bySlug ?? fallbackVisual;

  return {
    ...visual,
    icon: normalizeCategoryIcon(endpointIcon) ?? visual.icon,
  };
}
