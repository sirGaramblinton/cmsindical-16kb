import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token?: string;

  setSession(token: string, user?: any): void {
    this._token = token;
    // minimal stub: real implementation should store session and user info
  }

  isAuthenticated(): boolean {
    return !!this._token;
  }

  navigateTo(path: string): void {
    // minimal stub: router navigation would be implemented here
    console.log('navigateTo', path);
  }
}

export const Auth = new AuthService();
