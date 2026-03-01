/**
 * hackFatura | PCJ — Google Apps Script Backend
 * Deploy as Web App: Execute as Me, Anyone can access.
 * Paste the deployment URL into js/config.js → PCJ.SHEETS_SCRIPT_URL
 *
 * Sheet tabs expected:
 *   Customers | TableWork | PartsWork | WorkCosts | Invoices | Events
 */

const SPREADSHEET_ID = '1_I9kaE7ag1aULPneCB8kwuNksjWzI-EIrkTNXUp_VTQ';

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    setupHeaders(sheet, name);
  }
  return sheet;
}

function setupHeaders(sheet, name) {
  const headers = {
    Customers:  ['Timestamp','LoggedBy','Organization','HomeTrack','FirstName','LastName','Title','Phone','Email'],
    TableWork:  ['Timestamp','LoggedBy','Event','Organization','KartNumbers','ServiceName','ServicePrice','PaymentMethod','PaymentStatus','Notes'],
    PartsWork:  ['Timestamp','LoggedBy','Event','Organization','KartNumber','Parts','PartsTotal','PaymentMethod','PaymentStatus','Notes'],
    WorkCosts:  ['Timestamp','LoggedBy','Event','Category','Amount','PaidBy','PaymentMethod','Description'],
    Invoices:   ['Timestamp','LoggedBy','InvoiceNumber','Event','Organization','Contact','Email','Phone','Items','Total','Notes'],
    Events:     ['Name','Date','Location','CreatedAt'],
  };
  if (headers[name]) {
    sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
    sheet.getRange(1, 1, 1, headers[name].length)
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

// ── Appenders ─────────────────────────────────────────────────
function appendTableWork(d) {
  getSheet('TableWork').appendRow([
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
  getSheet('PartsWork').appendRow([
    d.timestamp || new Date().toISOString(),
    d.loggedBy, d.event, d.organization,
    d.kartNumber || '', partsStr, d.partsTotal || 0,
    d.paymentMethod, d.paymentStatus, d.notes || '',
  ]);
  return { ok: true };
}

function appendWorkCosts(d) {
  getSheet('WorkCosts').appendRow([
    d.timestamp || new Date().toISOString(),
    d.loggedBy, d.event, d.category,
    parseFloat(d.amount) || 0, d.paidBy,
    d.paymentMethod, d.description || '',
  ]);
  return { ok: true };
}

function appendCustomer(d) {
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
  getSheet('Invoices').appendRow([
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

  const tw = getSheet('TableWork').getDataRange().getValues().slice(1);
  const pw = getSheet('PartsWork').getDataRange().getValues().slice(1);
  const wc = getSheet('WorkCosts').getDataRange().getValues().slice(1);

  const twRows = tw.filter(r => r[2] === eventName);
  const pwRows = pw.filter(r => r[2] === eventName);
  const wcRows = wc.filter(r => r[2] === eventName);

  const revenue = [
    ...twRows.map(r => parseFloat(r[6]) || 0),
    ...pwRows.map(r => parseFloat(r[6]) || 0),
  ].reduce((s, v) => s + v, 0);

  const costs = wcRows.map(r => parseFloat(r[4]) || 0).reduce((s, v) => s + v, 0);

  const invoices = getSheet('Invoices').getDataRange().getValues().slice(1);
  const invPending = invoices.filter(r => r[3] === eventName).length;

  const loggerSet = new Set([
    ...twRows.map(r => r[1]),
    ...pwRows.map(r => r[1]),
  ]);

  return {
    ok: true,
    summary: {
      tableWorkCount:   twRows.length,
      partsCount:       pwRows.length,
      revenue,
      costs,
      invoicesPending:  invPending,
      loggers:          [...loggerSet].filter(Boolean),
    },
  };
}

function customerList() {
  const rows = getSheet('Customers').getDataRange().getValues().slice(1);
  const names = [...new Set(rows.map(r => r[2]).filter(Boolean))].sort();
  return { ok: true, customers: names };
}
