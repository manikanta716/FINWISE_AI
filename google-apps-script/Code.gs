/**
 * FinWise AI — Google Apps Script backend
 * ------------------------------------------------------------
 * Provides a lightweight cloud database using a Google Sheet.
 *
 * SETUP
 * 1. Create (or open) a Google Sheet.
 * 2. Extensions > Apps Script.
 * 3. Delete any starter code and paste this whole file in.
 * 4. Deploy > New deployment > type "Web app".
 *      Execute as:  Me
 *      Who has access: Anyone
 * 5. Copy the deployment URL (ends in /exec) into
 *    js/config.js -> SHEETS_ENDPOINT.
 * 6. Open the /exec URL once directly in your browser — this
 *    triggers Google's one-time authorization prompt for the
 *    script. Without this step, requests from the app will fail.
 *
 * A sheet named "FinWiseHistory" is created automatically the
 * first time a record is saved.
 */

const SHEET_NAME = 'FinWiseHistory';
const HEADERS = ['Timestamp', 'Tool', 'Summary'];

function ensureSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

/** Handles POST requests — saves one financial-session snapshot as a row. */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const sheet = ensureSheet_();
    sheet.appendRow([
      new Date().toISOString(),
      body.tool || 'unknown',
      JSON.stringify(body.summary || {})
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/** Handles GET requests — ?action=history returns saved records as JSON. */
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'history') {
      const sheet = ensureSheet_();
      const values = sheet.getDataRange().getValues();
      const rows = values
        .slice(1) // drop header row
        .map(r => ({ timestamp: r[0], tool: r[1], summary: safeParse_(r[2]) }))
        .reverse()
        .slice(0, 50); // most recent 50
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, records: rows }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, message: 'FinWise AI Sheets backend is running.' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function safeParse_(str) {
  try { return JSON.parse(str); } catch (e) { return str; }
}
