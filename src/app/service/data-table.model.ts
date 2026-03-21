export interface TableColumn<T, V = T[keyof T]> {
  key: keyof T;
  label: string;
  type?: 'text' | 'badge' | 'box' | 'title-with-subtitle';
  boxStyle?: 'blue' | 'gray' | 'expiration';
  showImage?: boolean;
  imageForRow?: (row: T) => string | null;
  imageLoadingForRow?: (row: T) => boolean;

  render?: (value: V, row: T) => string;
  subLabel?: (value: V, row: T) => string | null;
  tooltip?: (value: V, row: T) => string | null;
}
export interface TableAction<T> {
  icon?: string;
  iconId?: string;
  iconForRow?: (row: T) => string | null;
  iconIdForRow?: (row: T) => string | null;
  bgClass: string;
  bgClassForRow?: (row: T) => string;
  disabled?: (row: T) => boolean;
  show?: (row: T) => boolean;
  action: (row: T) => void;
}

export interface DataTableConfig<T> {
  columns: TableColumn<T, any>[];
  actions?: TableAction<T>[];
}
