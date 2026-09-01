import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const BASE_URL = 'http://localhost:3000/api';

export const httpIntInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('auth_token');

  // Prepend baseUrl per richieste relative (iniziano con /)
  let url = req.url;
  if (url.startsWith('/')) {
    url = BASE_URL + url;
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
