import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppState } from './models';

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
    const body = error.error;
    if (body?.errors) return Object.values(body.errors).flat().join(' ');
    return body?.error || body?.message || 'No se pudo completar la operación.';
  }
  return error instanceof Error ? error.message : 'Ocurrió un error. Intenta de nuevo.';
}

@Injectable({ providedIn: 'root' })
export class Store {
  private http = inject(HttpClient);
  readonly state = signal<AppState | null>(null);
  readonly loading = signal(true);
  readonly notice = signal('');
  readonly connectionError = signal('');
  private initialized = false;
  private toastTimer?: ReturnType<typeof setTimeout>;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    try { await this.reload(); }
    catch (error) { if (!(error instanceof HttpErrorResponse && error.status === 401)) this.connectionError.set(errorMessage(error)); }
    finally { this.loading.set(false); }
  }
  async reload(): Promise<void> {
    const state = await this.get<AppState>('/api/state');
    this.state.set(state);
    this.connectionError.set('');
  }
  async login(email: string, password: string): Promise<void> {
    await firstValueFrom(this.http.get('/sanctum/csrf-cookie', { withCredentials: true, responseType: 'text' }));
    await this.post('/api/login', { email, password });
    await this.reload();
  }
  async logout(): Promise<void> {
    await this.post('/api/logout', {});
    this.state.set(null);
  }
  private async guard<T>(request: Promise<T>): Promise<T> {
    try { return await request; }
    catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401 && this.state()) {
        this.state.set(null);
        this.connectionError.set('Tu sesión terminó. Vuelve a entrar para continuar.');
      }
      throw error;
    }
  }
  get<T>(path: string): Promise<T> { return this.guard(firstValueFrom(this.http.get<T>(path, { withCredentials: true }))); }
  post<T = unknown>(path: string, body: unknown): Promise<T> { return this.guard(firstValueFrom(this.http.post<T>(path, body, { withCredentials: true }))); }
  put<T = unknown>(path: string, body: unknown): Promise<T> { return this.guard(firstValueFrom(this.http.put<T>(path, body, { withCredentials: true }))); }
  patch<T = unknown>(path: string, body: unknown): Promise<T> { return this.guard(firstValueFrom(this.http.patch<T>(path, body, { withCredentials: true }))); }
  delete<T = unknown>(path: string): Promise<T> { return this.guard(firstValueFrom(this.http.delete<T>(path, { withCredentials: true }))); }
  toast(message: string): void { clearTimeout(this.toastTimer); this.notice.set(message); this.toastTimer = setTimeout(() => this.notice.set(''), 5000); }
}
