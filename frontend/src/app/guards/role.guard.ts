import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Factory: restituisce un guard che verifica il ruolo dell'utente.
 * Redirect a /login se non autenticato, alla home dell'altro ruolo se ruolo errato.
 */
export function roleGuard(expectedRole: 'fisioterapista' | 'paziente'): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    if (auth.getRole() === expectedRole) return true;

    // Redirect all'area corretta per il ruolo dell'utente
    const fallback = auth.getRole() === 'fisioterapista' ? '/dashboard' : '/tabs/tab1';
    return router.createUrlTree([fallback]);
  };
}
