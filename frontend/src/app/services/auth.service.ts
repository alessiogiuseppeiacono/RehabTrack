import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

interface LoginResponse {
  token: string;
  role: string;
  userId: number;
}

interface JwtPayload {
  id: number;
  email: string;
  role: 'fisioterapista' | 'paziente';
  exp: number;
  iat: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly TOKEN_KEY = 'auth_token';

  /** POST /auth/login — salva il token in localStorage */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('/auth/login', { email, password })
      .pipe(tap((res) => localStorage.setItem(this.TOKEN_KEY, res.token)));
  }

  /** POST /auth/register */
  register(data: {
    email: string;
    password: string;
    role: string;
    first_name: string;
    last_name: string;
    pathology?: string;
  }): Observable<unknown> {
    return this.http.post('/auth/register', data);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /** Decodifica nativa del JWT payload con atob() */
  private decodeToken(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  getRole(): string | null {
    return this.decodeToken()?.role ?? null;
  }

  getUserId(): number | null {
    return this.decodeToken()?.id ?? null;
  }

  isAuthenticated(): boolean {
    const payload = this.decodeToken();
    if (!payload) return false;
    // ponytail: exp check è sufficiente lato client, il backend ri-verifica comunque
    return payload.exp > Date.now() / 1000;
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.router.navigateByUrl('/login');
  }
}
