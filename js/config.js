/**
 * hackFatura | PCJ — Config
 * Update SHEETS_SCRIPT_URL after deploying Google Apps Script.
 */

const PCJ = {
  // ── Version (single source of truth) ────────────────────────
  version: 'v2.4.1 beta',

  business: {
    name:    'Parazinho Chassis Jig',
    abbr:    'PCJ',
    phone:   '954-366-8641',
    email:   'pcj@gmail.com',
    address: 'USA',
    tagline: 'Fine Tuned Since 2007',
    instagram: '@parazinho_chassis_jig',
  },

  // ── Google Apps Script Web App URL ──────────────────────────
  // After deploying Apps Script, paste the URL here:
  SHEETS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbw4XW2bY7gbIdGRMNdrQTBijlRCbN1_RcPz3jJoBeKWuL5JrDbmrfGDbn0jyMs4yS8A/exec',

  // ── Team members ─────────────────────────────────────────────
  team: ['Wagner', 'Thiago', 'Bebeco', 'Samuel', 'Henrique'],

  // ── Pricing (single source of truth) ────────────────────────
  pricing: {
    fine_tuning:        150,
    significant:        180,
    '2nd_visit':        100,
    '3rd_visit':         50,
    weekend_pack:       350,
    weekend_pack_reg:   300,
    salvage1:           150,
    salvage2:           180,
    salvage3:           210,
    salvage4:           250,
    salvage5:           300,
    inspection:           0,
    // Parts
    Spindle:             40,
    'Column':            30,
    'Axle 30mm':         40,
    'Axle 40mm':         50,
    'Axle 50mm':         60,
  },
};

// ── App state (in-memory, persisted to localStorage) ───────────
const STATE = {
  currentUser:    localStorage.getItem('pcj_user')           || '',
  currentEvent:   localStorage.getItem('pcj_event')          || '',
  events:         JSON.parse(localStorage.getItem('pcj_events')         || '[]'),
  localEntries:   JSON.parse(localStorage.getItem('pcj_local_entries')  || '[]'),
  localCustomers: JSON.parse(localStorage.getItem('pcj_local_customers')|| '[]'),
  kartNumbers:    [],
  parts:          [],
};

function setUser(val) {
  STATE.currentUser = val;
  localStorage.setItem('pcj_user', val);
  if (typeof updateMenuStatus === 'function') updateMenuStatus();
}

function setEvent(val) {
  STATE.currentEvent = val;
  localStorage.setItem('pcj_event', val);
  updateEventBadges();
  if (typeof updateMenuStatus === 'function') updateMenuStatus();
}

function updateEventBadges() {
  document.querySelectorAll('.event-badge').forEach(el => {
    el.textContent = STATE.currentEvent || 'No event selected';
  });
  const sel = document.getElementById('inv_event');
  if (sel && !sel.value) sel.value = STATE.currentEvent;
}

function saveEvents() {
  localStorage.setItem('pcj_events', JSON.stringify(STATE.events));
}

function saveLocalEntry(entry) {
  STATE.localEntries.push({ ...entry, savedAt: new Date().toISOString() });
  localStorage.setItem('pcj_local_entries', JSON.stringify(STATE.localEntries));
}

function saveLocalCustomer(org) {
  if (org && !STATE.localCustomers.includes(org)) {
    STATE.localCustomers.push(org);
    localStorage.setItem('pcj_local_customers', JSON.stringify(STATE.localCustomers));
  }
}
