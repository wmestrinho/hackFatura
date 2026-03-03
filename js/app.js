/**
 * hackFatura | PCJ — App Logic
 * Navigation, form submissions, kart tags, parts, events, dashboard.
 */

// ── Navigation ────────────────────────────────────────────────
function go(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId)?.classList.add('active');
  updateEventBadges();

  if (viewId === 'eventDashboard') refreshDashboard();
  if (viewId === 'invoiceBuilder') {
    if (document.getElementById('lineItemsList').children.length === 0) addLineItem();
    const invNum = document.getElementById('inv_number');
    if (invNum && !invNum.value) invNum.value = generateInvoiceNumber();
  }
}

// ── Invoice number generator ───────────────────────────────────
function generateInvoiceNumber() {
  const now  = new Date();
  const base = `PCJ-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const todayCount = STATE.localEntries.filter(e =>
    e.type === 'invoice' && e.invoiceNumber && e.invoiceNumber.startsWith(base)
  ).length;
  return `${base}-${String(todayCount + 1).padStart(3, '0')}`;
}

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast${isError ? ' error' : ''}`;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 3500);
}

// ── Events ────────────────────────────────────────────────────
function renderEventSelect() {
  const sel = document.getElementById('currentEvent');
  const current = STATE.currentEvent;
  sel.innerHTML = '<option value="">— Select Event —</option>';
  STATE.events.forEach(ev => {
    const opt = document.createElement('option');
    opt.value = ev.name;
    opt.textContent = ev.name + (ev.date ? ` (${ev.date})` : '');
    if (ev.name === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

function showModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function saveNewEvent() {
  const name = document.getElementById('newEventName').value.trim();
  const date = document.getElementById('newEventDate').value.trim();
  const loc  = document.getElementById('newEventLocation').value.trim();
  if (!name) { toast('Event name required', true); return; }

  STATE.events.push({ name, date, location: loc });
  saveEvents();
  renderEventSelect();
  setEvent(name);
  document.getElementById('currentEvent').value = name;
  closeModal('addEventModal');
  document.getElementById('newEventName').value = '';
  document.getElementById('newEventDate').value = '';
  document.getElementById('newEventLocation').value = '';
  toast(`Event created: ${name}`);
}

// ── Delete event ──────────────────────────────────────────────
function openDeleteEventModal() {
  if (!STATE.currentEvent) { toast('Select an event to delete', true); return; }
  document.getElementById('deleteEventName').textContent = STATE.currentEvent;
  showModal('deleteEventModal');
}

function confirmDeleteEvent() {
  const name = STATE.currentEvent;
  STATE.events = STATE.events.filter(e => e.name !== name);
  STATE.localEntries = STATE.localEntries.filter(e => e.event !== name);
  saveEvents();
  localStorage.setItem('pcj_local_entries', JSON.stringify(STATE.localEntries));
  setEvent('');
  document.getElementById('currentEvent').value = '';
  renderEventSelect();
  closeModal('deleteEventModal');
  toast(`Event deleted: ${name}`);
}

// ── Kart number tags ──────────────────────────────────────────
function addKart() {
  const input = document.getElementById('kartInput');
  const val = input.value.trim();
  if (!val || STATE.kartNumbers.includes(val)) { input.value = ''; return; }
  STATE.kartNumbers.push(val);
  renderKartTags();
  input.value = '';
  input.focus();
}

function removeKart(num) {
  STATE.kartNumbers = STATE.kartNumbers.filter(k => k !== num);
  renderKartTags();
}

function renderKartTags() {
  const list = document.getElementById('kartTags');
  const hidden = document.getElementById('kartNumbersHidden');
  list.innerHTML = STATE.kartNumbers.map(k =>
    `<span class="kart-tag">${k}<span class="remove" onclick="removeKart('${k}')"> ✕</span></span>`
  ).join('');
  hidden.value = STATE.kartNumbers.join(', ');
}

// Allow Enter to add kart number
document.getElementById('kartInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addKart(); }
});

// ── Parts ─────────────────────────────────────────────────────
function addPart() {
  const sel = document.getElementById('partType');
  const qty = parseInt(document.getElementById('partQty').value) || 1;
  const [name, price] = (sel.value || '').split('|');
  if (!name) { toast('Select a part type', true); return; }

  STATE.parts.push({ name, price: parseFloat(price), qty });
  sel.value = '';
  document.getElementById('partQty').value = 1;
  renderParts();
}

function removePart(idx) {
  STATE.parts.splice(idx, 1);
  renderParts();
}

function renderParts() {
  const list = document.getElementById('partsList');
  const hidden = document.getElementById('partsHidden');
  const total = STATE.parts.reduce((s, p) => s + p.price * p.qty, 0);

  list.innerHTML = STATE.parts.map((p, i) =>
    `<div class="part-item">
       <span>${p.qty}x ${p.name}</span>
       <span class="part-price">$${(p.price * p.qty).toFixed(2)}</span>
       <span class="remove" onclick="removePart(${i})">✕</span>
     </div>`
  ).join('');
  hidden.value = JSON.stringify(STATE.parts);
  document.getElementById('partsTotal').textContent = `Total: $${total.toFixed(2)}`;
}

// ── Service price display ─────────────────────────────────────
function updateServicePrice(sel) {
  const [, price] = (sel.value || '').split('|');
  const el = document.getElementById('tablePrice');
  el.textContent = price !== undefined ? `$${price}` : '$—';
}

// ── Form: Table Work ──────────────────────────────────────────
async function submitTableWork(e) {
  e.preventDefault();
  if (!STATE.currentUser) { toast('Select your name first (top right)', true); return; }
  if (!STATE.currentEvent) { toast('Select or create an event first', true); return; }

  const fd   = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  const [serviceName, servicePrice] = (data.serviceType || '').split('|');
  const payload = {
    ...data,
    serviceName,
    servicePrice: parseFloat(servicePrice || 0),
    event:      STATE.currentEvent,
    loggedBy:   STATE.currentUser,
    timestamp:  new Date().toISOString(),
  };

  const localEntry = { type: 'table', event: STATE.currentEvent, org: payload.organization, amount: payload.servicePrice, serviceName: payload.serviceName, loggedBy: STATE.currentUser, paymentStatus: payload.paymentStatus };

  try {
    await logTableWork(payload);
    toast('Table work entry saved ✓');
  } catch (err) {
    toast('Saved locally — Sheets offline', false);
  }
  saveLocalEntry(localEntry);
  saveLocalCustomer(payload.organization);
  e.target.reset();
  STATE.kartNumbers = [];
  renderKartTags();
  document.getElementById('tablePrice').textContent = '$—';
}

// ── Form: Parts Work ──────────────────────────────────────────
async function submitPartsWork(e) {
  e.preventDefault();
  if (!STATE.currentUser) { toast('Select your name first', true); return; }

  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  const payload = {
    ...data,
    parts:     STATE.parts,
    partsTotal: STATE.parts.reduce((s, p) => s + p.price * p.qty, 0),
    event:     STATE.currentEvent,
    loggedBy:  STATE.currentUser,
    timestamp: new Date().toISOString(),
  };

  if (STATE.parts.length === 0) { toast('Add at least one part', true); return; }

  try {
    await logPartsWork(payload);
    toast('Parts entry saved ✓');
  } catch (_) {
    toast('Saved locally — Sheets offline', false);
  }
  saveLocalEntry({ type: 'parts', event: STATE.currentEvent, org: payload.organization, amount: payload.partsTotal, loggedBy: STATE.currentUser, paymentStatus: payload.paymentStatus });
  saveLocalCustomer(payload.organization);
  e.target.reset();
  STATE.parts = [];
  renderParts();
}

// ── Form: Work Costs ──────────────────────────────────────────
async function submitWorkCosts(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  const payload = {
    ...data,
    event:     STATE.currentEvent,
    loggedBy:  STATE.currentUser,
    timestamp: new Date().toISOString(),
  };
  try {
    await logWorkCosts(payload);
    toast('Cost logged ✓');
  } catch (_) {
    toast('Saved locally — Sheets offline', false);
  }
  saveLocalEntry({ type: 'cost', event: STATE.currentEvent, amount: parseFloat(data.amount) || 0, loggedBy: STATE.currentUser });
  e.target.reset();
}

// ── Form: New Customer ────────────────────────────────────────
async function submitNewCustomer(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  const payload = { ...data, loggedBy: STATE.currentUser, timestamp: new Date().toISOString() };
  try {
    await logNewCustomer(payload);
    toast('Customer saved ✓');
  } catch (_) {
    toast('Saved locally — Sheets offline', false);
  }
  saveLocalCustomer(data.organization);
  loadCustomerDatalist();
  e.target.reset();
}

// ── Dashboard ─────────────────────────────────────────────────
function refreshDashboard() {
  if (!STATE.currentEvent) {
    toast('Select an event to see dashboard', true);
    return;
  }
  document.getElementById('dashEventBadge').textContent = STATE.currentEvent;

  const ev      = STATE.currentEvent;
  const entries = STATE.localEntries.filter(e => e.event === ev);
  const twRows  = entries.filter(e => e.type === 'table');
  const pwRows  = entries.filter(e => e.type === 'parts');
  const wcRows  = entries.filter(e => e.type === 'cost');
  const invRows = entries.filter(e => e.type === 'invoice');

  const revenue = [...twRows, ...pwRows].reduce((s, e) => s + (e.amount || 0), 0);
  const costs   = wcRows.reduce((s, e) => s + (e.amount || 0), 0);
  const ops     = [...new Set([...twRows, ...pwRows].map(e => e.loggedBy).filter(Boolean))];

  const revenueRows = [...twRows, ...pwRows];
  const paid    = revenueRows.filter(e => e.paymentStatus === 'PAID').reduce((s, e) => s + (e.amount || 0), 0);
  const pending = revenueRows.filter(e => e.paymentStatus !== 'PAID').reduce((s, e) => s + (e.amount || 0), 0);
  const splitEl = document.getElementById('dash_rev_split');
  if (splitEl) {
    splitEl.innerHTML = revenueRows.length === 0 ? '' :
      pending > 0
        ? `<span class="split-paid">✓ $${paid.toFixed(2)}</span><span class="split-pend">⏳ $${pending.toFixed(2)}</span>`
        : `<span class="split-paid">✓ ALL PAID</span>`;
  }

  document.getElementById('dash_tw').textContent    = twRows.length  || '0';
  document.getElementById('dash_pw').textContent    = pwRows.length  || '0';
  document.getElementById('dash_rev').textContent   = `$${revenue.toFixed(2)}`;
  document.getElementById('dash_costs').textContent = `$${costs.toFixed(2)}`;
  document.getElementById('dash_inv').textContent   = invRows.length || '0';
  document.getElementById('dash_who').textContent   = ops.join(', ') || '—';
  const net = revenue - costs;
  const netEl = document.getElementById('dash_net');
  netEl.textContent   = `$${net.toFixed(2)}`;
  netEl.className     = `dash-value${net < 0 ? ' red' : ' green'}`;
}

// ── Dashboard detail drill-down ───────────────────────────────
function showDashDetail(type) {
  const panel    = document.getElementById('dashDetail');
  const titleEl  = document.getElementById('dashDetailTitle');
  const listEl   = document.getElementById('dashDetailList');

  // Toggle off if already showing this type
  if (panel.dataset.active === type && panel.style.display !== 'none') {
    closeDashDetail();
    return;
  }

  if (!STATE.currentEvent) { toast('Select an event first', true); return; }
  const ev      = STATE.currentEvent;
  const entries = STATE.localEntries.filter(e => e.event === ev);

  const configs = {
    table:   { label: 'TABLE WORK ENTRIES',  rows: entries.filter(e => e.type === 'table') },
    parts:   { label: 'PARTS ENTRIES',       rows: entries.filter(e => e.type === 'parts') },
    revenue: { label: 'REVENUE ENTRIES',     rows: entries.filter(e => e.type === 'table' || e.type === 'parts') },
    costs:   { label: 'OVERHEAD COSTS',      rows: entries.filter(e => e.type === 'cost') },
    invoice: { label: 'INVOICES LOGGED',     rows: entries.filter(e => e.type === 'invoice') },
  };

  const { label, rows } = configs[type] || { label: type, rows: [] };
  const sorted = [...rows].sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));

  titleEl.textContent = `[ ${label} — ${sorted.length} RECORD${sorted.length !== 1 ? 'S' : ''} ]`;
  listEl.innerHTML = sorted.length === 0
    ? '<p class="detail-empty">[ NO RECORDS FOR THIS EVENT ]</p>'
    : sorted.map(r => buildDetailRow(r, type)).join('');

  // Mark active card
  document.querySelectorAll('.dash-card[data-detail]').forEach(c => c.classList.remove('active-detail'));
  document.querySelector(`.dash-card[data-detail="${type}"]`)?.classList.add('active-detail');

  panel.dataset.active = type;
  panel.style.display  = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeDashDetail() {
  const panel = document.getElementById('dashDetail');
  panel.style.display  = 'none';
  panel.dataset.active = '';
  document.querySelectorAll('.dash-card[data-detail]').forEach(c => c.classList.remove('active-detail'));
}

function buildDetailRow(e, type) {
  const dt     = e.savedAt ? new Date(e.savedAt) : null;
  const time   = dt ? dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
  const date   = dt ? dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })    : '—';
  const amt    = `$${(e.amount || 0).toFixed(2)}`;
  const paid   = e.paymentStatus === 'PAID';
  const status = e.paymentStatus
    ? `<span class="detail-status ${paid ? 'status-paid' : 'status-pending'}">${e.paymentStatus}</span>`
    : '';

  const metaBase = `
    <span class="detail-by">${e.loggedBy || '—'}</span>
    <span class="detail-time">${date} ${time}</span>`;

  if (type === 'table') return `
    <div class="detail-row">
      <div class="detail-main">
        <span class="detail-org">${e.org || '—'}</span>
        <span class="detail-info">${e.serviceName || 'Table Work'}</span>
      </div>
      <div class="detail-meta">
        <span class="detail-amount">${amt}</span>
        ${status}${metaBase}
      </div>
    </div>`;

  if (type === 'parts') return `
    <div class="detail-row">
      <div class="detail-main">
        <span class="detail-org">${e.org || '—'}</span>
        <span class="detail-info">Parts &amp; Components</span>
      </div>
      <div class="detail-meta">
        <span class="detail-amount">${amt}</span>
        ${status}${metaBase}
      </div>
    </div>`;

  if (type === 'revenue') {
    const tag  = e.type === 'table' ? 'TW' : 'PW';
    const info = e.type === 'table' ? (e.serviceName || 'Table Work') : 'Parts';
    return `
    <div class="detail-row">
      <div class="detail-main">
        <span class="detail-type-tag">${tag}</span>
        <span class="detail-org">${e.org || '—'}</span>
        <span class="detail-info">${info}</span>
      </div>
      <div class="detail-meta">
        <span class="detail-amount">${amt}</span>
        ${status}${metaBase}
      </div>
    </div>`;
  }

  if (type === 'costs') return `
    <div class="detail-row">
      <div class="detail-main">
        <span class="detail-org">// overhead expense</span>
      </div>
      <div class="detail-meta">
        <span class="detail-amount cost">${amt}</span>
        ${metaBase}
      </div>
    </div>`;

  if (type === 'invoice') return `
    <div class="detail-row">
      <div class="detail-main">
        <span class="detail-inv-num">${e.invoiceNumber || '—'}</span>
        <span class="detail-org">${e.org || '—'}</span>
      </div>
      <div class="detail-meta">
        <span class="detail-amount">${amt}</span>
        ${metaBase}
      </div>
    </div>`;

  return '';
}

// ── Invoice Builder: Dual Mode ────────────────────────────────
function setInvoiceMode(mode) {
  const isEvent = mode === 'event';
  document.getElementById('modeManual').classList.toggle('active', !isEvent);
  document.getElementById('modeEvent').classList.toggle('active', isEvent);
  document.getElementById('eventModePanel').style.display = isEvent ? 'block' : 'none';

  if (isEvent) {
    if (!STATE.currentEvent) { toast('Select an event first to use Event Mode', true); return; }
    const sel = document.getElementById('inv_eventorg');
    const names = [...new Set(STATE.localCustomers)].sort();
    sel.innerHTML = '<option value="">— Select Team —</option>' +
      names.map(n => `<option value="${n}">${n}</option>`).join('');
    document.getElementById('eventEntriesSummary').innerHTML = '';
  }
}

function loadEventEntries(org) {
  if (!org) return;
  if (!STATE.currentEvent) { toast('Select an event first', true); return; }

  const ev = STATE.currentEvent;
  const entries = STATE.localEntries.filter(e =>
    e.event === ev && e.org === org && (e.type === 'table' || e.type === 'parts')
  );

  if (entries.length === 0) {
    document.getElementById('eventEntriesSummary').innerHTML =
      '<p class="entries-none">[ NO TABLE WORK OR PARTS ENTRIES FOUND FOR THIS TEAM IN THE CURRENT EVENT ]</p>';
    toast('No entries found for this team', true);
    return;
  }

  // Pre-fill bill-to and event fields
  document.getElementById('inv_org').value   = org;
  document.getElementById('inv_event').value = ev;

  // Clear existing line items and rebuild from local entries
  document.getElementById('lineItemsList').innerHTML = '';

  const tableEntries = entries.filter(e => e.type === 'table');
  const partsEntries = entries.filter(e => e.type === 'parts');

  tableEntries.forEach(e => {
    addLineItem(e.serviceName || 'Table Work Service', 1, e.amount || 0);
  });
  partsEntries.forEach(e => {
    addLineItem('Parts & Components', 1, e.amount || 0);
  });

  const total = entries.reduce((s, e) => s + (e.amount || 0), 0);
  document.getElementById('eventEntriesSummary').innerHTML = `
    <div class="entries-summary-box">
      <span>⚡ ${tableEntries.length} service + ${partsEntries.length} parts entries loaded</span>
      <span class="entries-total">$${total.toFixed(2)}</span>
    </div>`;

  toast(`${entries.length} entries loaded for ${org}`);
}

// ── Menu status line ──────────────────────────────────────────
function updateMenuStatus() {
  const el = document.getElementById('menuStatusLine');
  if (!el) return;
  const u = STATE.currentUser;
  const e = STATE.currentEvent;
  const now = new Date().toLocaleTimeString('en-US', { hour12: false });
  if (u && e) {
    el.textContent = `[ OPERATOR: ${u.toUpperCase()} // EVENT: ${e.toUpperCase()} // ${now} ]`;
  } else if (u) {
    el.textContent = `[ OPERATOR: ${u.toUpperCase()} // NO EVENT SELECTED ]`;
  } else {
    el.textContent = `[ SELECT OPERATOR AND EVENT TO BEGIN // ${now} ]`;
  }
}

// ── Init ──────────────────────────────────────────────────────
(function init() {
  // Display version from config (single source of truth)
  const vBadge = document.getElementById('versionBadge');
  const vFooter = document.getElementById('footerVersion');
  const vMenu  = document.getElementById('menuVersion');
  if (vBadge)  vBadge.textContent  = PCJ.version;
  if (vFooter) vFooter.textContent = PCJ.version;
  if (vMenu)   vMenu.textContent   = PCJ.version;

  // Restore user selector
  const userSel = document.getElementById('currentUser');
  if (STATE.currentUser) userSel.value = STATE.currentUser;

  // Restore events + selector
  renderEventSelect();
  updateEventBadges();
  updateMenuStatus();

  // Tick clock on menu
  setInterval(updateMenuStatus, 10000);

  // Load customer list from Sheets (non-blocking)
  loadCustomerDatalist();
})();
