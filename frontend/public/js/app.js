'use strict';

/* =====================================================
   Batloung Farm Distribution System - admin front end
   Talks to the REST API under /api (same server).
   ===================================================== */

const SIZES = ['SMALL', 'MEDIUM', 'LARGE'];
const PROVINCES = ['Gauteng', 'Free State', 'KwaZulu-Natal', 'Western Cape', 'Eastern Cape',
  'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape'];
const view = document.getElementById('view');

/* ---------- small helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => 'M ' + Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const label = (s) => String(s).replace('_', ' ');
const badge = (status) => `<span class="badge ${esc(String(status).toLowerCase())}">${esc(label(status))}</span>`;
const sizeOptions = () => SIZES.map((s) => `<option value="${s}">${s[0] + s.slice(1).toLowerCase()}</option>`).join('');

/* ---------- API ---------- */
/* ---------- login session ---------- */
const TOKEN_KEY = 'batloung_token';
const ADMIN_KEY = 'batloung_admin';
const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } };
const getAdmin = () => { try { return JSON.parse(localStorage.getItem(ADMIN_KEY)) || {}; } catch (e) { return {}; } };
function logout() {
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ADMIN_KEY); } catch (e) { /* ignore */ }
  location.replace('/login.html');
}
// not signed in: go to the login page (the rest of this file then does nothing)
if (!getToken()) location.replace('/login.html');

async function api(path, options = {}) {
  let res;
  const token = getToken();
  try {
    res = await fetch((window.API_BASE || '') + '/api' + path, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...options,
    });
  } catch (e) {
    throw new Error('Cannot reach the back end at ' + (window.API_BASE || 'this site') + '. Start it in another terminal with: npm run dev');
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) { logout(); throw new Error('Your session has ended. Please sign in again.'); }
  if (!res.ok) throw new Error(json.message || `Request failed (${res.status})`);
  return json;
}
const post = (p, body) => api(p, { method: 'POST', body: JSON.stringify(body) });
const put = (p, body) => api(p, { method: 'PUT', body: JSON.stringify(body) });
const del = (p) => api(p, { method: 'DELETE' });

/* ---------- toast + modal ---------- */
function toast(message, type = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast ' + (type === 'error' ? 'error' : '');
  el.textContent = message;
  $('#toast-root').appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

function closeModal() { $('#modal-root').innerHTML = ''; }

function openModal(title, bodyHtml, onSubmit, submitLabel = 'Save', wide = false, onOpen = null) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="overlay">
      <div class="modal ${wide ? 'wide' : ''}">
        <div class="modal-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-close>&times;</button></div>
        <form class="modal-body" novalidate>
          ${bodyHtml}
          <div class="form-error" hidden></div>
          <div class="modal-foot">
            <button type="button" class="btn" data-close>${onSubmit ? 'Cancel' : 'Close'}</button>
            ${onSubmit ? `<button type="submit" class="btn primary">${esc(submitLabel)}</button>` : ''}
          </div>
        </form>
      </div>
    </div>`;
  root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
  root.querySelector('.overlay').addEventListener('mousedown', (e) => { if (e.target.classList.contains('overlay')) closeModal(); });
  const form = root.querySelector('form');
  const errBox = root.querySelector('.form-error');
  if (onOpen) onOpen(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!onSubmit) return closeModal();
    errBox.hidden = true;
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      await onSubmit(Object.fromEntries(new FormData(form)));
      closeModal();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------- view builders ---------- */
const pageHead = (title, subtitle, actions = '') =>
  `<div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div>${actions}</div></div>`;

function table(cols, rows, empty = 'No records yet.') {
  if (!rows || !rows.length) return `<div class="empty">${esc(empty)}</div>`;
  const head = cols.map((c) => `<th class="${c.cls || ''}">${esc(c.h)}</th>`).join('');
  const body = rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.cls || ''}">${c.f(r)}</td>`).join('')}</tr>`).join('');
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function showFormError(form, message) {
  const box = form.querySelector('.form-error');
  box.textContent = message;
  box.hidden = false;
}

/* =====================================================
   PAGES
   ===================================================== */
const pages = {};

/* ---------- Dashboard ---------- */
pages.dashboard = async () => {
  const [sup, ven, low, out] = await Promise.all([
    api('/suppliers'), api('/vendors'), api('/fruits/stock/low'), api('/payments/outstanding'),
  ]);
  const owed = out.data.reduce((s, v) => s + Number(v.outstanding_balance), 0);
  view.innerHTML = pageHead('Dashboard', 'Overview of your distribution business') + `
    <div class="cards">
      <div class="stat"><span>Suppliers</span><strong>${sup.data.length}</strong></div>
      <div class="stat"><span>Vendors</span><strong>${ven.data.length}</strong></div>
      <div class="stat ${low.data.length ? 'warn' : ''}"><span>Low-stock items</span><strong>${low.data.length}</strong></div>
      <div class="stat ${owed > 0 ? 'warn' : ''}"><span>Outstanding payments</span><strong>${money(owed)}</strong></div>
    </div>
    <section class="panel"><h2>Low stock alerts</h2>
      ${table([
        { h: 'Fruit', f: (r) => esc(r.fruit_name) },
        { h: 'Packaging', f: (r) => esc(r.packaging_size) },
        { h: 'Available', cls: 'num', f: (r) => `<span class="low">${r.available_quantity}</span>` },
        { h: 'Threshold', cls: 'num', f: (r) => r.low_stock_threshold },
      ], low.data, 'All stock levels are healthy.')}
    </section>
    <section class="panel"><h2>Vendors with outstanding balances</h2>
      ${table([
        { h: 'Vendor', f: (r) => esc(r.vendor_name) },
        { h: 'Phone', f: (r) => esc(r.phone_number) },
        { h: 'Billed', cls: 'num', f: (r) => money(r.total_billed) },
        { h: 'Paid', cls: 'num', f: (r) => money(r.total_paid) },
        { h: 'Outstanding', cls: 'num', f: (r) => `<strong class="low">${money(r.outstanding_balance)}</strong>` },
      ], out.data, 'No vendor owes money.')}
    </section>`;
};

/* ---------- Suppliers ---------- */
function supplierForm(s = {}) {
  return `
    <label>Business name<input name="business_name" value="${esc(s.business_name)}" required></label>
    <label>Contact person<input name="contact_person" value="${esc(s.contact_person)}" required></label>
    <div class="grid-2">
      <label>Phone<input name="phone" value="${esc(s.phone)}" required></label>
      <label>Province
        <select name="province" required>
          ${PROVINCES.map((p) => `<option ${p === s.province ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </label>
    </div>
    <label>Address<input name="address" value="${esc(s.address)}"></label>`;
}

pages.suppliers = async () => {
  const { data } = await api('/suppliers');
  view.innerHTML = pageHead('Suppliers', 'Farms and businesses you buy fruit from',
    '<button class="btn primary" id="add">+ Add supplier</button>') + `
    <section class="panel">${table([
      { h: 'Business', f: (r) => `<strong>${esc(r.business_name)}</strong>` },
      { h: 'Contact', f: (r) => esc(r.contact_person) },
      { h: 'Phone', f: (r) => esc(r.phone) },
      { h: 'Province', f: (r) => esc(r.province) },
      { h: 'Address', f: (r) => esc(r.address) },
      { h: '', cls: 'actions', f: (r) => `<button class="btn small" data-edit="${r.supplier_id}">Edit</button>
          <button class="btn small danger" data-del="${r.supplier_id}">Delete</button>` },
    ], data)}</section>`;

  $('#add').onclick = () => openModal('Add supplier', supplierForm(), async (f) => {
    await post('/suppliers', f);
    toast('Supplier registered');
    pages.suppliers();
  });
  view.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => {
    const s = data.find((x) => x.supplier_id === Number(b.dataset.edit));
    openModal('Edit supplier', supplierForm(s), async (f) => {
      await put('/suppliers/' + s.supplier_id, f);
      toast('Supplier updated');
      pages.suppliers();
    });
  });
  view.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
    if (!confirm('Delete this supplier?')) return;
    try {
      await del('/suppliers/' + b.dataset.del);
      toast('Supplier deleted');
      pages.suppliers();
    } catch (e) { toast(e.message, 'error'); }
  });
};

/* ---------- Fruits & Stock ---------- */
function fruitForm(f = {}, prices = {}, isEdit = false) {
  return `
    <label>Fruit name<input name="fruit_name" value="${esc(f.fruit_name)}" required></label>
    <label>Description<input name="description" value="${esc(f.description)}"></label>
    ${isEdit ? `<label>Status<select name="status">
      <option ${f.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
      <option ${f.status === 'INACTIVE' ? 'selected' : ''}>INACTIVE</option></select></label>` : ''}
    <p style="margin:6px 0;color:var(--muted);font-size:13px">Selling price per box (each size needs a different price)</p>
    <div class="grid-3">
      ${SIZES.map((s) => `<label>${s[0] + s.slice(1).toLowerCase()}
        <input type="number" step="0.01" min="0.01" name="price_${s}" value="${esc(prices[s])}" required></label>`).join('')}
    </div>`;
}

function readFruit(f, isEdit) {
  const body = {
    fruit_name: f.fruit_name,
    description: f.description,
    prices: Object.fromEntries(SIZES.map((s) => [s, Number(f['price_' + s])])),
  };
  if (isEdit) body.status = f.status;
  return body;
}

pages.fruits = async () => {
  const [fr, st, low] = await Promise.all([api('/fruits'), api('/fruits/stock'), api('/fruits/stock/low')]);
  const byFruit = {};
  st.data.forEach((r) => { (byFruit[r.fruit_id] ||= {})[r.packaging_size] = r; });
  const cell = (r, size) => {
    const x = (byFruit[r.fruit_id] || {})[size];
    if (!x) return '-';
    const isLow = x.available_quantity <= x.low_stock_threshold;
    return `<span class="${isLow ? 'low' : ''}">${x.available_quantity} boxes</span><span class="cell-sub">${money(x.selling_price)}</span>`;
  };

  view.innerHTML = pageHead('Fruits & Stock', 'Stock and selling price are tracked separately for each packaging size',
    '<button class="btn primary" id="add">+ Add fruit</button>') + `
    <section class="panel"><h2>Stock by packaging size</h2>
      ${table([
        { h: 'Fruit', f: (r) => `<strong>${esc(r.fruit_name)}</strong><span class="cell-sub">${esc(r.description)}</span>` },
        { h: 'Status', f: (r) => badge(r.status) },
        { h: 'Small', f: (r) => cell(r, 'SMALL') },
        { h: 'Medium', f: (r) => cell(r, 'MEDIUM') },
        { h: 'Large', f: (r) => cell(r, 'LARGE') },
        { h: '', cls: 'actions', f: (r) => `<button class="btn small" data-edit="${r.fruit_id}">Edit</button>
          <button class="btn small danger" data-del="${r.fruit_id}">Delete</button>` },
      ], fr.data)}
    </section>
    <section class="panel"><h2>Low stock (${low.data.length})</h2>
      ${table([
        { h: 'Fruit', f: (r) => esc(r.fruit_name) },
        { h: 'Packaging', f: (r) => esc(r.packaging_size) },
        { h: 'Available', cls: 'num', f: (r) => `<span class="low">${r.available_quantity}</span>` },
        { h: 'Threshold', cls: 'num', f: (r) => r.low_stock_threshold },
      ], low.data, 'No low-stock items.')}
    </section>`;

  $('#add').onclick = () => openModal('Add fruit', fruitForm(), async (f) => {
    await post('/fruits', readFruit(f, false));
    toast('Fruit registered');
    pages.fruits();
  });
  view.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => {
    const fruit = fr.data.find((x) => x.fruit_id === Number(b.dataset.edit));
    const prices = {};
    SIZES.forEach((s) => { prices[s] = ((byFruit[fruit.fruit_id] || {})[s] || {}).selling_price; });
    openModal('Edit fruit', fruitForm(fruit, prices, true), async (f) => {
      await put('/fruits/' + fruit.fruit_id, readFruit(f, true));
      toast('Fruit updated');
      pages.fruits();
    });
  });
  view.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
    const fruit = fr.data.find((x) => x.fruit_id === Number(b.dataset.del));
    if (!confirm(`Delete fruit "${fruit ? fruit.fruit_name : ''}"? This cannot be undone.`)) return;
    try {
      await del('/fruits/' + b.dataset.del);
      toast('Fruit deleted');
      pages.fruits();
    } catch (e) { toast(e.message, 'error'); }
  });
};

/* ---------- Vendors + map (Leaflet / OpenStreetMap) ---------- */
const DEFAULT_CENTER = [-29.3167, 27.4833]; // Maseru
const mapReady = () => typeof L !== 'undefined';
let mainMap = null;        // destroyed and rebuilt each time the Vendors page renders
let focusVendorId = null;  // vendor to highlight on the map after add / edit

const MAP_UNAVAILABLE = '<div class="empty">The map could not load. Check your internet connection and refresh.</div>';

function pinIcon(color) {
  return L.divIcon({
    className: 'pin',
    html: `<span style="background:${color}"></span>`,
    iconSize: [26, 26], iconAnchor: [13, 28], popupAnchor: [0, -26],
  });
}

function newMap(el, center = DEFAULT_CENTER, zoom = 12) {
  const map = L.map(el).setView(center, zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  setTimeout(() => map.invalidateSize(), 150);
  return map;
}

// Turn a place name into coordinates (OpenStreetMap Nominatim, limited to Lesotho)
async function geocode(query) {
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ls&q=' + encodeURIComponent(query);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Place search failed. Click the map to set the location instead.');
  const rows = await res.json();
  return rows.length ? { lat: Number(rows[0].lat), lng: Number(rows[0].lon) } : null;
}

async function geocodeLocation(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const hit = await geocode(t);
  if (hit) return hit;
  await new Promise((r) => setTimeout(r, 1100)); // be polite: max 1 request per second
  return geocode(`${t}, Maseru`);
}

// Ask the browser for the user's current position
function locate(onFound) {
  if (!navigator.geolocation) return toast('Your browser does not support location.', 'error');
  navigator.geolocation.getCurrentPosition(
    (p) => onFound(p.coords.latitude, p.coords.longitude),
    () => toast('Could not get your location. Allow location access, or click the map instead.', 'error'),
    { enableHighAccuracy: true, timeout: 10000 });
}

const fmtDuration = (min) => {
  const m = Math.round(min);
  if (m < 1) return '< 1 min';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
};

function vendorForm(v = {}) {
  return `
    <label>Vendor name<input name="vendor_name" value="${esc(v.vendor_name)}" required></label>
    <label>Phone number<input name="phone_number" value="${esc(v.phone_number)}" required></label>
    <label>Location (area or address)<input name="location" value="${esc(v.location)}" required></label>
    <div class="picker-tools">
      <button type="button" class="btn small" data-find>Find on map</button>
      <button type="button" class="btn small" data-me>Use my current location</button>
      <span class="hint" style="margin:0">or click the map / drag the pin to choose the exact spot</span>
    </div>
    <div class="map small picker-map"></div>
    <div class="grid-2">
      <label>Latitude<input name="latitude" type="number" step="any" min="-90" max="90" value="${esc(v.latitude)}"></label>
      <label>Longitude<input name="longitude" type="number" step="any" min="-180" max="180" value="${esc(v.longitude)}"></label>
    </div>`;
}

// Builds the location picker inside the add / edit vendor modal
function initVendorPicker(form, v = {}) {
  const mapEl = form.querySelector('.picker-map');
  if (!mapReady()) { mapEl.innerHTML = MAP_UNAVAILABLE; return; }

  const latIn = form.elements.latitude;
  const lngIn = form.elements.longitude;
  const has = v.latitude != null && v.longitude != null;
  const map = newMap(mapEl, has ? [v.latitude, v.longitude] : DEFAULT_CENTER, has ? 15 : 12);
  let marker = null;

  const setPoint = (lat, lng, pan = false) => {
    latIn.value = lat.toFixed(6);
    lngIn.value = lng.toFixed(6);
    if (!marker) {
      marker = L.marker([lat, lng], { draggable: true, icon: pinIcon('#1f5f3b') }).addTo(map);
      marker.on('dragend', () => { const p = marker.getLatLng(); setPoint(p.lat, p.lng); });
    } else {
      marker.setLatLng([lat, lng]);
    }
    if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 15));
  };

  if (has) setPoint(Number(v.latitude), Number(v.longitude));
  map.on('click', (e) => setPoint(e.latlng.lat, e.latlng.lng));

  // typing coordinates moves the pin
  const sync = () => {
    const la = parseFloat(latIn.value);
    const ln = parseFloat(lngIn.value);
    if (Number.isFinite(la) && Number.isFinite(ln)) setPoint(la, ln, true);
  };
  latIn.addEventListener('change', sync);
  lngIn.addEventListener('change', sync);

  form.querySelector('[data-find]').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const hit = await geocodeLocation(form.elements.location.value);
      if (hit) setPoint(hit.lat, hit.lng, true);
      else toast('Could not find that place. Click the map to pin it.', 'error');
    } catch (err) { toast(err.message, 'error'); } finally { btn.disabled = false; }
  };
  form.querySelector('[data-me]').onclick = () => locate((la, ln) => setPoint(la, ln, true));
}

// Build the request body. If no pin was chosen, try to pin the vendor automatically from the location text.
async function vendorPayload(f) {
  const body = {
    vendor_name: f.vendor_name, phone_number: f.phone_number, location: f.location,
    latitude: null, longitude: null,
  };
  let lat = parseFloat(f.latitude);
  let lng = parseFloat(f.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    try {
      const hit = await geocodeLocation(f.location);
      if (hit) { lat = hit.lat; lng = hit.lng; }
    } catch (e) { /* save the vendor anyway, without a pin */ }
  }
  if (Number.isFinite(lat) && Number.isFinite(lng)) { body.latitude = lat; body.longitude = lng; }
  return body;
}

pages.vendors = async () => {
  const [out, vendorsRes] = await Promise.all([api('/payments/outstanding'), api('/vendors')]);
  const all = vendorsRes.data;
  const owed = Object.fromEntries(out.data.map((v) => [v.vendor_id, v.outstanding_balance]));

  view.innerHTML = pageHead('Vendors', 'Street vendors and small retailers you sell to',
    '<button class="btn primary" id="add">+ Add vendor</button>') + `
    <section class="panel">
      <h2>Vendor map and nearest vendors</h2>
      <div class="map-controls">
        <div class="mode-toggle">
          <label><input type="radio" name="mode" value="walking" checked> Walking</label>
          <label><input type="radio" name="mode" value="driving"> Driving</label>
        </div>
        <button class="btn" type="button" id="use-me">Use my current location</button>
        <button class="btn primary" type="button" id="find">Find nearest vendors</button>
      </div>
      <p class="hint" id="origin-text">Click anywhere on the map to set your location (red pin), choose walking or driving, then press Find nearest vendors.</p>
      <div class="map" id="main-map"></div>
      <div id="nearest-results"></div>
    </section>
    <section class="panel">
      <form class="inline-form" id="search-form">
        <label>Search by name or phone<input id="q" placeholder="e.g. Mpho or +26658"></label>
        <button class="btn primary" type="submit">Search</button>
        <button class="btn" type="button" id="clear">Clear</button>
      </form>
    </section>
    <section class="panel" id="vendor-list"></section>`;

  /* ----- vendor table ----- */
  let current = all;
  let showVendorOnMap = () => {};
  const editVendor = (id) => {
    const v = all.find((x) => x.vendor_id === Number(id));
    if (!v) return;
    openModal('Edit vendor', vendorForm(v), async (f) => {
      await put('/vendors/' + v.vendor_id, await vendorPayload(f));
      focusVendorId = v.vendor_id;
      toast('Vendor updated');
      pages.vendors();
    }, 'Save changes', true, (form) => initVendorPicker(form, v));
  };

  const render = (list) => {
    current = list;
    $('#vendor-list').innerHTML = table([
      { h: 'Vendor', f: (r) => `<strong>${esc(r.vendor_name)}</strong>` },
      { h: 'Phone', f: (r) => esc(r.phone_number) },
      { h: 'Location', f: (r) => esc(r.location) },
      { h: 'Registered', f: (r) => fmtDate(r.registration_date) },
      { h: 'Owes', cls: 'num', f: (r) => (owed[r.vendor_id] > 0 ? `<span class="low">${money(owed[r.vendor_id])}</span>` : money(0)) },
      { h: 'Map', f: (r) => (r.latitude != null
          ? `<button class="btn small" data-show="${r.vendor_id}">Show</button>`
          : '<span class="cell-sub">No pin</span>') },
      { h: '', cls: 'actions', f: (r) => `<button class="btn small" data-edit="${r.vendor_id}">Edit</button>
          <button class="btn small danger" data-del="${r.vendor_id}">Delete</button>` },
    ], list, 'No vendors found.');
    view.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => editVendor(b.dataset.edit));
    view.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      const v = all.find((x) => x.vendor_id === Number(b.dataset.del));
      if (!confirm(`Delete vendor "${v ? v.vendor_name : ''}"? This cannot be undone.`)) return;
      try {
        await del('/vendors/' + b.dataset.del);
        toast('Vendor deleted');
        pages.vendors();
      } catch (e) { toast(e.message, 'error'); }
    });
    view.querySelectorAll('[data-show]').forEach((b) => b.onclick = () => showVendorOnMap(b.dataset.show));
  };
  render(all);

  $('#search-form').onsubmit = async (e) => {
    e.preventDefault();
    const q = $('#q').value.trim();
    try {
      render(q ? (await api('/vendors/search?q=' + encodeURIComponent(q))).data : all);
    } catch (err) { toast(err.message, 'error'); }
  };
  $('#clear').onclick = () => { $('#q').value = ''; render(all); };

  $('#add').onclick = () => openModal('Add vendor', vendorForm(), async (f) => {
    const body = await vendorPayload(f);
    const res = await post('/vendors', body);
    focusVendorId = res.vendor_id;
    toast(body.latitude !== null
      ? 'Vendor registered and pinned on the map'
      : 'Vendor registered, but no map pin yet. Edit the vendor to set one.');
    pages.vendors();
  }, 'Save vendor', true, (form) => initVendorPicker(form));

  /* ----- main map ----- */
  if (mainMap) { try { mainMap.remove(); } catch (e) { /* already gone */ } mainMap = null; }
  const mapEl = $('#main-map');
  if (!mapReady()) {
    mapEl.innerHTML = MAP_UNAVAILABLE;
    $('#find').onclick = () => toast('The map is not available.', 'error');
    $('#use-me').onclick = () => toast('The map is not available.', 'error');
    return;
  }

  mainMap = newMap(mapEl);
  const markers = {};
  const points = [];
  let origin = null;
  let originMarker = null;
  let routeLayer = null;

  const popupHtml = (v) => `<strong>${esc(v.vendor_name)}</strong><br>${esc(v.phone_number)}<br>${esc(v.location)}<br>
    <button class="btn small" data-edit-vendor="${v.vendor_id}" style="margin-top:6px">Edit vendor</button>`;

  all.forEach((v) => {
    if (v.latitude == null || v.longitude == null) return;
    const m = L.marker([v.latitude, v.longitude], { icon: pinIcon('#1f5f3b') }).addTo(mainMap).bindPopup(popupHtml(v));
    m.on('popupopen', (e) => {
      const b = e.popup.getElement().querySelector('[data-edit-vendor]');
      if (b) b.onclick = () => editVendor(b.dataset.editVendor);
    });
    markers[v.vendor_id] = m;
    points.push([v.latitude, v.longitude]);
  });
  if (points.length) mainMap.fitBounds(points, { padding: [40, 40], maxZoom: 15 });

  showVendorOnMap = (id) => {
    const m = markers[id];
    if (!m) return;
    mainMap.setView(m.getLatLng(), 16);
    m.openPopup();
    mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // after adding / editing a vendor, zoom to that vendor's pin
  if (focusVendorId && markers[focusVendorId]) {
    mainMap.setView(markers[focusVendorId].getLatLng(), 15);
    markers[focusVendorId].openPopup();
  }
  focusVendorId = null;

  /* ----- "you are here" pin ----- */
  const setOrigin = (lat, lng, pan = false) => {
    origin = { lat, lng };
    if (!originMarker) {
      originMarker = L.marker([lat, lng], { draggable: true, icon: pinIcon('#d6452f'), zIndexOffset: 1000 })
        .addTo(mainMap).bindTooltip('You are here');
      originMarker.on('dragend', () => { const p = originMarker.getLatLng(); setOrigin(p.lat, p.lng); });
    } else {
      originMarker.setLatLng([lat, lng]);
    }
    $('#origin-text').textContent =
      `Your location: ${lat.toFixed(5)}, ${lng.toFixed(5)}. Drag the red pin or click the map to change it.`;
    if (pan) mainMap.setView([lat, lng], Math.max(mainMap.getZoom(), 14));
  };
  mainMap.on('click', (e) => setOrigin(e.latlng.lat, e.latlng.lng));
  $('#use-me').onclick = () => locate((la, ln) => setOrigin(la, ln, true));

  /* ----- nearest vendors ----- */
  const drawRoute = (v, mode) => {
    if (routeLayer) mainMap.removeLayer(routeLayer);
    routeLayer = L.polyline(v.geometry, {
      color: mode === 'walking' ? '#e8a33d' : '#1f5f3b',
      weight: 5, opacity: 0.85, dashArray: v.routing === 'estimated' ? '8 8' : null,
    }).addTo(mainMap);
    mainMap.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
    if (markers[v.vendor_id]) markers[v.vendor_id].openPopup();
    mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const renderNearest = (data) => {
    const box = $('#nearest-results');
    if (routeLayer) { mainMap.removeLayer(routeLayer); routeLayer = null; }
    if (!data.vendors.length) {
      box.innerHTML = '<div class="empty">No vendors have a map pin yet. Edit a vendor to set one.</div>';
      return;
    }
    const verb = data.mode === 'walking' ? 'walk' : 'drive';
    const rows = data.vendors.map((v, i) => ({ ...v, rank: i + 1 }));
    const note = data.routing_source === 'road' ? '' :
      '<p class="hint">The road routing service could not be reached for some results, so those distances are estimated (straight line plus a detour allowance, shown as a dashed line).</p>';
    box.innerHTML = `<h3 class="sub">Nearest vendors by ${data.mode === 'walking' ? 'walking' : 'driving'}</h3>${note}` + table([
      { h: '#', f: (r) => r.rank },
      { h: 'Vendor', f: (r) => `<strong>${esc(r.vendor_name)}</strong><span class="cell-sub">${esc(r.location)}</span>` },
      { h: 'Phone', f: (r) => esc(r.phone_number) },
      { h: 'Distance', cls: 'num', f: (r) => `${r.distance_km} km` },
      { h: 'Time', cls: 'num', f: (r) => `${fmtDuration(r.duration_min)} ${verb}` },
      { h: '', cls: 'actions', f: (r) => `<button class="btn small" data-route="${r.vendor_id}">Show route</button>` },
    ], rows);
    box.querySelectorAll('[data-route]').forEach((b) => b.onclick = () =>
      drawRoute(rows.find((x) => x.vendor_id === Number(b.dataset.route)), data.mode));
    drawRoute(rows[0], data.mode);
  };

  $('#find').onclick = async () => {
    if (!origin) return toast('Click the map (or use your current location) to set where you are first.', 'error');
    const mode = view.querySelector('input[name=mode]:checked').value;
    const btn = $('#find');
    btn.disabled = true;
    btn.textContent = 'Searching...';
    try {
      const { data } = await api(`/vendors/nearest?lat=${origin.lat}&lng=${origin.lng}&mode=${mode}&limit=5`);
      renderNearest(data);
    } catch (err) { toast(err.message, 'error'); } finally {
      btn.disabled = false;
      btn.textContent = 'Find nearest vendors';
    }
  };
};

/* ---------- Purchases ---------- */
pages.purchases = async () => {
  const [sup, fr, hist] = await Promise.all([api('/suppliers'), api('/fruits?status=ACTIVE'), api('/purchases')]);
  const fruitOpts = fr.data.map((f) => `<option value="${f.fruit_id}">${esc(f.fruit_name)}</option>`).join('');

  view.innerHTML = pageHead('Purchases', 'Record fruit bought from suppliers. Stock increases automatically.') + `
    <section class="panel"><h2>Record a purchase</h2>
      <form id="purchase-form" novalidate>
        <label>Supplier
          <select name="supplier_id" required>
            <option value="">Select supplier...</option>
            ${sup.data.map((s) => `<option value="${s.supplier_id}">${esc(s.business_name)} (${esc(s.province)})</option>`).join('')}
          </select>
        </label>
        <div id="items"></div>
        <button type="button" class="btn" id="add-item">+ Add fruit item</button>
        <div class="total-bar">Total cost: <strong id="total">${money(0)}</strong></div>
        <div class="form-error" hidden></div>
        <div class="form-actions"><button class="btn primary" type="submit">Record purchase</button></div>
      </form>
    </section>
    <section class="panel"><h2>Purchase history</h2>
      ${table([
        { h: '#', f: (r) => r.purchase_id },
        { h: 'Date', f: (r) => fmtDateTime(r.purchase_date) },
        { h: 'Supplier', f: (r) => esc(r.business_name) },
        { h: 'Total', cls: 'num', f: (r) => money(r.total_amount) },
      ], hist.data)}
    </section>`;

  const itemsBox = $('#items');
  const addRow = () => {
    const d = document.createElement('div');
    d.className = 'item-row purchase';
    d.innerHTML = `
      <select class="f-fruit">${fruitOpts}</select>
      <select class="f-size">${sizeOptions()}</select>
      <input class="f-qty" type="number" min="1" step="1" placeholder="Boxes">
      <input class="f-cost" type="number" min="0.01" step="0.01" placeholder="Unit cost">
      <button type="button" class="icon-btn" title="Remove">&times;</button>`;
    d.querySelector('button').onclick = () => { d.remove(); recalc(); };
    itemsBox.appendChild(d);
  };
  const readItems = () => [...itemsBox.querySelectorAll('.item-row')].map((r) => ({
    fruit_id: Number(r.querySelector('.f-fruit').value),
    packaging_size: r.querySelector('.f-size').value,
    quantity: Number(r.querySelector('.f-qty').value),
    unit_cost: Number(r.querySelector('.f-cost').value),
  }));
  const recalc = () => {
    $('#total').textContent = money(readItems().reduce((s, i) => s + i.quantity * i.unit_cost, 0));
  };
  itemsBox.addEventListener('input', recalc);
  $('#add-item').onclick = addRow;
  addRow();

  $('#purchase-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    form.querySelector('.form-error').hidden = true;
    try {
      const res = await post('/purchases', {
        supplier_id: Number(form.elements.supplier_id.value),
        items: readItems(),
      });
      toast(`Purchase #${res.purchase_id} recorded: ${money(res.total_amount)}`);
      pages.purchases();
    } catch (err) { showFormError(form, err.message); }
  };
};

/* ---------- Sales ---------- */
pages.sales = async () => {
  const [ven, fr, st, hist] = await Promise.all([
    api('/vendors'), api('/fruits?status=ACTIVE'), api('/fruits/stock'), api('/sales'),
  ]);
  const stock = {};
  st.data.forEach((r) => { stock[`${r.fruit_id}-${r.packaging_size}`] = r; });
  const fruitOpts = fr.data.map((f) => `<option value="${f.fruit_id}">${esc(f.fruit_name)}</option>`).join('');

  view.innerHTML = pageHead('Sales', 'Record sales to vendors. Prices come from the system and stock reduces automatically.') + `
    <section class="panel"><h2>Record a sale</h2>
      <form id="sale-form" novalidate>
        <label>Vendor
          <select name="vendor_id" required>
            <option value="">Select vendor...</option>
            ${ven.data.map((v) => `<option value="${v.vendor_id}">${esc(v.vendor_name)} (${esc(v.phone_number)})</option>`).join('')}
          </select>
        </label>
        <div id="items"></div>
        <button type="button" class="btn" id="add-item">+ Add fruit item</button>
        <div class="total-bar">Sale total: <strong id="total">${money(0)}</strong></div>
        <div class="grid-2">
          <label>Amount paid now (leave 0 for credit)<input name="pay_amount" type="number" min="0" step="0.01" value="0"></label>
          <label>Payment method
            <select name="pay_method"><option value="CASH">Cash</option><option value="MOBILE_MONEY">Mobile money</option></select>
          </label>
        </div>
        <div class="form-error" hidden></div>
        <div class="form-actions"><button class="btn primary" type="submit">Record sale</button></div>
      </form>
    </section>
    <section class="panel"><h2>Sales history</h2>
      ${table([
        { h: '#', f: (r) => r.sale_id },
        { h: 'Date', f: (r) => fmtDateTime(r.sale_date) },
        { h: 'Vendor', f: (r) => esc(r.vendor_name) },
        { h: 'Total', cls: 'num', f: (r) => money(r.total_amount) },
        { h: 'Paid', cls: 'num', f: (r) => money(r.amount_paid) },
        { h: 'Outstanding', cls: 'num', f: (r) => money(r.outstanding_balance) },
        { h: 'Status', f: (r) => badge(r.payment_status) },
        { h: '', cls: 'actions', f: (r) => `<button class="btn small" data-view="${r.sale_id}">Details</button>` },
      ], hist.data)}
    </section>`;

  const itemsBox = $('#items');
  const addRow = () => {
    const d = document.createElement('div');
    d.className = 'item-row sale';
    d.innerHTML = `
      <select class="f-fruit">${fruitOpts}</select>
      <select class="f-size">${sizeOptions()}</select>
      <input class="f-qty" type="number" min="1" step="1" placeholder="Boxes">
      <span class="item-info"></span>
      <button type="button" class="icon-btn" title="Remove">&times;</button>`;
    d.querySelector('button').onclick = () => { d.remove(); recalc(); };
    itemsBox.appendChild(d);
    recalc();
  };
  const readItems = () => [...itemsBox.querySelectorAll('.item-row')].map((r) => ({
    fruit_id: Number(r.querySelector('.f-fruit').value),
    packaging_size: r.querySelector('.f-size').value,
    quantity: Number(r.querySelector('.f-qty').value),
  }));
  const recalc = () => {
    let total = 0;
    itemsBox.querySelectorAll('.item-row').forEach((r) => {
      const s = stock[`${r.querySelector('.f-fruit').value}-${r.querySelector('.f-size').value}`];
      const qty = Number(r.querySelector('.f-qty').value);
      const info = r.querySelector('.item-info');
      if (!s) { info.textContent = 'Not available'; return; }
      total += qty * s.selling_price;
      info.innerHTML = `${money(s.selling_price)} per box &middot; ${s.available_quantity} in stock` +
        (qty > s.available_quantity ? ' <span class="low">(not enough stock)</span>' : '');
    });
    $('#total').textContent = money(total);
  };
  itemsBox.addEventListener('input', recalc);
  itemsBox.addEventListener('change', recalc);
  $('#add-item').onclick = addRow;
  addRow();

  $('#sale-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    form.querySelector('.form-error').hidden = true;
    const body = { vendor_id: Number(form.elements.vendor_id.value), items: readItems() };
    const paid = Number(form.elements.pay_amount.value);
    if (paid > 0) body.payment = { amount: paid, method: form.elements.pay_method.value };
    try {
      const res = await post('/sales', body);
      toast(`Sale #${res.sale_id} recorded`);
      openModal(`Sale #${res.sale_id} recorded`, receiptHtml(res), null, '', true);
      pages.sales();
    } catch (err) { showFormError(form, err.message); }
  };

  view.querySelectorAll('[data-view]').forEach((b) => b.onclick = async () => {
    try {
      const { data } = await api('/sales/' + b.dataset.view);
      openModal(`Sale #${data.sale_id} - ${data.vendor_name}`, receiptHtml({
        items: data.items.map((i) => ({ fruit: i.fruit_name, ...i })),
        total_amount: data.total_amount, amount_paid: data.amount_paid,
        outstanding_balance: data.total_amount - data.amount_paid, payment_status: data.payment_status,
      }), null, '', true);
    } catch (err) { toast(err.message, 'error'); }
  });
};

function receiptHtml(r) {
  return table([
    { h: 'Fruit', f: (i) => esc(i.fruit) },
    { h: 'Packaging', f: (i) => esc(i.packaging_size) },
    { h: 'Boxes', cls: 'num', f: (i) => i.quantity },
    { h: 'Unit price', cls: 'num', f: (i) => money(i.unit_price) },
    { h: 'Line total', cls: 'num', f: (i) => money(i.line_total) },
  ], r.items) + `
    <div class="total-bar">Total: <strong>${money(r.total_amount)}</strong></div>
    <p>Paid: <strong>${money(r.amount_paid)}</strong> &middot; Outstanding: <strong>${money(r.outstanding_balance)}</strong> &middot; ${badge(r.payment_status)}</p>`;
}

/* ---------- Payments ---------- */
pages.payments = async () => {
  const [out, sales] = await Promise.all([api('/payments/outstanding'), api('/sales')]);
  const unpaid = sales.data.filter((s) => Number(s.outstanding_balance) > 0);

  view.innerHTML = pageHead('Payments', 'Collect payments on credit sales and track outstanding balances') + `
    <section class="panel"><h2>Record a payment</h2>
      <form id="pay-form" novalidate>
        <div class="grid-3">
          <label>Sale
            <select name="sale_id" required>
              <option value="">Select unpaid sale...</option>
              ${unpaid.map((s) => `<option value="${s.sale_id}">#${s.sale_id} - ${esc(s.vendor_name)} (owes ${money(s.outstanding_balance)})</option>`).join('')}
            </select>
          </label>
          <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required></label>
          <label>Method
            <select name="method"><option value="CASH">Cash</option><option value="MOBILE_MONEY">Mobile money</option></select>
          </label>
        </div>
        <div class="form-error" hidden></div>
        <div class="form-actions"><button class="btn primary" type="submit">Record payment</button></div>
      </form>
    </section>
    <section class="panel"><h2>Outstanding balance per vendor</h2>
      ${table([
        { h: 'Vendor', f: (r) => esc(r.vendor_name) },
        { h: 'Phone', f: (r) => esc(r.phone_number) },
        { h: 'Billed', cls: 'num', f: (r) => money(r.total_billed) },
        { h: 'Paid', cls: 'num', f: (r) => money(r.total_paid) },
        { h: 'Outstanding', cls: 'num', f: (r) => `<strong class="low">${money(r.outstanding_balance)}</strong>` },
      ], out.data, 'No vendor owes money.')}
    </section>
    <section class="panel"><h2>Sales with unpaid balances</h2>
      ${table([
        { h: '#', f: (r) => r.sale_id },
        { h: 'Date', f: (r) => fmtDate(r.sale_date) },
        { h: 'Vendor', f: (r) => esc(r.vendor_name) },
        { h: 'Total', cls: 'num', f: (r) => money(r.total_amount) },
        { h: 'Outstanding', cls: 'num', f: (r) => money(r.outstanding_balance) },
        { h: 'Status', f: (r) => badge(r.payment_status) },
      ], unpaid, 'Every sale is fully paid.')}
    </section>`;

  $('#pay-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    form.querySelector('.form-error').hidden = true;
    try {
      const res = await post('/payments', {
        sale_id: Number(form.elements.sale_id.value),
        amount: Number(form.elements.amount.value),
        method: form.elements.method.value,
      });
      toast(`Payment recorded. Status: ${label(res.payment_status)}`);
      pages.payments();
    } catch (err) { showFormError(form, err.message); }
  };
};

/* ---------- Reports ---------- */
pages.reports = async () => {
  const now = new Date();
  const iso = (d) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
  const from = iso(new Date(now.getFullYear(), now.getMonth(), 1));
  const to = iso(now);

  const [top, vendor, stock] = await Promise.all([
    api('/reports/top-fruits'), api('/reports/top-vendor'), api('/reports/stock'),
  ]);

  view.innerHTML = pageHead('Reports', 'Sales and stock summaries') + `
    <div class="report-grid">
      <section class="panel"><h2>Five most frequently sold fruits</h2>
        ${table([
          { h: 'Fruit', f: (r) => esc(r.fruit_name) },
          { h: 'Boxes sold', cls: 'num', f: (r) => r.boxes_sold },
        ], top.data, 'No sales yet.')}
      </section>
      <section class="panel"><h2>Vendor with the most boxes</h2>
        ${vendor.data
          ? `<div class="big-number">${esc(vendor.data.vendor_name)}</div><p>${vendor.data.total_boxes} boxes purchased</p>`
          : '<div class="empty">No sales yet.</div>'}
      </section>
      <section class="panel"><h2>Revenue for a date range</h2>
        <form class="inline-form" id="rev-form">
          <label>From<input type="date" name="from" value="${from}" required></label>
          <label>To<input type="date" name="to" value="${to}" required></label>
          <button class="btn primary" type="submit">Calculate</button>
        </form>
        <div class="big-number" id="rev-out">-</div>
      </section>
      <section class="panel"><h2>Current stock levels</h2>
        ${table([
          { h: 'Fruit', f: (r) => esc(r.fruit_name) },
          { h: 'Packaging', f: (r) => esc(r.packaging_size) },
          { h: 'Available', cls: 'num', f: (r) => r.available_quantity },
        ], stock.data)}
      </section>
    </div>`;

  const loadRevenue = async (f, t) => {
    try {
      const res = await api(`/reports/revenue?from=${f}&to=${t}`);
      $('#rev-out').textContent = money(res.data.total_revenue);
    } catch (err) { toast(err.message, 'error'); }
  };
  $('#rev-form').onsubmit = (e) => {
    e.preventDefault();
    loadRevenue(e.target.elements.from.value, e.target.elements.to.value);
  };
  loadRevenue(from, to);
};

/* =====================================================
   Router
   ===================================================== */
async function route() {
  if (!getToken()) return; // redirecting to the login page
  const page = location.hash.slice(1) || 'dashboard';
  const fn = pages[page] || pages.dashboard;
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.page === page));
  view.innerHTML = '<div class="loading">Loading...</div>';
  closeModal();
  try {
    await fn();
  } catch (e) {
    view.innerHTML = `<div class="alert error"><strong>Something went wrong:</strong> ${esc(e.message)}</div>`;
  }
}
window.addEventListener('hashchange', route);

// signed-in user and Sign out button in the sidebar
const userBox = document.getElementById('user-name');
if (userBox) userBox.textContent = getAdmin().full_name || getAdmin().username || 'Administrator';
const logoutBtn = document.getElementById('logout');
if (logoutBtn) logoutBtn.onclick = () => { if (confirm('Sign out?')) logout(); };

route();
