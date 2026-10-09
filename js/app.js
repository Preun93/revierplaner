/* Revierplaner – Reviergrenzen und Einrichtungen auf der Karte verwalten.
 * Daten liegen im localStorage des Browsers; Export/Import als GeoJSON. */
(function () {
  'use strict';

  // ---------- Konfiguration ----------
  const TYPES = {
    ansitz: {
      label: 'Ansitzeinrichtung', color: '#2f5bd3',
      icon: '<path d="M8 3h8v6H8z"/><path d="M6.5 9h11"/><path d="M9 9L7 21M15 9l2 12M8.2 15h7.6"/>'
    },
    fuetterung: {
      label: 'Fütterung', color: '#1fae66',
      icon: '<path d="M3 9l9-5 9 5"/><path d="M6 8v12M18 8v12"/><path d="M6 14h12M9 11v3M12 11v3M15 11v3"/>'
    },
    bau: {
      label: 'Bau', color: '#8a5a2b',
      icon: '<path d="M3 19c0-6 4-10 9-10s9 4 9 10"/><path d="M9 19c0-2.2 1.3-4 3-4s3 1.8 3 4"/><path d="M2 19h20"/>'
    },
    falle: {
      label: 'Falle', color: '#e2553f',
      icon: '<path d="M3 9h18v9H3z"/><path d="M7 9v9M11 9v9M15 9v9"/><path d="M18 9l3-4"/>'
    },
    luderplatz: {
      label: 'Luderplatz', color: '#8e44ad',
      icon: '<path d="M8 16l8-8"/><circle cx="6" cy="15" r="2"/><circle cx="9" cy="18" r="2"/><circle cx="15" cy="6" r="2"/><circle cx="18" cy="9" r="2"/>'
    }
  };
  const BOUNDARY_COLOR = '#2ee59d';
  const STORAGE_KEY = 'revierplaner.v1';
  const SETTINGS_KEY = 'revierplaner.settings.v1';

  const BASEMAPS = {
    hybrid: { label: 'Satellit mit Beschriftung' },
    sat: { label: 'Satellit' },
    osm: { label: 'Straßenkarte' },
    topo: { label: 'Topografisch' }
  };

  // ---------- Hilfsfunktionen ----------
  const $ = (id) => document.getElementById(id);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = (inner) => `<svg viewBox="0 0 24 24">${inner}</svg>`;

  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  // Geodätische Fläche eines Rings in m² (wie Leaflet.draw)
  function geodesicArea(latlngs) {
    const R = 6378137, rad = Math.PI / 180;
    let area = 0;
    const n = latlngs.length;
    if (n < 3) return 0;
    for (let i = 0; i < n; i++) {
      const p1 = latlngs[i], p2 = latlngs[(i + 1) % n];
      area += (p2.lng - p1.lng) * rad * (2 + Math.sin(p1.lat * rad) + Math.sin(p2.lat * rad));
    }
    return Math.abs(area * R * R / 2);
  }
  function perimeter(latlngs) {
    let d = 0;
    for (let i = 0; i < latlngs.length; i++) d += latlngs[i].distanceTo(latlngs[(i + 1) % latlngs.length]);
    return d;
  }
  const fmtHa = (m2) => (m2 / 10000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' ha';
  const fmtKm = (m) => (m / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' km';

  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  // ---------- Zustand ----------
  function newRevier(name) {
    return { id: uid(), name: name || 'Mein Revier', grenze: null, punkte: [] };
  }

  let state = storageGet(STORAGE_KEY);
  if (!state || !Array.isArray(state.reviere) || !state.reviere.length) {
    const r = newRevier('Mein Revier');
    state = { reviere: [r], aktivId: r.id };
  }
  if (!state.reviere.some((r) => r.id === state.aktivId)) state.aktivId = state.reviere[0].id;

  const settings = Object.assign(
    { basemap: 'hybrid', labels: true, filter: {} },
    storageGet(SETTINGS_KEY) || {}
  );
  Object.keys(TYPES).forEach((k) => { if (settings.filter[k] === undefined) settings.filter[k] = true; });

  const save = () => {
    if (!storageSet(STORAGE_KEY, state)) toast('Speichern im Browser nicht möglich – bitte exportieren.');
  };
  const saveSettings = () => storageSet(SETTINGS_KEY, settings);
  const aktiv = () => state.reviere.find((r) => r.id === state.aktivId);

  // ---------- Karte ----------
  const map = L.map('map', { zoomControl: false, maxZoom: 21, tap: true }).setView([51.16, 10.45], 6);

  const esriAttr = 'Tiles &copy; Esri, Maxar, Earthstar Geographics';
  const satTiles = () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 19, maxZoom: 21, attribution: esriAttr });
  const layers = {
    sat: satTiles(),
    hybrid: L.layerGroup([
      satTiles(),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 19, maxZoom: 21, opacity: .8 }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 19, maxZoom: 21 })
    ]),
    osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxNativeZoom: 19, maxZoom: 21, attribution: '&copy; OpenStreetMap-Mitwirkende' }),
    topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxNativeZoom: 17, maxZoom: 21, attribution: '&copy; OpenStreetMap-Mitwirkende, SRTM | &copy; OpenTopoMap (CC-BY-SA)' })
  };
  let currentBase = null;
  function setBasemap(key) {
    if (!layers[key]) key = 'hybrid';
    if (currentBase) map.removeLayer(currentBase);
    currentBase = layers[key].addTo(map);
    settings.basemap = key;
    saveSettings();
  }
  setBasemap(settings.basemap);

  map.pm.setLang('de');
  map.pm.setGlobalOptions({
    snappable: false,
    allowSelfIntersection: false,
    pathOptions: { color: BOUNDARY_COLOR, weight: 4, fillOpacity: .06 },
    templineStyle: { color: BOUNDARY_COLOR, weight: 4 },
    hintlineStyle: { color: BOUNDARY_COLOR, dashArray: [6, 6], weight: 3 }
  });

  const grenzeGroup = L.layerGroup().addTo(map);
  const grenzeHandles = L.layerGroup().addTo(map);
  const punkteGroup = L.layerGroup().addTo(map);
  let grenzeLayer = null;
  const markerById = new Map();
  let locationMarker = null;

  function pinIcon(p) {
    const t = TYPES[p.typ] || TYPES.ansitz;
    return L.divIcon({
      className: 'pin',
      html: `<div class="pin-body" style="--c:${t.color}">${svg(t.icon)}</div><div class="pin-label">${esc(p.name)}</div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 53]
    });
  }

  function renderGrenze() {
    grenzeGroup.clearLayers();
    grenzeHandles.clearLayers();
    grenzeLayer = null;
    const r = aktiv();
    if (!r.grenze) return;
    const rings = r.grenze.geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng]));
    grenzeLayer = L.polygon(rings, { color: BOUNDARY_COLOR, weight: 4, fillOpacity: .06, interactive: false });
    grenzeGroup.addLayer(grenzeLayer);
    renderGrenzeHandles();
  }

  // Antippbare Grenzlinie und Eckpunkte – ein Tipp startet die Bearbeitung
  function renderGrenzeHandles() {
    grenzeHandles.clearLayers();
    if (!grenzeLayer) return;
    const onTap = () => {
      if (mode) return;
      deselectPunkt();
      startEditGrenze();
    };
    grenzeLayer.getLatLngs().forEach((ring) => {
      grenzeHandles.addLayer(L.polyline(ring.concat([ring[0]]), { weight: 22, opacity: 0, pmIgnore: true }).on('click', onTap));
      ring.forEach((ll) => grenzeHandles.addLayer(
        L.circleMarker(ll, { radius: 6, weight: 3, color: BOUNDARY_COLOR, fillColor: '#fff', fillOpacity: 1, pmIgnore: true }).on('click', onTap)
      ));
    });
  }

  function renderPunkte() {
    deselectPunkt();
    punkteGroup.clearLayers();
    markerById.clear();
    aktiv().punkte.forEach((p) => {
      if (!settings.filter[p.typ]) return;
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(p), pmIgnore: true, riseOnHover: true });
      m.on('click', () => selectPunkt(p));
      m.on('dragend', () => {
        const ll = m.getLatLng();
        p.lat = ll.lat; p.lng = ll.lng;
        save();
        toast('Position gespeichert');
      });
      punkteGroup.addLayer(m);
      markerById.set(p.id, m);
    });
  }

  function renderAll() {
    $('revierName').textContent = aktiv().name;
    document.title = aktiv().name + ' – Revierplaner';
    document.body.classList.toggle('hide-labels', !settings.labels);
    renderGrenze();
    renderPunkte();
  }

  function fitRevier(animate) {
    const r = aktiv();
    let bounds = null;
    if (grenzeLayer) bounds = grenzeLayer.getBounds();
    else if (r.punkte.length) bounds = L.latLngBounds(r.punkte.map((p) => [p.lat, p.lng]));
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17, animate });
      return true;
    }
    return false;
  }

  // ---------- Bottom-Sheet ----------
  let sheetOnClose = null;
  function openSheet(html, onMount, onClose) {
    closeSheet();
    $('sheetContent').innerHTML = html;
    $('sheet').hidden = false;
    $('sheetBackdrop').hidden = false;
    sheetOnClose = onClose || null;
    if (onMount) onMount($('sheetContent'));
  }
  function closeSheet() {
    if ($('sheet').hidden) return;
    $('sheet').hidden = true;
    $('sheetBackdrop').hidden = true;
    $('sheetContent').innerHTML = '';
    const cb = sheetOnClose;
    sheetOnClose = null;
    if (cb) cb();
  }
  $('sheetBackdrop').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('sheet').hidden) closeSheet();
    else if (mode) cancelMode();
    else deselectPunkt();
  });

  // ---------- Modus (Platzieren / Zeichnen / Bearbeiten / Verschieben) ----------
  let mode = null; // { name, onDone, onCancel }
  function setMode(m) {
    mode = m;
    const banner = $('modeBanner');
    if (!m) {
      banner.hidden = true;
      $('btnAdd').hidden = !!selected;
      map.getContainer().style.cursor = '';
      return;
    }
    deselectPunkt();
    $('modeText').textContent = m.text;
    $('modeDone').hidden = !m.onDone;
    $('modeDone').textContent = m.doneLabel || 'Fertig';
    banner.hidden = false;
    $('btnAdd').hidden = true;
    map.getContainer().style.cursor = m.cursor || '';
  }
  function cancelMode() {
    const m = mode;
    setMode(null);
    if (m && m.onCancel) m.onCancel();
  }
  $('modeCancel').addEventListener('click', cancelMode);
  $('modeDone').addEventListener('click', () => {
    const m = mode;
    if (m && m.onDone && m.onDone() !== false) setMode(null);
  });

  // ---------- Punkte ----------
  function typeGridHtml() {
    return `<div class="type-grid">${Object.entries(TYPES).map(([k, t]) => `
      <button class="type-btn" data-typ="${k}">
        <span class="type-dot" style="--c:${t.color}">${svg(t.icon)}</span>${esc(t.label)}
      </button>`).join('')}</div>`;
  }

  function openAddSheet() {
    openSheet(`<h2>Punkt hinzufügen</h2>${typeGridHtml()}
      <p>Danach auf die Karte tippen, um den Punkt zu setzen.</p>`, (root) => {
      root.querySelectorAll('[data-typ]').forEach((b) => b.addEventListener('click', () => {
        closeSheet();
        startPlace(b.dataset.typ);
      }));
    });
  }

  function startPlace(typ) {
    setMode({ name: 'place', typ, text: `Auf die Karte tippen: ${TYPES[typ].label} setzen`, cursor: 'crosshair' });
  }

  // ---------- Punkt auswählen ----------
  let selected = null; // { p, m }
  function selectPunkt(p) {
    if (mode) return;
    if (selected && selected.p === p) return;
    deselectPunkt();
    const m = markerById.get(p.id);
    if (!m) return;
    selected = { p, m };
    m.getElement().classList.add('selected');
    m.setZIndexOffset(1000);
    m.dragging.enable();
    const t = TYPES[p.typ] || TYPES.ansitz;
    $('selDot').style.setProperty('--c', t.color);
    $('selDot').innerHTML = svg(t.icon);
    $('selName').textContent = p.name || t.label;
    $('selType').textContent = t.label + (p.notiz ? ' · ' + p.notiz : '');
    $('selBar').hidden = false;
    $('btnAdd').hidden = true;
  }
  function deselectPunkt() {
    if (!selected) return;
    const { m } = selected;
    selected = null;
    m.dragging.disable();
    m.setZIndexOffset(0);
    if (m.getElement()) m.getElement().classList.remove('selected');
    $('selBar').hidden = true;
    if (!mode) $('btnAdd').hidden = false;
  }
  $('selClose').addEventListener('click', deselectPunkt);
  $('selEdit').addEventListener('click', () => { if (selected) openPunktEditor(selected.p); });
  $('selDel').addEventListener('click', () => { if (selected) deletePunkt(selected.p); });

  map.on('click', (e) => {
    if (!mode) { deselectPunkt(); return; }
    if (mode.name !== 'place') return;
    const typ = mode.typ;
    setMode(null);
    const nr = aktiv().punkte.filter((p) => p.typ === typ).length + 1;
    openPunktEditor({ id: null, typ, name: `${TYPES[typ].label} ${nr}`, notiz: '', lat: e.latlng.lat, lng: e.latlng.lng });
  });

  function openPunktEditor(p) {
    const isNew = !p.id;
    const opts = Object.entries(TYPES).map(([k, t]) => `<option value="${k}" ${k === p.typ ? 'selected' : ''}>${esc(t.label)}</option>`).join('');
    openSheet(`
      <h2>${isNew ? 'Neuer Punkt' : 'Punkt bearbeiten'}</h2>
      <form id="punktForm">
        <label class="field"><span>Name</span><input name="name" value="${esc(p.name)}" maxlength="80" required></label>
        <label class="field"><span>Art</span><select name="typ">${opts}</select></label>
        <label class="field"><span>Notiz</span><textarea name="notiz" maxlength="1000" placeholder="z. B. Zustand, Ausrichtung, Wildwechsel …">${esc(p.notiz)}</textarea></label>
        <p>${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}</p>
        <div class="btn-row">
          ${isNew ? '' : '<button type="button" class="btn danger" data-a="del">Löschen</button>'}
          <button type="button" class="btn" data-a="cancel">Abbrechen</button>
          <button type="submit" class="btn primary">Speichern</button>
        </div>
      </form>`, (root) => {
      const form = root.querySelector('form');
      if (isNew) form.name.select();
      root.querySelector('[data-a="cancel"]').addEventListener('click', closeSheet);
      const del = root.querySelector('[data-a="del"]');
      if (del) del.addEventListener('click', () => { closeSheet(); deletePunkt(p); });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = { name: form.name.value.trim(), typ: form.typ.value, notiz: form.notiz.value.trim() };
        if (isNew) {
          const np = Object.assign({}, p, data, { id: uid() });
          aktiv().punkte.push(np);
          if (!settings.filter[np.typ]) { settings.filter[np.typ] = true; saveSettings(); }
        } else {
          Object.assign(p, data);
        }
        save();
        closeSheet();
        renderPunkte();
        if (!isNew && markerById.has(p.id)) selectPunkt(p);
        toast(isNew ? 'Punkt gespeichert' : 'Änderungen gespeichert');
      });
    });
  }

  function deletePunkt(p) {
    if (!confirm(`„${p.name || TYPES[p.typ].label}“ wirklich löschen?`)) return;
    const r = aktiv();
    r.punkte = r.punkte.filter((x) => x.id !== p.id);
    save();
    renderPunkte();
    toast('Punkt gelöscht');
  }

  // ---------- Reviergrenze ----------
  function startDraw() {
    if (grenzeLayer) grenzeLayer.setStyle({ opacity: .35 });
    grenzeHandles.clearLayers();
    map.pm.enableDraw('Polygon', { finishOn: null });
    setMode({
      name: 'draw',
      text: 'Eckpunkte der Grenze antippen, ersten Punkt erneut antippen zum Schließen',
      onDone() {
        const d = map.pm.Draw.Polygon;
        const n = d._layer ? d._layer.getLatLngs().length : 0;
        if (n < 3) { toast('Mindestens 3 Eckpunkte setzen'); return false; }
        d._finishShape();
      },
      onCancel() { map.pm.disableDraw(); renderGrenze(); }
    });
  }

  map.on('pm:create', (e) => {
    const gj = e.layer.toGeoJSON();
    e.layer.remove();
    aktiv().grenze = { type: 'Feature', properties: {}, geometry: gj.geometry };
    save();
    if (mode && mode.name === 'draw') setMode(null);
    renderGrenze();
    toast('Reviergrenze gespeichert · ' + fmtHa(geodesicArea(grenzeLayer.getLatLngs()[0])));
  });

  function startEditGrenze() {
    if (!grenzeLayer) return;
    const backup = aktiv().grenze;
    grenzeHandles.clearLayers();
    grenzeLayer.pm.enable({ allowSelfIntersection: false, snappable: false });
    setMode({
      name: 'edit',
      text: 'Eckpunkte ziehen zum Verschieben · kleine Zwischenpunkte ziehen für neue Ecken',
      onDone() {
        grenzeLayer.pm.disable();
        aktiv().grenze = { type: 'Feature', properties: {}, geometry: grenzeLayer.toGeoJSON().geometry };
        save();
        renderGrenze();
        toast('Grenze gespeichert');
      },
      onCancel() { grenzeLayer.pm.disable(); aktiv().grenze = backup; renderGrenze(); }
    });
  }

  function openGrenzeSheet() {
    const r = aktiv();
    if (!r.grenze) { startDraw(); return; }
    const ll = grenzeLayer.getLatLngs()[0];
    openSheet(`
      <h2>Reviergrenze</h2>
      <div class="stats">
        <div class="stat"><b>${fmtHa(geodesicArea(ll))}</b><small>Fläche</small></div>
        <div class="stat"><b>${fmtKm(perimeter(ll))}</b><small>Umfang</small></div>
        <div class="stat"><b>${ll.length}</b><small>Eckpunkte</small></div>
      </div>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn primary" data-a="edit">Bearbeiten</button>
        <button class="btn" data-a="redraw">Neu zeichnen</button>
        <button class="btn danger" data-a="del">Löschen</button>
      </div>`, (root) => {
      root.querySelector('[data-a="edit"]').addEventListener('click', () => { closeSheet(); fitRevier(true); startEditGrenze(); });
      root.querySelector('[data-a="redraw"]').addEventListener('click', () => { closeSheet(); startDraw(); });
      root.querySelector('[data-a="del"]').addEventListener('click', () => {
        if (!confirm('Reviergrenze wirklich löschen?')) return;
        r.grenze = null; save(); closeSheet(); renderGrenze(); toast('Grenze gelöscht');
      });
    });
  }

  // ---------- Reviere verwalten ----------
  function openRevierSheet() {
    const items = state.reviere.map((r) => `
      <li class="${r.id === state.aktivId ? 'current' : ''}">
        <div class="grow"><div class="title">${esc(r.name)}</div>
        <div class="sub">${r.punkte.length} Punkte${r.grenze ? ' · Grenze vorhanden' : ''}</div></div>
        ${r.id === state.aktivId ? '' : `<button class="link" data-switch="${r.id}">Öffnen</button>`}
      </li>`).join('');
    openSheet(`
      <h2>Reviere</h2>
      <ul class="list">${items}</ul>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn primary" data-a="new">Neues Revier</button>
        <button class="btn" data-a="rename">Umbenennen</button>
        <button class="btn danger" data-a="del">Löschen</button>
      </div>`, (root) => {
      root.querySelectorAll('[data-switch]').forEach((b) => b.addEventListener('click', () => {
        state.aktivId = b.dataset.switch; save(); closeSheet(); renderAll();
        if (!fitRevier(true)) toast('Dieses Revier ist noch leer');
      }));
      root.querySelector('[data-a="new"]').addEventListener('click', () => {
        const name = prompt('Name des neuen Reviers:', 'Neues Revier');
        if (!name) return;
        const r = newRevier(name.trim());
        state.reviere.push(r); state.aktivId = r.id; save(); closeSheet(); renderAll();
        toast('Revier angelegt – jetzt Grenze zeichnen');
        startDraw();
      });
      root.querySelector('[data-a="rename"]').addEventListener('click', () => {
        const name = prompt('Neuer Name:', aktiv().name);
        if (!name) return;
        aktiv().name = name.trim(); save(); closeSheet(); renderAll();
      });
      root.querySelector('[data-a="del"]').addEventListener('click', () => {
        if (!confirm(`Revier „${aktiv().name}“ mit allen Punkten löschen?`)) return;
        state.reviere = state.reviere.filter((r) => r.id !== state.aktivId);
        if (!state.reviere.length) state.reviere.push(newRevier('Mein Revier'));
        state.aktivId = state.reviere[0].id; save(); closeSheet(); renderAll(); fitRevier(true);
      });
    });
  }

  // ---------- Info ----------
  function openInfoSheet() {
    const r = aktiv();
    const ll = grenzeLayer ? grenzeLayer.getLatLngs()[0] : null;
    const counts = Object.entries(TYPES).map(([k, t]) => `
      <div class="stat"><b style="color:${t.color}">${r.punkte.filter((p) => p.typ === k).length}</b><small>${esc(t.label)}</small></div>`).join('');
    const list = r.punkte.slice().sort((a, b) => a.typ.localeCompare(b.typ) || a.name.localeCompare(b.name, 'de')).map((p) => {
      const t = TYPES[p.typ] || TYPES.ansitz;
      return `<li><span class="type-dot" style="--c:${t.color}">${svg(t.icon)}</span>
        <div class="grow"><div class="title">${esc(p.name)}</div><div class="sub">${esc(t.label)}${p.notiz ? ' · ' + esc(p.notiz) : ''}</div></div>
        <button class="link" data-goto="${p.id}">Zeigen</button></li>`;
    }).join('');
    openSheet(`
      <h2>${esc(r.name)}</h2>
      <div class="stats">
        <div class="stat"><b>${ll ? fmtHa(geodesicArea(ll)) : '–'}</b><small>Fläche</small></div>
        <div class="stat"><b>${ll ? fmtKm(perimeter(ll)) : '–'}</b><small>Grenzlänge</small></div>
        <div class="stat"><b>${r.punkte.length}</b><small>Punkte gesamt</small></div>
      </div>
      <h3>Einrichtungen</h3>
      <div class="stats">${counts}</div>
      <h3>Alle Punkte</h3>
      ${list ? `<ul class="list">${list}</ul>` : '<p>Noch keine Punkte gesetzt. Tippe auf das orange „+“.</p>'}`, (root) => {
      root.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => {
        const p = r.punkte.find((x) => x.id === b.dataset.goto);
        closeSheet();
        if (!settings.filter[p.typ]) { settings.filter[p.typ] = true; saveSettings(); renderPunkte(); }
        map.setView([p.lat, p.lng], Math.max(map.getZoom(), 17));
        selectPunkt(p);
      }));
    });
  }

  // ---------- Filter & Kartenansicht ----------
  function openFilterSheet() {
    const r = aktiv();
    const rows = Object.entries(TYPES).map(([k, t]) => `
      <div class="switch-row"><label><span class="type-dot" style="--c:${t.color}">${svg(t.icon)}</span>
        ${esc(t.label)} <small style="color:var(--muted);font-weight:400">(${r.punkte.filter((p) => p.typ === k).length})</small></label>
        <input type="checkbox" data-typ="${k}" ${settings.filter[k] ? 'checked' : ''}></div>`).join('');
    openSheet(`<h2>Filter</h2>${rows}
      <h3>Anzeige</h3>
      <div class="switch-row"><label>Namen an den Punkten anzeigen</label><input type="checkbox" id="chkLabels" ${settings.labels ? 'checked' : ''}></div>`, (root) => {
      root.querySelectorAll('[data-typ]').forEach((c) => c.addEventListener('change', () => {
        settings.filter[c.dataset.typ] = c.checked; saveSettings(); renderPunkte(); updateFilterBtn();
      }));
      root.querySelector('#chkLabels').addEventListener('change', (e) => {
        settings.labels = e.target.checked; saveSettings();
        document.body.classList.toggle('hide-labels', !settings.labels);
      });
    });
  }
  function updateFilterBtn() {
    $('btnFilter').classList.toggle('active', Object.values(settings.filter).some((v) => !v));
  }

  function openLayerSheet() {
    const rows = Object.entries(BASEMAPS).map(([k, b]) => `
      <div class="switch-row"><label for="bm-${k}">${esc(b.label)}</label>
      <input type="radio" name="bm" id="bm-${k}" value="${k}" ${settings.basemap === k ? 'checked' : ''}></div>`).join('');
    openSheet(`<h2>Kartenansicht</h2>${rows}`, (root) => {
      root.querySelectorAll('input[name="bm"]').forEach((i) => i.addEventListener('change', () => { setBasemap(i.value); closeSheet(); }));
    });
  }

  // ---------- Export / Import ----------
  function revierToGeoJSON(r) {
    const features = [];
    if (r.grenze) features.push({ type: 'Feature', properties: { art: 'reviergrenze', name: r.name }, geometry: r.grenze.geometry });
    r.punkte.forEach((p) => features.push({
      type: 'Feature',
      properties: { art: 'punkt', id: p.id, typ: p.typ, typLabel: TYPES[p.typ].label, name: p.name, notiz: p.notiz, farbe: TYPES[p.typ].color },
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
    }));
    return { type: 'FeatureCollection', name: r.name, features };
  }

  function download(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/geo+json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const safeName = (s) => s.replace(/[^\wäöüÄÖÜß\- ]+/g, '').trim().replace(/\s+/g, '_') || 'revier';

  function geoJSONToRevier(fc, fallbackName) {
    const r = newRevier(fc.name || fallbackName);
    const feats = fc.type === 'FeatureCollection' ? fc.features : fc.type === 'Feature' ? [fc] : [];
    feats.forEach((f) => {
      if (!f || !f.geometry) return;
      const g = f.geometry, pr = f.properties || {};
      if (g.type === 'Polygon' && !r.grenze) {
        r.grenze = { type: 'Feature', properties: {}, geometry: g };
      } else if (g.type === 'MultiPolygon' && !r.grenze && g.coordinates.length) {
        r.grenze = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: g.coordinates[0] } };
      } else if (g.type === 'Point') {
        const typ = TYPES[pr.typ] ? pr.typ : 'ansitz';
        r.punkte.push({ id: uid(), typ, name: String(pr.name || TYPES[typ].label), notiz: String(pr.notiz || pr.description || ''), lng: +g.coordinates[0], lat: +g.coordinates[1] });
      }
    });
    if (!r.grenze && !r.punkte.length) throw new Error('Keine Grenze oder Punkte gefunden');
    return r;
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const base = file.name.replace(/\.(geo)?json$/i, '');
        let neu;
        if (data && data.revierplaner && Array.isArray(data.reviere)) {
          neu = data.reviere.map((r) => Object.assign(newRevier(r.name), { grenze: r.grenze || null, punkte: (r.punkte || []).map((p) => Object.assign({}, p, { id: uid() })) }));
        } else {
          neu = [geoJSONToRevier(data, base)];
        }
        state.reviere.push(...neu);
        state.aktivId = neu[neu.length - 1].id;
        save(); closeSheet(); renderAll(); fitRevier(true);
        toast(neu.length === 1 ? `„${neu[0].name}“ importiert` : `${neu.length} Reviere importiert`);
      } catch (err) {
        toast('Import fehlgeschlagen: ' + err.message);
      }
    };
    reader.readAsText(file);
  }
  $('importFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) importFile(f);
    e.target.value = '';
  });

  function openDataSheet() {
    openSheet(`
      <h2>Daten</h2>
      <p>Deine Daten werden nur in diesem Browser gespeichert. Exportiere sie regelmäßig als Sicherung oder um sie auf ein anderes Gerät zu übertragen.</p>
      <div class="btn-row" style="flex-direction:column">
        <button class="btn primary" data-a="exp">Aktuelles Revier als GeoJSON exportieren</button>
        <button class="btn" data-a="all">Sicherung aller Reviere herunterladen</button>
        <button class="btn" data-a="imp">GeoJSON / Sicherung importieren</button>
        <button class="btn danger" data-a="logout">Abmelden</button>
      </div>`, (root) => {
      root.querySelector('[data-a="logout"]').addEventListener('click', () => window.revierLogout());
      root.querySelector('[data-a="exp"]').addEventListener('click', () => download(safeName(aktiv().name) + '.geojson', revierToGeoJSON(aktiv())));
      root.querySelector('[data-a="all"]').addEventListener('click', () => download('revierplaner_sicherung_' + new Date().toISOString().slice(0, 10) + '.json', { revierplaner: 1, reviere: state.reviere }));
      root.querySelector('[data-a="imp"]').addEventListener('click', () => $('importFile').click());
    });
  }

  // ---------- Standort & Suche ----------
  $('btnLocate').addEventListener('click', () => {
    if (!navigator.geolocation) { toast('Standort wird nicht unterstützt'); return; }
    toast('Standort wird ermittelt …');
    map.locate({ setView: true, maxZoom: 17, enableHighAccuracy: true });
  });
  map.on('locationfound', (e) => {
    if (locationMarker) locationMarker.remove();
    locationMarker = L.layerGroup([
      L.circle(e.latlng, { radius: e.accuracy, color: '#4a90e2', weight: 1, fillOpacity: .12, interactive: false }),
      L.circleMarker(e.latlng, { radius: 8, color: '#fff', weight: 3, fillColor: '#4a90e2', fillOpacity: 1, interactive: false })
    ]).addTo(map);
  });
  map.on('locationerror', () => toast('Standort konnte nicht ermittelt werden'));

  $('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('searchInput').value.trim();
    if (!q) return;
    $('searchInput').blur();
    try {
      const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=de&q=' + encodeURIComponent(q));
      const hits = await res.json();
      if (!hits.length) { toast('Kein Ort gefunden'); return; }
      const [s, n, w, ea] = hits[0].boundingbox.map(Number);
      map.fitBounds([[s, w], [n, ea]], { maxZoom: 16 });
    } catch (err) {
      toast('Suche nicht verfügbar');
    }
  });

  // ---------- Buttons ----------
  $('btnAdd').addEventListener('click', openAddSheet);
  $('revierSwitch').addEventListener('click', openRevierSheet);
  $('btnDraw').addEventListener('click', () => { if (mode) cancelMode(); openGrenzeSheet(); });
  $('btnInfo').addEventListener('click', openInfoSheet);
  $('btnData').addEventListener('click', openDataSheet);
  $('btnLayer').addEventListener('click', openLayerSheet);
  $('btnFilter').addEventListener('click', openFilterSheet);
  $('btnFit').addEventListener('click', () => { if (!fitRevier(true)) toast('Noch keine Grenze oder Punkte vorhanden'); });

  // ---------- Start ----------
  renderAll();
  updateFilterBtn();
  if (!fitRevier(false)) {
    setTimeout(() => toast('Tippe auf „Grenze“, um dein Revier einzuzeichnen'), 600);
  }
})();
