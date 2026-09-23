# Zentro Urbano

Alquileres de viviendas entre propietarios e inquilinos en Bolivia.
Contacto directo, sin inmobiliarias ni comisiones de intermediacion.

Next.js 16, React 19, TypeScript y MySQL. Las solicitudes de publicacion
requieren una cuenta y aprobacion manual del administrador.

## Desarrollo local

Requiere Node.js 24 y pnpm 11.1.2.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Abre http://localhost:3000. Usa CONFIGURACION.env.example como referencia para
tu .env.local privado. Sin MySQL, el desarrollo local puede usar almacenamiento
local; produccion exige base de datos y credenciales administrativas.

## Verificacion

```bash
pnpm lint
pnpm test
pnpm build
```

pnpm test ejecuta pruebas sin base de datos ni claves reales. Las pruebas de
integracion SQL y autenticacion estan documentadas en PRE_RELEASE_QA.md;
solo deben ejecutarse contra entornos aislados, nunca contra usuarios reales.

pnpm start abre el servidor de produccion tras comprobar MySQL y la configuracion
administrativa. Para revisar un build local sin esa comprobacion usa pnpm start:preview.

## Publicar y actualizar

Repositorio previsto: https://github.com/L-adrian/ZentroUrbano.

Lee [HOSTINGER_DEPLOY.md](HOSTINGER_DEPLOY.md) para conectar GitHub, configurar
variables privadas, importar el esquema y activar Google en el dominio correcto.

- main contiene la version aprobada para produccion.
- Prueba los cambios antes de enviarlos a la rama conectada con Hostinger.
- Las cuentas, sesiones y fotos recibidas se conservan en MySQL, no en GitHub.
- Los cambios de esquema requieren respaldo y migracion explicita; nunca se
  ejecutan automaticamente al publicar codigo.
- No subas .env, tokens, respaldos, storage, output ni archivos de QA generados.
- No ejecutes db:seed en produccion. Los ejemplos del catalogo son datos de prueba.

GitHub conserva versiones del codigo, pero no reemplaza los respaldos de MySQL.
Revertir codigo no revierte la base de datos.

## Documentacion

- [Configuracion de Hostinger](HOSTINGER_DEPLOY.md)
- [Lista de lanzamiento](LAUNCH_CHECKLIST.md)
- [Pruebas previas al lanzamiento](PRE_RELEASE_QA.md)
