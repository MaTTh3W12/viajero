export interface TableColumn<T, V = T[keyof T]> {
  key: keyof T;
  label: string;
  type?: 'text' | 'badge' | 'box';
  boxStyle?: 'blue' | 'gray' | 'expiration';

  render?: (value: V, row: T) => string;
  subLabel?: (value: V, row: T) => string | null;
}
export interface TableAction<T> {
  icon?: string;
  iconId?: string;
  iconForRow?: (row: T) => string | null;
  iconIdForRow?: (row: T) => string | null;
  bgClass: string;
  bgClassForRow?: (row: T) => string;
  show?: (row: T) => boolean;
  action: (row: T) => void;
}

export interface DataTableConfig<T> {
  columns: TableColumn<T, any>[];
  actions?: TableAction<T>[];
}
