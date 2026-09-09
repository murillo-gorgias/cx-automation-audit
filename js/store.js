/* Where the day's leads live.

   Three copies of every record (ADR-0012), in order of how much we trust them:
     1. Supabase, written the moment a visitor finishes, retried until it lands.
     2. A CSV on this laptop, rewritten in full after every completed audit.
     3. The browser's own storage, which is the buffer the other two are built from.

   The CSV is rewritten from the whole record set every time, never appended from
   memory. A rewrite repairs itself: if the file permission was dismissed for two
   hours, the next successful write catches up every missed row. An append cannot. */

window.CXA = window.CXA || {};

CXA.store = (function () {

  var LS_KEY = 'cxa.records.v1';
  var IDB_NAME = 'cxa';
  var IDB_STORE = 'kv';
  var CSV_HANDLE_KEY = 'csvHandle';

  /* Column order. The Supabase table, the CSV and the stored copy all use this,
     so the two can be diffed after the event without reformatting (ADR-0007). */
  var COLUMNS = [
    'id', 'created_at', 'synced_at',
    'first_name', 'last_name', 'email', 'company', 'website', 'consent',
    'role', 'platform', 'migration_interest', 'channels', 'automation_today',
    'tickets_band', 'tickets_value', 'agents_band', 'agents_value',
    'traffic_band', 'traffic_value', 'aov_band', 'aov_value',
    'score_band', 'plan_recommended',
    'cost_saved_annual', 'sa_revenue_annual', 'total_value_annual', 'return_multiple',
    'booking', 'test', 'device', 'app_version'
  ];

  var listeners = [];
  var csvHandle = null;
  var csvState = 'unknown';   // unknown | ready | denied | unsupported
  var lastSyncAt = null;
  var syncing = false;

  /* ---------- local storage ---------- */

  function all() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch (e) {
      console.error('[store] could not read local records', e);
      return [];
    }
  }

  function writeAll(records) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(records));
    } catch (e) {
      /* Quota or a blocked origin (Safari on file://). Supabase and the CSV
         still hold the data, so this is loud but not fatal. */
      console.error('[store] could not write local records', e);
    }
  }

  function unsynced() { return all().filter(function (r) { return !r.synced_at; }); }
  function synced()   { return all().filter(function (r) { return !!r.synced_at; }); }

  function stats() {
    var records = all();
    return {
      total: records.length,
      synced: records.filter(function (r) { return !!r.synced_at; }).length,
      unsynced: records.filter(function (r) { return !r.synced_at; }).length,
      tests: records.filter(function (r) { return !!r.test; }).length,
      lastSyncAt: lastSyncAt,
      csvState: csvState,
      csvName: csvHandle ? csvHandle.name : null,
      env: CXA.config.env
    };
  }

  /* ---------- the record ---------- */

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function save(record) {
    record.id = record.id || uuid();
    record.created_at = record.created_at || new Date().toISOString();
    record.synced_at = null;
    record.device = CXA.config.device;
    record.app_version = CXA.config.version;

    var records = all();
    records.push(record);
    writeAll(records);
    notify();

    /* Both copies, immediately. Neither blocks the visitor. */
    writeCsv().catch(function (e) { console.warn('[store] csv write failed', e); });
    sync().catch(function (e) { console.warn('[store] sync failed', e); });

    return record;
  }

  function update(id, patch) {
    var records = all();
    for (var i = 0; i < records.length; i++) {
      if (records[i].id === id) {
        Object.keys(patch).forEach(function (k) { records[i][k] = patch[k]; });
        break;
      }
    }
    writeAll(records);
    notify();
    writeCsv().catch(function () {});
    sync().catch(function () {});
  }

  /* ---------- Supabase ---------- */

  function configured() {
    var s = CXA.config.supabase;
    return !!(s.url && s.anonKey);
  }

  function sync() {
    if (syncing) return Promise.resolve({ skipped: 'already running' });
    if (!configured()) return Promise.resolve({ skipped: 'supabase not configured' });
    if (!navigator.onLine) return Promise.resolve({ skipped: 'offline' });

    var pending = unsynced();
    if (!pending.length) return Promise.resolve({ sent: 0 });

    syncing = true;
    notify();

    var s = CXA.config.supabase;
    var url = s.url.replace(/\/$/, '') + '/rest/v1/' + CXA.config.tableName();
    var rows = pending.map(toRow);

    return fetch(url, {
      method: 'POST',
      headers: {
        'apikey': s.anonKey,
        'Authorization': 'Bearer ' + s.anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal,resolution=merge-duplicates'
      },
      body: JSON.stringify(rows)
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error(res.status + ' ' + t); });
      var now = new Date().toISOString();
      var ids = {};
      pending.forEach(function (r) { ids[r.id] = true; });
      var records = all();
      records.forEach(function (r) { if (ids[r.id]) r.synced_at = now; });
      writeAll(records);
      lastSyncAt = now;
      return { sent: pending.length };
    }).catch(function (e) {
      console.warn('[store] sync failed, records stay queued', e);
      throw e;
    }).then(function (result) {
      syncing = false; notify(); return result;
    }, function (e) {
      syncing = false; notify(); throw e;
    });
  }

  function toRow(record) {
    var row = {};
    COLUMNS.forEach(function (c) {
      var v = record[c];
      row[c] = v === undefined ? null : v;
    });
    return row;
  }

  /* ---------- the CSV on disk ---------- */

  function idb(mode, fn) {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('no indexedDB'));
      var open = indexedDB.open(IDB_NAME, 1);
      open.onupgradeneeded = function () { open.result.createObjectStore(IDB_STORE); };
      open.onerror = function () { reject(open.error); };
      open.onsuccess = function () {
        var tx = open.result.transaction(IDB_STORE, mode);
        var req = fn(tx.objectStore(IDB_STORE));
        tx.oncomplete = function () { resolve(req && req.result); };
        tx.onerror = function () { reject(tx.error); };
      };
    });
  }

  function csvSupported() { return typeof window.showSaveFilePicker === 'function'; }

  /* Called once per machine. Chrome remembers the file across a full quit, and
     asks to allow editing once per launch (ADR-0012). */
  function chooseCsv() {
    if (!csvSupported()) {
      csvState = 'unsupported';
      notify();
      return Promise.reject(new Error('This browser cannot write a file. Use Chrome.'));
    }
    return window.showSaveFilePicker({
      suggestedName: 'cx-audit-' + CXA.config.device + '.csv',
      types: [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }]
    }).then(function (handle) {
      csvHandle = handle;
      return idb('readwrite', function (s) { return s.put(handle, CSV_HANDLE_KEY); });
    }).then(function () {
      return writeCsv();
    });
  }

  function restoreCsvHandle() {
    if (!csvSupported()) { csvState = 'unsupported'; return Promise.resolve(); }
    return idb('readonly', function (s) { return s.get(CSV_HANDLE_KEY); })
      .then(function (handle) {
        if (handle) { csvHandle = handle; csvState = 'unknown'; }
        notify();
      })
      .catch(function () { /* first run, nothing stored */ });
  }

  function writeCsv() {
    if (!csvHandle) return Promise.resolve({ skipped: 'no file chosen' });

    return csvHandle.queryPermission({ mode: 'readwrite' }).then(function (p) {
      if (p === 'granted') return p;
      return csvHandle.requestPermission({ mode: 'readwrite' });
    }).then(function (p) {
      if (p !== 'granted') {
        csvState = 'denied';
        notify();
        throw new Error('permission to write the CSV was not granted');
      }
      /* Rewrite the whole file from the whole record set — see the note at
         the top of this file. */
      return csvHandle.createWritable();
    }).then(function (writable) {
      return writable.write(buildCsv(all()))
        .then(function () { return writable.close(); });
    }).then(function () {
      csvState = 'ready';
      notify();
      return { written: all().length };
    });
  }

  function buildCsv(records) {
    var lines = [COLUMNS.join(',')];
    records.forEach(function (r) {
      lines.push(COLUMNS.map(function (c) { return csvCell(r[c]); }).join(','));
    });
    return lines.join('\n') + '\n';
  }

  function csvCell(value) {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) value = value.join('; ');
    var s = String(value);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  /* Fallback when no file is connected: hand over a download instead. */
  function downloadCsv() {
    var blob = new Blob([buildCsv(all())], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cx-audit-' + CXA.config.device + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- wiring ---------- */

  function onChange(fn) { listeners.push(fn); }
  function notify() { listeners.forEach(function (fn) { try { fn(stats()); } catch (e) { console.error(e); } }); }

  function start() {
    restoreCsvHandle();
    window.addEventListener('online', function () { sync().catch(function () {}); });
    setInterval(function () { sync().catch(function () {}); }, CXA.config.syncRetrySeconds * 1000);
    sync().catch(function () {});
  }

  return {
    COLUMNS: COLUMNS,
    start: start,
    save: save,
    update: update,
    all: all,
    synced: synced,
    unsynced: unsynced,
    stats: stats,
    sync: sync,
    chooseCsv: chooseCsv,
    writeCsv: writeCsv,
    downloadCsv: downloadCsv,
    csvSupported: csvSupported,
    buildCsv: buildCsv,
    onChange: onChange
  };
})();
