export interface CurrentUser {
  username: string;
  role: 'admin' | 'empresa';
  companyName?: string;
  avatarUrl?: string;
}
