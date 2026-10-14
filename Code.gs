/**
 * Lector de comprobantes — Código del servidor (Google Apps Script)
 *
 * Al abrir el link de la aplicación web se muestra la página (Index.html)
 * para cargar comprobantes, y los datos se guardan en esta hoja.
 */

const SHEET_NAME = 'Hoja 1';
const HEADERS = ['Archivo', 'Cuenta Origen', 'N° de Referencia', 'Titular Origen', 'CUIT Origen',
                 'Fecha', 'Hora', 'Cuenta Destino / CBU', 'Titular Destino', 'CUIT Destino',
                 'Importe', 'Motivo', 'Concepto'];
const COL_REFERENCIA = HEADERS.indexOf('N° de Referencia');

/** Muestra la página al abrir el link /exec */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Lector de comprobantes')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * La llama la página con google.script.run.
 * Agrega una fila por comprobante y saltea los que ya están (mismo N° de Referencia).
 */
function guardarComprobantes(rows) {
  const lock = LockService.getScriptLock();  // evita que dos cargas simultáneas se mezclen
  lock.waitLock(20000);
  try {
    const sheet = obtenerHoja();
    const lastRow = sheet.getLastRow();
    const existentes = new Set(
      lastRow > 1
        ? sheet.getRange(2, COL_REFERENCIA + 1, lastRow - 1, 1).getDisplayValues()
            .map(r => String(r[0]).trim()).filter(String)
        : []
    );

    const nuevas = [];
    const duplicadas = [];
    (rows || []).forEach(r => {
      const fila = HEADERS.map((_, i) => r[i] == null ? '' : String(r[i]));
      const ref = fila[COL_REFERENCIA].trim();
      if (ref && existentes.has(ref)) {
        duplicadas.push(fila[0] + ' (ref. ' + ref + ')');
      } else {
        if (ref) existentes.add(ref);
        nuevas.push(fila);
      }
    });

    if (nuevas.length) {
      // Todo como texto: evita que Sheets le saque los ceros a la izquierda
      // o redondee los CBU/CUIT. Como contrapartida, "Importe" queda como
      // texto y no se puede sumar directo con SUMA(); si hace falta un
      // total, conviene una columna auxiliar con VALOR(SUSTITUIR(...)).
      sheet.getRange(sheet.getLastRow() + 1, 1, nuevas.length, HEADERS.length)
        .setNumberFormat('@')
        .setValues(nuevas);
    }
    return { agregadas: nuevas.length, duplicadas: duplicadas };
  } finally {
    lock.releaseLock();
  }
}

/** Devuelve la hoja; si está vacía le pone los encabezados. */
function obtenerHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}
