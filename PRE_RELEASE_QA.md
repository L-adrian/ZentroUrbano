# Primera version: paquete MySQL y revision manual (2026-09-23)

El ZIP actual reemplaza el paquete anterior. No es un despliegue ni un respaldo privado.
Consultar HOSTINGER_DEPLOY.md para instalar y configurar las credenciales del hosting.

## Implementado

- MySQL es la fuente unica al configurarse: cuentas, sesiones, solicitudes y fotos.
  Si falla, no se crean cuentas alternativas ni envios locales divergentes.
- Una unica credencial administrativa, privada, sin elevacion desde el registro.
- Aprobar/rechazar manualmente con bloqueo de fila, transaccion y registro de auditoria.
  Publicacion y asignacion al propietario se guardan juntas. Rechazar exige un motivo.
- Fotos originales privadas; derivados WebP sin EXIF/GPS solo para fichas aprobadas.
- Envio idempotente: un reintento no crea una segunda solicitud.
- Validacion de archivos reales, tipos, duplicados, tamanos y datos estructurados.
- Fechas y vencimiento de sesiones usan UTC en MySQL y en el driver.
- Cuenta Google reutiliza la identidad SQL existente y no elimina su contraseña.
- Favicon de casita y ejemplos de comision tachados permanecen implementados.

## Verificacion local

MariaDB 10.4.32, instancia aislada en 127.0.0.1:3308, sin alterar la base anterior.
Migraciones 001-003 ejecutadas y repetidas; tablas transaccionales y paquetes verificados.
Suite MySQL: registro concurrente, Google simulado, bytes originales, reintento concurrente,
rollback al fallar la segunda foto, permisos/CSRF, aprobacion concurrente, rechazo,
sesiones deshabilitadas, reinicio sin archivos locales y caida de base sin fallback.
Suite anterior: 37 pruebas de alquileres, rutas, autenticacion local, OAuth y fotos.
Navegador: envio real con foto y datos -> pendiente -> aprobacion admin -> ficha publica.
Capturas en output/playwright/sql-admin-mobile.png y sql-approved-mobile.png.
Resultado final: lint, build de produccion y 50 pruebas aprobadas, sin fallos ni omisiones.
Respaldo de prueba con mysqldump --single-transaction --hex-blob restaurado en una base
QA separada. Se comprobaron solicitudes, fotos, usuarios y decisiones restauradas.

## Necesario en Hostinger

- Introducir credenciales reales de MySQL, admin y Google; no estan en el ZIP.
- Migrar/verificar la base seleccionada y configurar el arranque npm start.
- Probar Google real, HTTPS y limites del hosting; esas comprobaciones no se pueden
  sustituir con el servidor local ni con la prueba de proveedor simulado.
- Programar respaldo de toda la base (incluidas fotos) y probar restauracion.
- Importar datos anteriores solo mediante una migracion de datos revisada. No se
  empaquetaron cuentas, sesiones, fotos privadas ni datos QA como inventario real.
- Verificar disponibilidad real y consentimiento antes de aprobar cada ficha.

No se garantiza ausencia de cualquier fallo ni compatibilidad fisica con todos los dispositivos.

## Instalador de Hostinger: cambio a npm (2026-09-23)

El log recibido falla al cargar pnpm.cjs desde Corepack, antes de instalar dependencias.
Se reemplazo pnpm por npm, con package-lock.json, dependencias directas fijadas a las
versiones ya probadas y el override PostCSS 8.5.14 conservado. .npmrc incluye las
herramientas de compilacion incluso al instalar con NODE_ENV=production.

Verificado en una copia limpia sin .env ni datos locales, Node 24.13.1/npm 11.10.0:
npm ci, 26 pruebas, npm run lint y npm run build correctos. El lock incluye los binarios
Linux x64 de Next, Sharp y Tailwind. El empaquetador ZIP tambien se verifico.
El instalador advierte que ESLint 9 ya no recibe soporte; no es el error de Corepack.

Pendiente en el panel: seleccionar npm y npm run build y volver a desplegar.
Las credenciales, importacion de tablas y comprobaciones reales de Hostinger siguen
siendo necesarias. No se modificaron MySQL, cuentas, fotos ni reglas de aprobacion.
