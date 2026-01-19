export interface TableColumn<T> {
  key: keyof T;
  label: string;
  type?: 'text' | 'badge' | 'box';
  boxStyle?: 'blue' | 'gray' | 'expiration';
}
export interface TableAction<T> {
  icon: string;
  bgClass: string;
  action: (row: T) => void;
}

export interface DataTableConfig<T> {
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
}
