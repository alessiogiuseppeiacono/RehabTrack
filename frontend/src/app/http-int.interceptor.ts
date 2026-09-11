import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../environments/environment';

const BASE_API_URL = environment.apiUrl;
const API_ORIGIN = BASE_API_URL.replace(/\/api$/, '');

export const httpIntInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('auth_token');

  // Risolve sempre l'URL verso il backend sulla porta 3000
  let url = req.url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (url.startsWith('/api/')) {
      url = `${API_ORIGIN}${url}`;
    } else if (url.startsWith('/')) {
      url = `${BASE_API_URL}${url}`;
    } else if (url.startsWith('api/')) {
      url = `${API_ORIGIN}/${url}`;
    } else {
      url = `${BASE_API_URL}/${url}`;
    }
  }

  // TASK: Previene "TypeError: Failed to construct 'URL': Invalid base URL" su dispositivi mobili
  try {
    // Prova a parsarlo come URL assoluto. Se fallisce, usa il fallback
    new URL(url);
  } catch (err) {
    url = 'http://localhost:3000' + (url.startsWith('/') ? url : '/' + url);
  }

  const cloned = req.clone({
    url,
    ...(token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
  });

  return next(cloned).pipe(
    catchError((err) => {
      if (err.status === 401) {
        localStorage.removeItem('auth_token');
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};
