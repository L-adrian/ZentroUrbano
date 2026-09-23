# Hostinger: Zentro Urbano

Repositorio para Cloud Startup > Deploy Web App > Continue with GitHub.
El ZIP sigue disponible como alternativa manual, con el mismo arranque.
Incluye codigo, imagenes del catalogo, esquema SQL y herramientas de migracion.
No incluye un servidor MySQL, una copia de datos privados ni credenciales.

## 0. Conectar GitHub una sola vez

Repositorio previsto: https://github.com/L-adrian/ZentroUrbano (privado).
En la cuenta que tiene el hosting, elige Continue with GitHub, autoriza solamente
este repositorio y selecciona main como rama de produccion. No se transfiere el dominio.
Si el hosting ya tiene una cuenta GitHub conectada, coordina con su propietario:
Hostinger permite una sola cuenta GitHub por plan. No desconectes los otros sitios.

Primero configura la base, las variables privadas y el esquema de las secciones siguientes.
No conectes una rama de pruebas a la web publica. Los cambios enviados a la rama
seleccionada pueden activar un despliegue automatico: sube solo versiones ya verificadas.
Para actualizar usa GitHub, no el administrador de archivos: los archivos del despliegue
se reemplazan. MySQL y sus respaldos se administran por separado.

Referencia: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/

## 1. Base de datos y variables

En la cuenta que tiene hosting, crea una base MySQL y su usuario. Si ya existe,
verifica el nombre y realiza un respaldo antes de migrar. No es necesario transferir
el dominio ni contratar servicios adicionales para utilizar este codigo; los limites
y prestaciones disponibles dependen del plan de hosting existente.

Puedes importar un archivo privado con Import .env en Environment Variables.
El comando npm run config:hostinger crea output/hostinger-private/zentro-urbano.env,
fuera de Git y del ZIP, con una clave administrativa aleatoria. Si DATABASE_URL ya
esta definida en el proceso, la incluye; si no, hay que completarla antes de importar.
No copia .env.local ni reutiliza la base de esta computadora. No sobrescribe archivos.
La importacion debe reemplazar los valores antiguos, no dejar claves duplicadas.

Tambien puedes introducir las variables de CONFIGURACION.env.example manualmente:
- DATABASE_URL: URI privada de conexion, con host, usuario, clave y nombre de base.
  Codifica caracteres especiales de usuario/clave con percent-encoding.
- ZENTRO_URBANO_ADMIN_USER: tu unico usuario administrador (puede ser tu correo).
- ZENTRO_URBANO_ADMIN_PASSWORD: clave exclusiva, aleatoria, de al menos 16 caracteres.
- ZENTRO_REQUIRE_DATABASE=1 y MYSQL_CONNECTION_LIMIT=5.
- NEXT_PUBLIC_SITE_URL=https://zentrourbano.com.
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI para activar Google.
  No reutilices claves que se hayan compartido en mensajes.

El registro publico crea propietarios, nunca administradores. La cuenta administradora
usa las credenciales privadas anteriores en /admin y /admin/solicitudes.
No compartas esa clave ni la contraseña de la base de datos.

El arranque y db:check leen .env.production.local, .env.local, .env.production y .env,
en ese orden. Los valores del proceso tienen prioridad. Para un archivo privado fuera
de la carpeta de despliegue usa ZENTRO_ENV_FILE con su ruta absoluta; si no existe,
el arranque falla. Estos scripts leen valores literales, sin expansion de $VARIABLE.
Para Hostinger se recomienda Import .env: los archivos del despliegue se reemplazan.

## 2. Importar el esquema

Despues de instalar dependencias, con las variables ya definidas:
1. Respalda la base seleccionada.
2. Define ZENTRO_CONFIRM_DATABASE con el nombre exacto de esa base.
3. Ejecuta npm run db:migrate.
4. Ejecuta npm run db:check.
5. Retira ZENTRO_CONFIRM_DATABASE del entorno normal.

El migrador no crea ni borra bases, no importa cuentas demo y no corre automaticamente
al arrancar. Usa bloqueo de migraciones, historial y checksum para evitar ejecuciones
duplicadas o cambios silenciosos en migraciones ya aplicadas. Los DDL de MySQL hacen
commit implicito: conserva siempre un respaldo antes de modificar el esquema.

Alternativa si solo tienes phpMyAdmin: selecciona la base correcta e importa, en orden:
- database/mysql/001_zentro_urbano_core.sql
- database/mysql/002_property_exchange_rate.sql
- database/mysql/003_publication_review.sql

Para una base recien creada y VACIA, npm run db:export prepara un unico archivo
output/hostinger-private/zentro-urbano-inicial.sql con las tres migraciones y sus
checksums. Selecciona la base en phpMyAdmin > Importar y carga ese archivo una sola vez.
No incluye cuentas ni fichas de prueba. No utilizarlo para actualizar una base con datos;
las actualizaciones usan db:migrate con respaldo y confirmacion del nombre.

No importar datos de prueba. Las tablas de negocio deben usar InnoDB.
max_allowed_packet debe ser como minimo 12 MB (recomendado 32 MB). Si el plan no
permite ajustarlo, no habilitar cargas de 10 MB hasta adaptar ese limite.
El proxy del hosting debe aceptar el formulario de hasta 60 MB de fotos mas metadatos.

## 3. Configuracion de la aplicacion

- Framework: Next.js con backend, no PHP ni exportacion estatica.
- Node.js: 24.x.
- Package manager: npm (no pnpm).
- Instalacion: npm ci. .npmrc conserva las herramientas necesarias para compilar.
- Build: npm run build.
- Inicio: npm start. GitHub y ZIP usan scripts/start-hostinger.mjs.
- Carpeta de salida, si la solicita: .next (no out ni public).
- PORT lo proporciona Hostinger.

El arranque comprueba la conexion, las tablas y el limite de fotos antes de abrir
el servidor. Si falta MySQL o la clave administrativa, falla explicitamente.
No crea cuentas ni guarda solicitudes en archivos locales como alternativa.
npm run start:preview es exclusivamente para pruebas locales, no para Hostinger.

Antes de enviar una version a main: npm run lint, npm test y npm run build.
Una migracion nueva requiere respaldo y ejecucion explicita de db:migrate;
no se ejecuta al hacer push, build ni start. No ejecutes db:seed en produccion.
Volver a una version del codigo no revierte automaticamente cambios en MySQL.

### Error de Corepack antes de instalar dependencias

Si Hostinger muestra MODULE_NOT_FOUND para pnpm.cjs al preparar el entorno,
la aplicacion todavia no se ha compilado ni conectado a MySQL. Este repositorio
usa npm y package-lock.json para no depender de esa instalacion de pnpm.
En Settings and redeploy cambia Package manager a npm y Build command a
npm run build. Conserva Node 24.x, main, raiz ./ y salida .next, y selecciona
Save and redeploy. Un push no cambia automaticamente el gestor guardado en Hostinger.

## 4. Flujo de publicacion

Propietario registrado > fotos y datos > solicitud pendiente > revision del admin.
En /admin/solicitudes revisas datos y originales, confirmas ubicacion/identidad/
disponibilidad y eliges Aprobar y publicar o Rechazar con motivo.

Aprobar guarda ficha, asignacion al propietario y auditoria en una sola transaccion.
Rechazar no crea una ficha publica. Los reintentos de envio son idempotentes.
Cuentas, sesiones, solicitudes, originales y copias publicas quedan en MySQL.
Las copias publicas son WebP sin EXIF/GPS; los originales requieren acceso admin.
Solo las fotos de solicitudes aprobadas y fichas publicadas tienen acceso publico.
No se envian correos automaticos: el propietario ve la decision y el motivo en Mis solicitudes.

El propietario puede editar precio/T-C y datos de una ficha propia. Cambios en moneda
o condiciones de ingreso requieren nueva revision; no se aceptan URLs temporales de
fotos/videos como si fueran archivos ya guardados. Las cuentas y solicitudes locales
anteriores no se importan automaticamente: requiere migracion de datos revisada.

## 5. Google y dominio

En el cliente OAuth de tipo Web registra exactamente estas URI:
- http://localhost:3000/api/auth/google/callback
- https://zentrourbano.com/api/auth/google/callback

127.0.0.1 u otros puertos requieren su propia URI autorizada. Reinicia despues
de cambiar variables. Si Google esta en modo de prueba, autoriza el usuario de prueba.
La cuenta Google real sigue pendiente de probar con tus claves; el codigo se verifico
con un proveedor simulado y cuentas SQL. No se necesita publicar para probar localhost.
Referencia: https://developers.google.com/identity/protocols/oauth2/web-server

Despues verifica HTTPS, www/canonical, callback real y DNS, sin borrar registros de correo.

## Respaldo y verificacion

Respalda MySQL completo, incluyendo BLOB de fotos. Prueba restaurarlo en una base
separada y guarda una copia fuera del servidor. El ZIP de codigo no reemplaza ese respaldo.
Antes de abrir al publico prueba: registro/login, Google real, envio, aprobar/rechazar,
galeria, mapa, contactos, reinicio y restauracion. Verifica cuotas de almacenamiento.
No se ha desplegado ni cambiado el DNS desde este proyecto.
