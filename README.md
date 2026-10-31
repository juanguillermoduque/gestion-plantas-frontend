# Gestión del negocio · Frontend

Aplicación Angular 22 adaptable a computador y celular. Cada instalación corresponde a un negocio y permite administrar varias sedes. El backend Laravel vive en el repositorio hermano `../backend/`; allí se guardan los datos en PostgreSQL.

Incluye resumen, catálogo de insumos, inventario por insumo y sede, productos con receta, cotizador, pedidos, informes, configuración y accesos según permisos. También permite imprimir una cotización para el cliente sin los cálculos internos.

## Configuración del negocio y sedes

En **Ajustes**, un administrador configura el nombre y actividad del negocio, ciudad, país, cobertura de entregas, moneda, formato regional y zona horaria. Los formatos de moneda y fecha siguen esos valores; la interfaz permanece en español.

La instalación utiliza **una moneda**. Los totales de pedidos, pagos y gastos son enteros (`moneyPrecision: 0`); los costos unitarios admiten hasta **cuatro decimales** y las cantidades de insumo hasta **tres decimales**. Define la moneda antes de registrar insumos, productos o valores: el servidor bloquea los cambios cuando existen datos que lo impiden. Cambiar el código no convierte importes ni crea un sistema multimoneda.

El selector global muestra la sede activa en pantalla. Inventario, reservas, movimientos, pedidos, gastos y resultados se separan por sede. El catálogo de productos, los costos, la configuración y los accesos son compartidos. Actualmente las personas autorizadas pueden acceder a todas las sedes.

Un administrador puede crear y editar sedes. Las sedes nuevas comienzan sin existencias. Una sede inactiva conserva su historial y permite completar pedidos existentes, pero no admite nuevos pedidos, gastos ni movimientos manuales de inventario. Debe quedar al menos una sede activa.

## Insumos, recetas e inventario

En **Insumos**, un administrador crea cada material con nombre, categoría, unidad, costo unitario y mínimo disponible. Por ejemplo: plantas, materas, abono o empaques. Los insumos físicos tienen existencias separadas por sede; conceptos como publicidad pueden marcarse como **costo sin inventario** y no generan movimientos ni reservas.

El calculador opcional de la ficha divide **valor del lote entre cantidad del lote** y permite aplicar el costo por unidad. Si eliges gramos, un kilogramo se registra como 1.000 gramos: no hay conversiones automáticas entre unidades. El calculador solo modifica el costo del catálogo; no registra una compra, un gasto ni una entrada. Las entradas físicas se registran en **Inventario**.

En **Productos**, una receta relaciona insumos y cantidad consumida por producto. Su costo se deriva del catálogo, más los costos adicionales por producto y el tiempo de preparación. Ejemplo: abono a 12 por gramo y consumo de 150 gramos aporta 1.800 al costo. Los productos o servicios sin insumos requieren seleccionar explícitamente esa opción. La publicidad asignada en una receta no debe volver a cargarse por el mismo importe al pedido o a gastos generales.

El inventario conserva los cuatro estados configurables, pero los saldos se muestran por insumo y unidad. No se suman gramos, kilogramos, unidades u otras medidas diferentes. Las cotizaciones muestran consumos y faltantes sin reservar; confirmar reserva cada insumo físico de la receta en la sede del pedido y entregar lo descuenta. Se permiten cambios de etapa y bajas de existencias inactivas, pero no entradas nuevas. No se realizan transferencias entre sedes.

Los productos anteriores permanecen en modo **legacy**, con sus costos y recurso anterior, hasta configurar su receta expresamente. Puedes seleccionar el inventario anterior en una receta si su saldo corresponde realmente al insumo: revisa nombre, unidad y costo, sin volver a agregar esas existencias. No se inventan materiales, saldos ni equivalencias. Una instalación nueva sin uso no muestra ese recurso como un insumo de ejemplo obligatorio. Al combinar productos anteriores y recetas nuevas, la cotización distingue cantidades costeadas y cantidades que solo consumen el inventario anterior para evitar duplicar costos. Los pedidos guardados conservan los consumos y costos de su momento, incluso si después cambia el catálogo.

## Informes

**Informes** consulta datos reales de la sede seleccionada y permite elegir el mes. Incluye tendencia de seis meses de ventas y resultado operativo, ventas/aporte directo por producto, composición de costos, gastos generales por categoría y valor estimado del inventario actual. Las gráficas incorporan valores o tablas accesibles y estados vacíos cuando no existen registros.

El aporte directo de productos descuenta componentes y preparación, antes de descuentos y otros costos del pedido. El resultado operativo considera pedidos entregados y gastos generales. La valoración del inventario refleja cantidades actuales al último costo registrado; no es una valoración histórica ni FIFO y no cambia con el mes del informe.

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

El resultado queda en `dist/gestion-plantas/browser/`. La compilación verifica TypeScript y plantillas. Comprueba además inicio/cierre de sesión, insumos y calculador de lote, entradas fraccionadas, recetas, faltantes, confirmación/entrega/cancelación, pagos y permisos de administrador/operador.

Comprueba el cambio de sede, incluida la navegación Atrás/Adelante durante la carga: los formularios deben permanecer bloqueados hasta completar el cambio y nunca reutilizar la sede anterior para una escritura. Verifica la separación de existencias y gastos, las operaciones permitidas en sedes inactivas, servicios sin insumos, conservación de pedidos anteriores y los informes por mes. Revisa las tablas y gráficas con ingresos cero, resultados negativos y formatos regionales distintos.

El Dockerfile compila con Node 24 y PNPM fijado y entrega los archivos a Nginx. `nginx.conf` sirve Angular y reenvía las rutas API/Sanctum al backend PHP-FPM bajo el mismo origen.

## VPS Ubuntu

La guía versionada está en **[../backend/deploy/README.md](../backend/deploy/README.md)**. Reúne ambos repositorios, PostgreSQL y el proxy HTTPS. Node se utiliza para compilar; Nginx sirve el frontend publicado.

No subas `node_modules/`, `.angular/`, archivos `.env`, credenciales ni respaldos al repositorio. El despliegue real del VPS se verifica por separado de la compilación local.

Angular y sus dependencias conservan sus licencias de código abierto respectivas. El nombre comercial de la aplicación todavía puede ajustarse.
