/**
 * hackFatura | PCJ — Google Sheets API
 * Talks to the deployed Google Apps Script web app.
 * Uses GET with URL params — Apps Script returns JSON with CORS headers.
 */

async function sheetsPost(action, payload) {
  const url = PCJ.SHEETS_SCRIPT_URL;
  if (url.includes('YOUR_SCRIPT_ID')) {
    console.log('[DEV MODE] sheetsPost:', action, payload);
    return { ok: true, dev: true };
  }
  try {
    const params = new URLSearchParams({
      action,
      payload: JSON.stringify(payload),
    });
    const res = await fetch(`${url}?${params}`, {
      method: 'GET',
      redirect: 'follow',
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[Sheets Error]', err);
    throw err;
  }
}

async function logTableWork(data) {
  return sheetsPost('logTableWork', data);
}

async function logPartsWork(data) {
  return sheetsPost('logPartsWork', data);
}

async function logWorkCosts(data) {
  return sheetsPost('logWorkCosts', data);
}

async function logNewCustomer(data) {
  return sheetsPost('logNewCustomer', data);
}

async function logInvoice(data) {
  return sheetsPost('logInvoice', data);
}

async function getEventSummary(eventName) {
  return sheetsPost('getEventSummary', { event: eventName });
}

async function getCustomers() {
  return sheetsPost('getCustomers', {});
}

async function loadCustomerDatalist() {
  try {
    const res = await getCustomers();
    if (res && res.customers) {
      const dl = document.getElementById('customerList');
      dl.innerHTML = '';
      res.customers.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        dl.appendChild(opt);
      });
    }
  } catch (_) { /* offline — skip */ }
}
