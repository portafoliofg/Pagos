/**
 * Lector de comprobantes — Código del servidor (Google Apps Script)
 *
 * Maneja dos hojas dentro del mismo spreadsheet:
 *  - "Hoja 1": transferencias (lo que ya existía).
 *  - "Cheques": cheques emitidos y de terceros (hoja nueva, columnas
 *    distintas porque un cheque no tiene los mismos campos que una
 *    transferencia).
 */

const SHEET_TRANSFERENCIAS = 'Hoja 1';
const HEADERS_TRANSFERENCIAS = [
  'Archivo', 'Banco', 'Cuenta Origen', 'N° de Referencia', 'Titular Origen', 'CUIT Origen',
  'Fecha', 'Hora', 'Cuenta Destino / CBU', 'Titular Destino', 'CUIT Destino',
  'Importe', 'Motivo', 'Concepto'
];
const COL_REFERENCIA = HEADERS_TRANSFERENCIAS.indexOf('N° de Referencia');

const SHEET_CHEQUES = 'Cheques';
const HEADERS_CHEQUES = [
  'Archivo', 'Banco', 'Tipo', 'N° de Cheque', 'Titular', 'CUIT',
  'Fecha de Emisión', 'Fecha de Pago', 'Importe', 'Concepto'
];
const COL_BANCO_CHEQUE = HEADERS_CHEQUES.indexOf('Banco');
const COL_NUMERO_CHEQUE = HEADERS_CHEQUES.indexOf('N° de Cheque');

/** Muestra la página al abrir el link /exec */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Lector de comprobantes')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** La llama la página al guardar transferencias. */
function guardarComprobantes(rows) {
  return guardarFilas(rows, SHEET_TRANSFERENCIAS, HEADERS_TRANSFERENCIAS, [COL_REFERENCIA]);
}

/** La llama la página al guardar cheques. */
function guardarCheques(rows) {
  return guardarFilas(rows, SHEET_CHEQUES, HEADERS_CHEQUES, [COL_BANCO_CHEQUE, COL_NUMERO_CHEQUE]);
}

/** La llama la vista de "Transferencias" para traer todo lo guardado. */
function obtenerTransferencias() {
  return leerFilas(SHEET_TRANSFERENCIAS, HEADERS_TRANSFERENCIAS);
}

/** La llama la vista de "Cheques" para traer todo lo guardado. */
function obtenerCheques() {
  return leerFilas(SHEET_CHEQUES, HEADERS_CHEQUES);
}

/**
 * Agrega filas a una hoja, evitando duplicados según columnas clave.
 * keyCols: índices (sobre headers) que forman la clave de duplicado. Si a
 * una fila le falta alguno de esos valores, no se le aplica dedupe (se
 * guarda igual) — mismo criterio que tenía el guardado de transferencias.
 */
function guardarFilas(rows, nombreHoja, headers, keyCols) {
  const lock = LockService.getScriptLock();  // evita que dos cargas simultáneas se mezclen
  lock.waitLock(20000);
  try {
    const sheet = obtenerHoja(nombreHoja, headers);
    const lastRow = sheet.getLastRow();
    const existentes = new Set();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues()
        .forEach(fila => {
          const clave = claveDe(fila, keyCols);
          if (clave) existentes.add(clave);
        });
    }

    const nuevas = [];
    const duplicadas = [];
    (rows || []).forEach(r => {
      const fila = headers.map((_, i) => r[i] == null ? '' : String(r[i]));
      const clave = claveDe(fila, keyCols);
      if (clave && existentes.has(clave)) {
        duplicadas.push(fila[0] + ' (' + clave.split('|').join(' ') + ')');
      } else {
        if (clave) existentes.add(clave);
        nuevas.push(fila);
      }
    });

    if (nuevas.length) {
      // Todo como texto: evita que Sheets le saque los ceros a la izquierda
      // o redondee los CBU/CUIT/números de cheque. Como contrapartida, los
      // importes quedan como texto y no se pueden sumar directo con
      // SUMA(); si hace falta un total, conviene una columna auxiliar con
      // VALOR(SUSTITUIR(...)).
      sheet.getRange(sheet.getLastRow() + 1, 1, nuevas.length, headers.length)
        .setNumberFormat('@')
        .setValues(nuevas);
    }
    return { agregadas: nuevas.length, duplicadas: duplicadas };
  } finally {
    lock.releaseLock();
  }
}

function claveDe(fila, keyCols) {
  const partes = keyCols.map(i => String(fila[i] || '').trim());
  if (partes.some(p => !p)) return '';
  return partes.join('|');
}

/** Devuelve la hoja indicada; si está vacía le pone los encabezados. */
function obtenerHoja(nombre, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Lee todas las filas de datos de una hoja como objetos {Campo: valor}. */
function leerFilas(nombreHoja, headers) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues()
    .map(fila => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = fila[i]; });
      return obj;
    });
}
