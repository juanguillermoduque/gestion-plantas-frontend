# Gestión del negocio · Frontend

Aplicación Angular 22 adaptable a computador y celular. Cada instalación corresponde a un negocio y permite administrar varias sedes. El backend Laravel vive en el repositorio hermano `../backend/`; allí se guardan los datos en PostgreSQL.

Incluye resumen, cotizador, inventario, pedidos, productos, configuración y accesos según permisos. También permite imprimir una cotización para el cliente sin los cálculos internos.

## Configuración del negocio y sedes

En **Ajustes**, un administrador configura el nombre y actividad del negocio, ciudad, país, cobertura de entregas, moneda, formato regional y zona horaria. Los formatos de moneda y fecha siguen esos valores; la interfaz permanece en español.

La instalación utiliza **una moneda y montos enteros, sin centavos** (`moneyPrecision: 0`). Define la moneda antes de registrar productos o valores: el servidor bloquea los cambios cuando existen datos que lo impiden. Cambiar el código no convierte importes ni crea un sistema multimoneda.

El selector global muestra la sede activa en pantalla. Inventario, reservas, movimientos, pedidos, gastos y resultados se separan por sede. El catálogo de productos, los costos, la configuración y los accesos son compartidos. Actualmente las personas autorizadas pueden acceder a todas las sedes.

Un administrador puede crear y editar sedes. Las sedes nuevas comienzan sin existencias. Una sede inactiva conserva su historial y permite completar pedidos existentes, pero no admite nuevos pedidos, gastos ni movimientos manuales de inventario. Debe quedar al menos una sede activa.

## Inventario y servicios

El negocio configura el nombre singular y plural de **una unidad base común** y las etiquetas de sus cuatro estados. Cada sede conserva su saldo de esa unidad. Solo el estado disponible permite reservar existencias para confirmar pedidos.

Cada producto define cuántas unidades base consume (`stockUnitsPerUnit`). Usa **0** para productos o servicios sin consumo de existencias. Esta versión no administra inventario independiente por referencia ni transferencias entre sedes.

Las cotizaciones no reservan inventario. Confirmar un pedido reserva las unidades de su sede y entregarlo las descuenta. El cotizador comienza con una unidad del primer producto activo y permite combinar productos y precios por cantidad.

## Desarrollo

Requiere **Node.js 24.15.0 o superior dentro de la rama 24**, o una versión compatible de la rama **26**, y **PNPM 11.25.0**. La versión del gestor está fijada en `package.json`. [Compatibilidad oficial de Angular](https://angular.dev/reference/versions).

Usando el PNPM disponible en tu entorno, desde la raíz del frontend:

```sh
pnpm --version
pnpm install --frozen-lockfile
pnpm start
```

Abre **http://localhost:4200**. Si Node 24 ya dispone de Corepack, también puedes ejecutar `corepack pnpm install --frozen-lockfile` y `corepack pnpm start`, sin crear una instalación global de PNPM.

El backend debe estar iniciado en `http://127.0.0.1:8000`, con migraciones y una cuenta administradora. La instalación genérica comienza sin catálogo ni existencias de un negocio específico. Consulta las instrucciones canónicas de instalación y carga opcional de datos en su [README](../backend/README.md).

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

El resultado queda en `dist/gestion-plantas/browser/`. La compilación verifica TypeScript y plantillas. Comprueba además inicio/cierre de sesión, creación de productos, clasificación del inventario base, confirmación/entrega/cancelación, pagos y permisos de administrador/operador.

Comprueba el cambio de sede, incluida la navegación Atrás/Adelante durante la carga: los formularios deben permanecer bloqueados hasta completar el cambio y nunca reutilizar la sede anterior para una escritura. Verifica la separación de existencias y gastos, las operaciones permitidas en sedes inactivas, un servicio sin consumo y los formatos regionales configurados.

El Dockerfile compila con Node 24 y PNPM fijado y entrega los archivos a Nginx. `nginx.conf` sirve Angular y reenvía las rutas API/Sanctum al backend PHP-FPM bajo el mismo origen.

## VPS Ubuntu

La guía versionada está en **[../backend/deploy/README.md](../backend/deploy/README.md)**. Reúne ambos repositorios, PostgreSQL y el proxy HTTPS. Node se utiliza para compilar; Nginx sirve el frontend publicado.

No subas `node_modules/`, `.angular/`, archivos `.env`, credenciales ni respaldos al repositorio. El despliegue real del VPS se verifica por separado de la compilación local.

Angular y sus dependencias conservan sus licencias de código abierto respectivas. El nombre comercial de la aplicación todavía puede ajustarse.
