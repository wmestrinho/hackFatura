/**
 * hackFatura | PCJ — Google Apps Script Backend
 * Deploy as Web App: Execute as Me, Anyone can access.
 * Paste the deployment URL into js/config.js → PCJ.SHEETS_SCRIPT_URL
 *
 * Sheet structure:
 *   Customers              — global contact list (all events)
 *   {Event}_TableWork      — per-event table work entries
 *   {Event}_PartsWork      — per-event parts entries
 *   {Event}_WorkCosts      — per-event overhead costs
 *   {Event}_Invoices       — per-event invoices
 */

const SPREADSHEET_ID = '1_I9kaE7ag1aULPneCB8kwuNksjWzI-EIrkTNXUp_VTQ';

// ── Sheet name helpers ─────────────────────────────────────────
function sanitizeSheetName(name) {
  if (!name) return 'NoEvent';
  // Remove chars Google Sheets disallows in tab names, trim to 45 chars
  return name.replace(/[\/\\*\?\[\]:]/g, '-').substring(0, 45).trim();
}

function eventSheet(eventName, type) {
  return sanitizeSheetName(eventName) + '_' + type;
}

// ── Sheet access (auto-creates with headers if missing) ────────
function getSheet(name, headerType) {
  if (!name) throw new Error('getSheet: sheet name is required (got: ' + name + ')');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    setupHeaders(sheet, headerType || name);
  }
  return sheet;
}

function getOrEmpty(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  return sheet.getDataRange().getValues().slice(1);
}

function setupHeaders(sheet, type) {
  // Guard: if type is missing or not a string, nothing to set up
  if (!type || typeof type !== 'string') return;

  // Strip event prefix to get base type (e.g. "SKUSA_TableWork" → "TableWork")
  let baseType = type;
  const known = ['TableWork', 'PartsWork', 'WorkCosts', 'Invoices', 'Customers', 'Events'];
  for (const k of known) {
    if (type === k || type.endsWith('_' + k)) { baseType = k; break; }
  }

  const headers = {
    Customers:  ['Timestamp','LoggedBy','Organization','HomeTrack','FirstName','LastName','Title','Phone','Email'],
    TableWork:  ['Timestamp','LoggedBy','Event','Organization','KartNumbers','ServiceName','ServicePrice','PaymentMethod','PaymentStatus','Notes'],
    PartsWork:  ['Timestamp','LoggedBy','Event','Organization','KartNumber','Parts','PartsTotal','PaymentMethod','PaymentStatus','Notes'],
    WorkCosts:  ['Timestamp','LoggedBy','Event','Category','Amount','PaidBy','PaymentMethod','Description'],
    Invoices:   ['Timestamp','LoggedBy','InvoiceNumber','Event','Organization','Contact','Email','Phone','Items','Total','Notes'],
    Events:     ['Name','Date','Location','CreatedAt'],
  };

  if (headers[baseType]) {
    sheet.getRange(1, 1, 1, headers[baseType].length).setValues([headers[baseType]]);
    sheet.getRange(1, 1, 1, headers[baseType].length)
      .setBackground('#C0392B')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
  }
}

// ── Router (GET — works around CORS/redirect issues from browsers) ────
function doGet(e) {
  // Health check — no params
  if (!e.parameter || !e.parameter.action) {
    return jsonResponse({ status: 'hackFatura PCJ API is alive 🏁' });
  }

  try {
    const action  = e.parameter.action;
    const payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : {};

    const handlers = {
      logTableWork:    () => appendTableWork(payload),
      logPartsWork:    () => appendPartsWork(payload),
      logWorkCosts:    () => appendWorkCosts(payload),
      logNewCustomer:  () => appendCustomer(payload),
      logInvoice:      () => appendInvoice(payload),
      getEventSummary: () => eventSummary(payload.event),
      getCustomers:    () => customerList(),
    };

    if (!handlers[action]) return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
    return jsonResponse(handlers[action]());
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ── Also keep POST for direct API use ────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { action } = body;
    const handlers = {
      logTableWork:    () => appendTableWork(body),
      logPartsWork:    () => appendPartsWork(body),
      logWorkCosts:    () => appendWorkCosts(body),
      logNewCustomer:  () => appendCustomer(body),
      logInvoice:      () => appendInvoice(body),
      getEventSummary: () => eventSummary(body.event),
      getCustomers:    () => customerList(),
    };
    if (!handlers[action]) return jsonResponse({ ok: false, error: 'Unknown action' });
    return jsonResponse(handlers[action]());
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Appenders — each write to its own event-scoped tab ────────
function appendTableWork(d) {
  const sheet = getSheet(eventSheet(d.event, 'TableWork'), 'TableWork');
  sheet.appendRow([
    d.timestamp || new Date().toISOString(),
    d.loggedBy, d.event, d.organization,
    d.kartNumbers, d.serviceName, d.servicePrice,
    d.paymentMethod, d.paymentStatus, d.notes || '',
  ]);
  return { ok: true };
}

function appendPartsWork(d) {
  const partsStr = Array.isArray(d.parts)
    ? d.parts.map(p => `${p.qty}x ${p.name}`).join(', ')
    : d.parts;
  const sheet = getSheet(eventSheet(d.event, 'PartsWork'), 'PartsWork');
  sheet.appendRow([
    d.timestamp || new Date().toISOString(),
    d.loggedBy, d.event, d.organization,
    d.kartNumber || '', partsStr, d.partsTotal || 0,
    d.paymentMethod, d.paymentStatus, d.notes || '',
  ]);
  return { ok: true };
}

function appendWorkCosts(d) {
  const sheet = getSheet(eventSheet(d.event, 'WorkCosts'), 'WorkCosts');
  sheet.appendRow([
    d.timestamp || new Date().toISOString(),
    d.loggedBy, d.event, d.category,
    parseFloat(d.amount) || 0, d.paidBy,
    d.paymentMethod, d.description || '',
  ]);
  return { ok: true };
}

function appendCustomer(d) {
  // Customers always go to the global Customers tab
  getSheet('Customers').appendRow([
    d.timestamp || new Date().toISOString(),
    d.loggedBy, d.organization, d.homeTrack || '',
    d.firstName, d.lastName, d.title,
    d.phone, d.email || '',
  ]);
  return { ok: true };
}

function appendInvoice(d) {
  const itemsStr = Array.isArray(d.items)
    ? d.items.map(i => `${i.qty}x ${i.desc} @$${i.unit}`).join(' | ')
    : '';
  const sheet = getSheet(eventSheet(d.event, 'Invoices'), 'Invoices');
  sheet.appendRow([
    d.date || new Date().toISOString(),
    d.loggedBy, d.number, d.event,
    d.org, d.contact || '', d.email || '', d.phone || '',
    itemsStr, d.total || 0, d.notes || '',
  ]);
  return { ok: true };
}

// ── Queries ───────────────────────────────────────────────────
function eventSummary(eventName) {
  if (!eventName) return { ok: false, error: 'No event specified' };

  const twRows = getOrEmpty(eventSheet(eventName, 'TableWork'));
  const pwRows = getOrEmpty(eventSheet(eventName, 'PartsWork'));
  const wcRows = getOrEmpty(eventSheet(eventName, 'WorkCosts'));
  const invRows = getOrEmpty(eventSheet(eventName, 'Invoices'));

  const revenue = [
    ...twRows.map(r => parseFloat(r[6]) || 0),
    ...pwRows.map(r => parseFloat(r[6]) || 0),
  ].reduce((s, v) => s + v, 0);

  const costs = wcRows.map(r => parseFloat(r[4]) || 0).reduce((s, v) => s + v, 0);

  const loggerSet = new Set([
    ...twRows.map(r => r[1]),
    ...pwRows.map(r => r[1]),
  ]);

  return {
    ok: true,
    summary: {
      tableWorkCount:  twRows.length,
      partsCount:      pwRows.length,
      revenue,
      costs,
      invoicesPending: invRows.length,
      loggers:         [...loggerSet].filter(Boolean),
    },
  };
}

function customerList() {
  const rows = getOrEmpty('Customers');
  const names = [...new Set(rows.map(r => r[2]).filter(Boolean))].sort();
  return { ok: true, customers: names };
}
