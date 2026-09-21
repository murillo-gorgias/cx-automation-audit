/* The staff screens: the PIN, and the admin panel behind it.
   Answers one question at a glance from two metres: is anything stuck? */

window.CXA = window.CXA || {};

CXA.admin = (function () {

  var el = function (h) { return CXA.screens.el(h); };
  var esc = function (s) { return CXA.screens.esc(s); };

  /* Drawn inline. Nothing on this page may reach for a CDN. */
  var ICON_BACK =
    '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M13 8H3.5M7.5 3.5 3 8l4.5 4.5" stroke="currentColor" stroke-width="1.5" ' +
        'stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_HELP =
    '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M6.25 6.15a1.75 1.75 0 1 1 2.15 1.9c-.42.14-.55.42-.55.79v.35" ' +
        'stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<circle cx="8" cy="11.5" r=".9" fill="currentColor"/></svg>';
  var ICON_POWER =
    '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M8 2v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M12.1 4.4a5.75 5.75 0 1 1-8.2 0" stroke="currentColor" stroke-width="1.5" ' +
        'stroke-linecap="round"/></svg>';

  /* ---------------- PIN ---------------- */

  function pin(handlers) {
    var p = CXA.content.pin;
    var entered = '';

    var node = el(
      '<section class="screen" id="screen-pin">' +
        '<div class="frame"><div class="card modal">' +
          '<span class="mono">' + esc(p.label) + '</span>' +
          '<h2 class="h3">' + esc(p.title) + '</h2>' +
          '<div class="pin-boxes"><b></b><b></b><b></b><b></b></div>' +
          '<p class="pin-err"></p>' +
          '<p class="lead" style="font-size:var(--text-small)">' + esc(p.hint) + '</p>' +
          '<button class="btn btn--secondary" id="pin-back" type="button">' + esc(p.back) + '</button>' +
        '</div></div>' +
      '</section>'
    );

    var boxes = node.querySelectorAll('.pin-boxes b');
    var wrap = node.querySelector('.pin-boxes');
    var err = node.querySelector('.pin-err');

    function paint() {
      boxes.forEach(function (b, i) {
        b.classList.toggle('is-filled', i < entered.length);
        b.classList.toggle('is-cur', i === entered.length);
        b.innerHTML = i < entered.length ? '<i></i>' : '';
      });
    }
    paint();

    function onKey(e) {
      if (e.key === 'Escape') return handlers.cancel();
      if (e.key === 'Backspace') {
        entered = entered.slice(0, -1);
        wrap.classList.remove('is-bad'); err.textContent = '';
        return paint();
      }
      if (!/^[0-9]$/.test(e.key) || entered.length >= 4) return;

      entered += e.key;
      paint();

      if (entered.length === 4) {
        if (entered === CXA.config.pin) {
          handlers.ok();
        } else {
          /* No lockout. What is behind this screen is the same data already on
             the laptop, and stranding staff mid-conversation is the worse
             failure. */
          wrap.classList.add('is-bad');
          err.textContent = p.error;
          entered = '';
          setTimeout(paint, 60);
        }
      }
    }

    node._onKey = onKey;
    document.addEventListener('keydown', onKey);
    node.querySelector('#pin-back').addEventListener('click', handlers.cancel);
    return node;
  }

  function teardownPin(node) {
    if (node && node._onKey) document.removeEventListener('keydown', node._onKey);
  }

  /* ---------------- admin panel ---------------- */

  function panel(handlers) {
    var node = el(
      '<section class="screen" id="screen-admin">' +
        '<div class="frame"><div class="inner">' +
          '<div class="a-head">' +
            '<button class="btn btn--secondary btn--icon" id="a-close" type="button">' +
              ICON_BACK + 'Back to the audit</button>' +
            '<span class="mono">Audit admin</span>' +
            '<div class="a-name">' +
              '<label class="k" for="a-device">This laptop</label>' +
              '<input id="a-device" type="text" maxlength="40" spellcheck="false" ' +
                'autocomplete="off" placeholder="' + esc(CXA.config.deviceDefault) + '">' +
              '<span class="a-saved" hidden>Saved</span>' +
            '</div>' +
            '<span class="who"></span>' +
            '<button class="btn btn--secondary btn--icon" id="a-help" type="button">' +
              ICON_HELP + 'Help</button>' +
            '<button class="btn btn--secondary btn--icon btn--round a-quit" id="a-quit" ' +
              'type="button" title="Close the audit" aria-label="Close the audit">' +
              ICON_POWER + '<span class="a-quit-label" hidden>Close?</span></button>' +
          '</div>' +
          '<div class="a-tiles">' +
            '<div class="card a-tile" data-tile="synced">' +
              '<span class="k">Synced to Supabase</span><span class="v">0</span>' +
              '<span class="pill pill--ok"><s></s>All caught up</span>' +
            '</div>' +
            '<div class="card a-tile" data-tile="unsynced">' +
              '<span class="k">Waiting to sync</span><span class="v">0</span>' +
              '<span class="pill pill--ok"><s></s>Nothing queued</span>' +
            '</div>' +
            '<div class="card a-tile" data-tile="csv">' +
              '<span class="k">CSV on this laptop</span><span class="v is-word">Not set up</span>' +
              '<span class="pill pill--warn"><s></s>Choose a file</span>' +
            '</div>' +
          '</div>' +
          '<div class="a-acts">' +
            '<button class="btn" id="a-sync" type="button">Sync now</button>' +
            '<button class="btn btn--secondary" id="a-csv" type="button">Connect the CSV</button>' +
            '<button class="btn btn--secondary" id="a-export" type="button">Export a copy</button>' +
            '<span class="when"></span>' +
          '</div>' +
          '<p class="a-quit-note" hidden></p>' +
          '<div class="card a-table">' +
            '<div class="hd"><span>Time</span><span>Name</span><span>Company</span><span>Band</span><span>Status</span></div>' +
            '<div class="rows"></div>' +
          '</div>' +
        '</div></div>' +
      '</section>'
    );

    function pill(kind, text) {
      return '<span class="pill pill--' + kind + '"><s></s>' + esc(text) + '</span>';
    }

    var deviceInput = node.querySelector('#a-device');
    var savedFlag = node.querySelector('.a-saved');

    function render(stats) {
      node.querySelector('.who').textContent =
        CXA.config.device + ' · v' + CXA.config.version + ' · ' + stats.env;

      /* Do not fight someone who is mid-edit. */
      if (document.activeElement !== deviceInput) {
        var stored = CXA.config.device;
        deviceInput.value = stored === CXA.config.deviceDefault ? '' : stored;
      }

      var configured = !!(CXA.config.supabase.url && CXA.config.supabase.anonKey);

      var syncedTile = node.querySelector('[data-tile="synced"]');
      syncedTile.querySelector('.v').textContent = stats.synced;
      syncedTile.querySelector('.pill').outerHTML = stats.synced > 0
        ? pill('ok', 'Safely off this laptop')
        : pill(stats.total > 0 ? 'warn' : 'ok', stats.total > 0 ? 'None synced yet' : 'Nothing yet');

      /* Say why nothing is moving. "Retrying" when there is no Supabase to
         retry against is the kind of reassurance that costs a day's leads. */
      var waitTile = node.querySelector('[data-tile="unsynced"]');
      var waitMsg;
      if (stats.unsynced === 0) waitMsg = pill('ok', 'Nothing queued');
      else if (!configured)     waitMsg = pill('warn', 'Supabase not set up');
      else if (!navigator.onLine) waitMsg = pill('warn', 'No connection');
      else                      waitMsg = pill('warn', 'Retrying');
      waitTile.querySelector('.v').textContent = stats.unsynced;
      waitTile.classList.toggle('needs-attention', stats.unsynced > 0);
      waitTile.querySelector('.pill').outerHTML = waitMsg;

      var csvTile = node.querySelector('[data-tile="csv"]');
      var csvValue = csvTile.querySelector('.v');
      var csvMsg;
      if (stats.csvState === 'unsupported') {
        csvValue.textContent = 'Not available';
        csvMsg = pill('warn', 'Use Chrome');
      } else if (!stats.csvName) {
        csvValue.textContent = 'Not set up';
        csvMsg = pill('warn', 'Choose a file');
      } else if (stats.csvState === 'denied') {
        csvValue.textContent = stats.csvName;
        csvMsg = pill('warn', 'Permission refused');
      } else {
        csvValue.textContent = stats.csvName;
        csvMsg = pill('ok', 'Writing · ' + stats.total + ' row' + (stats.total === 1 ? '' : 's'));
      }
      csvTile.classList.toggle('needs-attention', stats.csvState !== 'ready');
      csvTile.querySelector('.pill').outerHTML = csvMsg;

      node.querySelector('.when').textContent = stats.lastSyncAt
        ? 'Last successful sync: ' + new Date(stats.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'No successful sync yet' + (CXA.config.supabase.url ? '' : ' · Supabase not configured');

      var rows = CXA.store.all().slice().reverse();
      var body = node.querySelector('.rows');
      if (!rows.length) {
        body.innerHTML = '<p class="a-empty">Nothing recorded yet.</p>';
        return;
      }
      /* "Sep 17 · 09:11 AM": the day matters once rows span both event days. */
      function stamp(iso) {
        var d = new Date(iso);
        return '<span class="day">' + d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + '</span>' +
          d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      body.innerHTML = rows.map(function (r) {
        var name = r.test
          ? '<b class="muted">&mdash;</b><span class="muted">test run</span>'
          : '<b>' + esc([r.first_name, r.last_name].filter(Boolean).join(' ') || '—') + '</b>' +
            '<span>' + esc(r.company || '—') + '</span>';
        var status = r.synced_at
          ? pill('ok', r.test ? 'Test · synced' : 'Synced')
          : pill('warn', r.test ? 'Test · waiting' : 'Waiting');
        return '<div class="tr' + (r.test ? ' is-test' : '') + '">' +
          '<time>' + stamp(r.created_at) + '</time>' +
          name +
          '<span>' + esc(r.score_band || '—') + '</span>' +
          status +
        '</div>';
      }).join('');
    }

    node.querySelector('#a-sync').addEventListener('click', function () {
      CXA.store.sync().catch(function (e) { alert('Sync failed: ' + e.message); });
    });
    node.querySelector('#a-csv').addEventListener('click', function () {
      CXA.store.chooseCsv().catch(function (e) { alert(e.message); });
    });
    node.querySelector('#a-export').addEventListener('click', CXA.store.downloadCsv);
    node.querySelector('#a-help').addEventListener('click', handlers.help);
    node.querySelector('#a-close').addEventListener('click', handlers.close);

    /* The name is saved on this laptop, so it survives a reload and does not
       travel when the folder is copied to another machine. */
    var savedTimer = null;
    function saveDevice() {
      CXA.config.setDevice(deviceInput.value);
      render(CXA.store.stats());
      savedFlag.hidden = false;
      clearTimeout(savedTimer);
      savedTimer = setTimeout(function () { savedFlag.hidden = true; }, 1600);
    }
    /* Closing is deliberate and rare, so it asks twice. Nothing is lost either
       way: every record is already on this laptop before this screen exists. */
    var quitBtn = node.querySelector('#a-quit');
    var quitNote = node.querySelector('.a-quit-note');
    var quitArmed = false;
    var quitTimer = null;

    var quitLabel = node.querySelector('.a-quit-label');

    function disarmQuit() {
      quitArmed = false;
      quitLabel.hidden = true;
      quitBtn.classList.remove('is-armed');
    }

    quitBtn.addEventListener('click', function () {
      if (!quitArmed) {
        quitArmed = true;
        quitLabel.hidden = false;
        quitBtn.classList.add('is-armed');
        quitNote.hidden = true;
        clearTimeout(quitTimer);
        quitTimer = setTimeout(disarmQuit, 5000);
        return;
      }
      clearTimeout(quitTimer);
      window.close();
      /* Chrome refuses to close a window a script did not open, and whether it
         obliges depends on how the app was started. If we are still here a
         moment later, say what to press instead of leaving them guessing. */
      setTimeout(function () {
        disarmQuit();
        quitNote.textContent =
          'Chrome would not close the window from here. Use the red button in the ' +
          'corner of the window, or press Cmd + Q.';
        quitNote.hidden = false;
      }, 400);
    });

    deviceInput.addEventListener('change', saveDevice);
    deviceInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); deviceInput.blur(); }
    });

    node._render = render;
    render(CXA.store.stats());
    CXA.store.onChange(render);
    return node;
  }

  /* ---------------- staff help ---------------- */

  function help(handlers) {
    var h = CXA.content.help;

    var blocks = h.blocks.map(function (b) {
      return '<section class="h-block">' +
        '<h3>' + esc(b.h) + '</h3>' +
        b.p.map(function (line) { return '<p>' + esc(line) + '</p>'; }).join('') +
      '</section>';
    }).join('');

    var node = el(
      '<section class="screen" id="screen-help">' +
        '<div class="frame"><div class="inner">' +
          '<div class="a-head">' +
            '<button class="btn btn--secondary btn--icon" id="h-back" type="button">' +
              ICON_BACK + esc(h.back) + '</button>' +
            '<span class="mono">' + esc(h.label) + '</span>' +
          '</div>' +
          '<h2 class="h3">' + esc(h.title) + '</h2>' +
          '<div class="h-body">' + blocks + '</div>' +
        '</div></div>' +
      '</section>'
    );

    node.querySelector('#h-back').addEventListener('click', handlers.back);
    return node;
  }

  return { pin: pin, teardownPin: teardownPin, panel: panel, help: help };
})();
