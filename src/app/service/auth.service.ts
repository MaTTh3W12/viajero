import { Injectable } from '@angular/core';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  username: string;
  password: string;
  role: UserRole;
}

const STORAGE_KEY = 'viajero_current_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Usuarios de ejemplo para probar los flujos
  private users: AuthUser[] = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'carlos', password: 'carlos123', role: 'user' },
    { username: 'maria', password: 'maria123', role: 'user' }
  ];

  private currentUser: AuthUser | null = this.loadFromStorage();

  getAllUsers(): AuthUser[] {
    return this.users;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  logout(): void {
    this.currentUser = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignoramos errores de storage (modo SSR, etc.)
    }
  }

  login(username: string, password: string): AuthUser | null {
    const found = this.users.find(
      (u) => u.username === username && u.password === password
    );

    if (!found) {
      return null;
    }

    this.currentUser = found;
    this.saveToStorage(found);
    return found;
  }

  register(username: string, password: string, role: UserRole): AuthUser {
    const newUser: AuthUser = { username, password, role };
    this.users.push(newUser);
    this.currentUser = newUser;
    this.saveToStorage(newUser);
    return newUser;
  }

  private saveToStorage(user: AuthUser): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // ignoramos errores de storage
    }
  }

  private loadFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
