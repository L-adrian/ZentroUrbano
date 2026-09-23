# Zentro Urbano Launch Checklist

Actualizado 2026-09-23. Implementacion y pruebas: PRE_RELEASE_QA.md.
Instalacion del ZIP: HOSTINGER_DEPLOY.md.

- [x] MySQL para cuentas, sesiones, solicitudes y fotos; sin fallback al fallar.
- [x] Aprobacion/rechazo manual exclusivos del administrador y con auditoria.
- [x] Transacciones, idempotencia, rollback y acceso privado a originales.
- [x] Migraciones repetibles, comprobacion de esquema y arranque protegido.
- [x] Pruebas de reinicio y caída de base en instancia aislada.
- [ ] Configurar credenciales reales de MySQL/admin/Google en Hostinger.
- [ ] Aplicar migraciones en la base destino, con respaldo previo.
- [ ] Probar Google real, dominio HTTPS y limites del hosting.
- [ ] Configurar respaldo completo, cuotas y prueba de restauracion.
- [ ] Migrar datos anteriores, si corresponde, con revision y respaldo.
- [ ] Confirmar propietarios, precios, fotos y disponibilidad del inventario real.

Los anuncios demo se mantienen identificados; las pruebas QA no se incluyen en el ZIP.
