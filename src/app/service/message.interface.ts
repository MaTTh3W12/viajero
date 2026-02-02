export interface MessageStatus {
  type: 'Nuevo' | 'Revisado';
  reviewedBy?: string;
}

export interface Message {
  id: number;
  nombre: string;
  correo: string;
  mensaje: string;
  fecha: string;
  estado: MessageStatus;
}
