export interface CurrentUser {
  username: string;
  role: 'admin' | 'empresa' | 'usuario';
  companyName?: string;
  avatarUrl?: string;
}
