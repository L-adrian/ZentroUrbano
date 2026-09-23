# Proceso Operativo: Disponibilidad Mensual

Objetivo: mantener Zentro Urbano limpio, confiable y sin propiedades vencidas.

## Frecuencia

- Último día hábil de cada mes.
- Prioridad: propiedades Premium, luego Pro, luego Básico.

## Flujo

1. Ejecutar `queue_monthly_availability_checks()` en Supabase.
2. Contactar al propietario o inmobiliaria por WhatsApp.
3. Registrar el estado:
   - `available`: sigue disponible.
   - `rented`: alquilada.
   - `sold`: vendida.
   - `paused`: pausar por decisión del cliente.
   - `no_response`: sin respuesta.
4. Actualizar la ficha si cambia precio, fotos, requisitos o contacto.
5. Ocultar propiedades no disponibles.
6. Enviar reporte semanal/mensual con vistas, clicks de ficha y clicks de WhatsApp.

## Regla Comercial Premium

Premium se mantiene hasta venta o alquiler, pero al cierre de cada mes se consulta si sigue disponible. Si no hay respuesta después de seguimiento manual, la ficha puede pausarse para proteger la confianza del catálogo.
