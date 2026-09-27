# Recorridos experimentales

El visor es opcional por ficha. No genera mundos ni llama a la API de Marble.
Las fotos originales siguen siendo la referencia de la vivienda real.

## Publicar

1. Aplicar `006_property_tours.sql` con el proceso de migraciones habitual.
2. Generar y revisar el ambiente fuera del sitio, en Tour Studio.
3. Entrar a `/admin/recorridos` con el acceso administrativo del sitio.
4. Seleccionar una ficha publicada de alquiler directo e importar tres archivos:
   `manifest.json`, `world.spz` y `mobile.spz`.
5. Revisar el visor privado y comparar con las fotos originales.
6. Confirmar la revision y la autorizacion del propietario, y publicar.

Formato del manifiesto (indices de fotos desde cero):

```json
{
  "scope": "Cocina y estar",
  "model": "marble-1.1",
  "metricScale": 1.8379846,
  "groundOffset": 1.5470815,
  "photoIndices": [1, 4, 10, 11]
}
```

La escala y el desplazamiento provienen de la escena generada, no son medidas
verificadas de la vivienda. Los indices deben corresponder a las fotos usadas
para generar ese ambiente. Se admite SPZ v2/v3: hasta 500-600 mil puntos para
escritorio y 150 mil para la version ligera, con un maximo de 10 MiB por archivo.

## Datos y retirada

Los archivos se guardan en MySQL, no en Git ni en el directorio del despliegue.
El administrador puede retirar el recorrido sin borrar la ficha. Un recorrido
retirado deja de servir archivos publicos y requiere una nueva revision para
reemplazarlo. Las solicitudes condicionales verifican el estado antes de un 304.
No se puede revocar una copia que un visitante ya haya descargado.

Solo el administrador importa y publica. Se registran acciones administrativas
y eventos reales de apertura, carga, error y contacto posterior. Los contadores
de 30 dias son eventos, no personas unicas ni disponibilidad en tiempo real.
La variante ligera se utiliza automaticamente en pantallas pequenas o ahorro
de datos; el visitante puede seleccionar alta calidad.

Retirar el recorrido es suficiente para desactivar el piloto. No hace falta
eliminar tablas ni alterar cuentas, fotos, precios o descripciones.
