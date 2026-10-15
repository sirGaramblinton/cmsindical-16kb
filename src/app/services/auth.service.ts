import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
    /**
     * Navega a una ruta específica usando el router de Angular.
     */
    navigateTo(route: string | string[]) {
        console.debug('AuthService.navigateTo ->', route);
        this.router.navigate(Array.isArray(route) ? route : [route]);
    }
    private token: string | null = null;
    private user: any = null;

    constructor(private router: Router) {}

    setSession(token: string, user?: any) {
        console.debug('AuthService.setSession -> token present?', !!token, 'user:', user);
        this.token = token;
        this.user = user || null;
        localStorage.setItem('auth_token', token);
        if (user) {
            localStorage.setItem('auth_user', JSON.stringify(user));
        }
    }


    getToken(): string | null {
        return this.token || localStorage.getItem('auth_token');
    }

    getUser(): any {
        if (this.user) return this.user;
        const userStr = localStorage.getItem('auth_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    clearSession() {
        console.debug('AuthService.clearSession -> clearing local session and navigating to /login');
        this.token = null;
        this.user = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        this.router.navigate(['/login']);
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }
}
