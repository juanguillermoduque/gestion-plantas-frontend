import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { App } from './app/app';
import { routes } from './app/app.routes';

bootstrapApplication(App, { providers: [provideZonelessChangeDetection(), provideRouter(routes), provideHttpClient(withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }))] }).catch(error => console.error('No se pudo abrir la aplicación.', error));
