# Gestión de plantas · Frontend

Versión inicial **0.1.0**. Aplicación Angular 22 adaptable a computador y celular. El backend Laravel vive en el repositorio hermano `../backend/`; allí se guardan los datos en PostgreSQL.

Incluye resumen, cotizador, inventario, pedidos, productos, configuración y accesos según permisos. También permite imprimir una cotización para el cliente sin los cálculos internos.

## Desarrollo

Requiere **Node.js 24.15.0 o superior dentro de la rama 24**, o una versión compatible de la rama **26**, y **PNPM 11.25.0**. La versión del gestor está fijada en `package.json`. [Compatibilidad oficial de Angular](https://angular.dev/reference/versions).

Usando el PNPM disponible en tu entorno, desde la raíz del frontend:

```sh
pnpm --version
pnpm install --frozen-lockfile
pnpm start
```

Abre **http://localhost:4200**. Si Node 24 ya dispone de Corepack, también puedes ejecutar `corepack pnpm install --frozen-lockfile` y `corepack pnpm start`, sin crear una instalación global de PNPM.

El backend debe estar iniciado en `http://127.0.0.1:8000`, con migraciones, datos iniciales y una cuenta administradora. Consulta su [README](../backend/README.md).

## Proxy y sesión

`proxy.conf.json` envía `/api` y `/sanctum` a `127.0.0.1:8000` y conserva el origen. Si cambias ese puerto, actualiza el archivo y reinicia Angular.

En el `.env` del backend:

```dotenv
SANCTUM_STATEFUL_DOMAINS=localhost:4200,127.0.0.1:4200,localhost:8000,127.0.0.1:8000
SESSION_SECURE_COOKIE=false
SESSION_DOMAIN=null
```

Mantén el mismo host durante la sesión, por ejemplo `localhost:4200`. El frontend obtiene la cookie CSRF, envía credenciales a `/api/login` y utiliza cookies y `X-XSRF-TOKEN`. Los permisos también se comprueban en el servidor. Los datos y tokens de acceso no se mantienen como un inventario independiente en el almacenamiento del navegador.

## Construir y comprobar

```sh
pnpm run build --configuration production
```

El resultado queda en `dist/gestion-plantas/browser/`. La compilación verifica TypeScript y plantillas. Comprueba además inicio/cierre de sesión, ambas presentaciones, clasificación de plantas, confirmación/entrega/cancelación, pagos y permisos de administrador/operador.

El Dockerfile compila con Node 24 y PNPM fijado y entrega los archivos a Nginx. `nginx.conf` sirve Angular y reenvía las rutas API/Sanctum al backend PHP-FPM bajo el mismo origen.

## VPS Ubuntu

La guía versionada está en **[../backend/deploy/README.md](../backend/deploy/README.md)**. Reúne ambos repositorios, PostgreSQL y el proxy HTTPS. Node se utiliza para compilar; Nginx sirve el frontend publicado.

No subas `node_modules/`, `.angular/`, archivos `.env`, credenciales ni respaldos al repositorio. El despliegue real del VPS se verifica por separado de la compilación local.

Angular y sus dependencias conservan sus licencias de código abierto respectivas. El nombre comercial de la aplicación todavía puede ajustarse.
