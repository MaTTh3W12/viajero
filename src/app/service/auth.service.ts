import { Injectable } from '@angular/core';

export type UserRole = 'admin' | 'empresa' | 'usuario';

export interface AuthUser {
  username: string;
  role: UserRole;
  companyName?: string;
}

const STORAGE_KEY = 'viajero_current_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // 🔧 usuarios mock
  private users: (AuthUser & { password: string })[] = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'empresa', password: 'empresa123',role: 'empresa'},
    { username: 'usuario1', password: 'usuario123', role: 'usuario'}
  ];

  private currentUser: AuthUser | null = this.loadFromStorage();

  /* ======================
     GETTERS
  ====================== */

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  getRole(): UserRole | null {
    return this.currentUser?.role ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  isEmpresa(): boolean {
    return this.currentUser?.role === 'empresa';
  }

  isUsuario(): boolean {
    return this.currentUser?.role === 'usuario';
  }

  /* ======================
     AUTH ACTIONS
  ====================== */

  login(username: string, password: string): AuthUser | null {
    const found = this.users.find(
      u => u.username === username && u.password === password
    );

    if (!found) return null;

    // ❌ no guardamos password
    const { password: _, ...safeUser } = found;

    this.currentUser = safeUser;
    this.saveToStorage(safeUser);

    return safeUser;
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ======================
     STORAGE
  ====================== */

  private saveToStorage(user: AuthUser): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  private loadFromStorage(): AuthUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
