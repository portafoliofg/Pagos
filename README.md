# Lector de comprobantes

App web de Google Apps Script para cargar comprobantes bancarios (foto o
PDF) — transferencias y cheques —, leer los datos automáticamente por OCR
y guardarlos organizados en una hoja de cálculo, evitando carga manual y
duplicados.

## Cómo funciona

1. En **Cargar** se sube una o varias imágenes/PDF, eligiendo banco y tipo
   de comprobante (Transferencia, Cheque emitido, Cheque de terceros).
2. El navegador hace OCR local con [Tesseract.js](https://github.com/naptha/tesseract.js)
   (los PDF se rasterizan primero con [PDF.js](https://mozilla.github.io/pdf.js/)).
3. El texto leído se parsea para extraer los campos del comprobante.
4. Se pueden corregir los valores a mano antes de guardar.
5. Al guardar, `Code.gs` agrega una fila por comprobante a la hoja que
   corresponda (transferencias o cheques) y descarta los que ya estaban
   cargados.
6. Las vistas **Transferencias** y **Cheques** traen todo lo guardado y lo
   muestran agrupado: las transferencias por banco y, dentro de cada
   banco, por destinatario; los cheques por banco y por tipo (emitido /
   de terceros). Cada grupo muestra la cantidad y el total.

Todo el procesamiento de OCR corre en el navegador de quien carga el
comprobante; al servidor de Apps Script solo le llegan los datos ya
extraídos para guardar.

## Hojas del spreadsheet

- **Hoja 1** — transferencias: Archivo, Banco, Cuenta Origen, N° de
  Referencia, Titular Origen, CUIT Origen, Fecha, Hora, Cuenta Destino /
  CBU, Titular Destino, CUIT Destino, Importe, Motivo, Concepto.
- **Cheques** — cheques (emitidos y de terceros): Archivo, Banco, Tipo,
  N° de Cheque, Titular, CUIT, Fecha de Emisión, Fecha de Pago, Importe,
  Concepto. Se crea sola la primera vez que se guarda un cheque.

Si el spreadsheet ya se usó con una versión anterior de este proyecto,
"Hoja 1" no tenía la columna **Banco** — hay que agregarla a mano (o
dejar que la agregue la próxima vez que se use "Nueva implementación" y
se guarde algo, aunque eso no reordena filas viejas) antes de usar la
vista de Transferencias, porque sin esa columna no hay por dónde agrupar.

## Estado actual / limitaciones

- La extracción automática de campos solo está implementada para
  **BBVA + Transferencias**. El resto (Bancor, Efectivo, FCI, y los dos
  tipos de cheque) todavía no tienen parser: se puede revisar el texto
  leído, pero el comprobante no se guarda hasta que se implemente.
- La extracción es heurística, no hay garantía de 100% de precisión;
  conviene revisar los valores antes de guardar, sobre todo cuando el
  comprobante tiene mala calidad de imagen.
- La columna "Importe" se guarda como texto (igual que el resto), para no
  perder ceros a la izquierda ni redondear CBU/CUIT/N° de cheque. Las
  vistas agrupadas calculan los totales en el navegador a partir de ese
  texto (formato argentino: punto de miles, coma decimal); si hace falta
  sumar importes directo en la hoja, conviene una columna auxiliar.

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
     transferencias y cheques, conviene restringirlo a las personas de la
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
Code.gs       Backend: guarda y lee filas de ambas hojas, evita duplicados
Index.html    Frontend: cargar, OCR, vistas agrupadas de transferencias y cheques
```

## Pendiente

El parser de cheques (`parseCheque` en `Index.html`) está sin implementar
porque todavía no hay un comprobante de ejemplo real para basarse. Falta
compartir una foto/PDF de cheque (o describir los campos y cómo aparecen
etiquetados) para poder terminarlo.
