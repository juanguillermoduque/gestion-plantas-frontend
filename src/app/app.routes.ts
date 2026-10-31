import { Routes } from '@angular/router';
import { Workspace } from './workspace';

export const routes: Routes = [
  { path: '', redirectTo: 'resumen', pathMatch: 'full' },
  ...['resumen', 'cotizador', 'inventario', 'pedidos', 'productos', 'ajustes'].map(view => ({ path: view, component: Workspace, data: { view } })),
  { path: '**', redirectTo: 'resumen' }
];
