# Lector de comprobantes

App web de Google Apps Script para cargar comprobantes de transferencias
bancarias (foto o PDF), leer los datos automáticamente por OCR y guardarlos
en una hoja de cálculo, evitando carga manual y duplicados.

## Cómo funciona

1. Se sube una o varias imágenes/PDF de comprobantes.
2. El navegador hace OCR local con [Tesseract.js](https://github.com/naptha/tesseract.js)
   (los PDF se rasterizan primero con [PDF.js](https://mozilla.github.io/pdf.js/)).
3. El texto leído se parsea para extraer los campos del comprobante
   (cuentas, CUIT, fecha, hora, importe, referencia, etc.).
4. Se pueden corregir los valores a mano antes de guardar.
5. Al guardar, `Code.gs` agrega una fila por comprobante a la hoja y
   descarta los que ya estaban cargados (mismo N° de Referencia).

Todo el procesamiento de OCR corre en el navegador de quien carga el
comprobante; al servidor de Apps Script solo le llegan los datos ya
extraídos para guardar.

## Estado actual / limitaciones

- La extracción automática de campos solo está implementada para
  **BBVA + Transferencias**. El resto de las combinaciones de banco y
  operación del formulario (Bancor, Efectivo, Cheques, FCI) todavía no
  tienen parser: se puede revisar el texto leído, pero el comprobante no
  se guarda en la hoja hasta que se implemente.
- La extracción es heurística, no hay garantía de 100% de precisión;
  conviene revisar los valores antes de guardar, sobre todo cuando el
  comprobante tiene mala calidad de imagen.
- La columna "Importe" se guarda como texto (igual que el resto), para no
  perder ceros a la izquierda ni redondear CBU/CUIT. Si hace falta sumar
  importes en la hoja, hay que convertir esa columna aparte.

## Deploy

Este repo es solo el código fuente, versionado para tener historial y
poder revisarlo. El deploy se hace manualmente:

1. Crear (o abrir) la hoja de cálculo de Google Sheets donde se va a
   guardar.
2. Extensiones → Apps Script.
3. Pegar `Code.gs` en un archivo de script y `Index.html` como archivo
   HTML (mismos nombres).
4. Implementar → Nueva implementación → Aplicación web.
   - Revisar con cuidado quién puede ejecutarla y como quién ("Ejecutar
     como" / "Quién tiene acceso") antes de publicar: al manejar datos de
     transferencias bancarias, conviene restringirlo a las personas de la
     organización que realmente lo necesiten, no dejarlo abierto a
     cualquiera.
5. El link que da la implementación es la URL de la app.

Si en el futuro se usa [clasp](https://github.com/google/clasp) para
sincronizar con Apps Script directo desde acá, se puede sumar
`.clasp.json` y `appsscript.json` (no están incluidos todavía porque no
hay forma de verificar la configuración real de permisos sin acceso al
proyecto de Apps Script).

## Archivos

```
Code.gs       Backend: guarda las filas en la hoja, evita duplicados
Index.html    Frontend: sube archivos, hace OCR, arma los campos, guarda
```
