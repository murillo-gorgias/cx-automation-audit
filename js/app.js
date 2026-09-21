/* The flow. Owns which screen is up, what the visitor has answered, the idle
   timer and the staff menu. Everything it draws comes from screens.js and
   admin.js; everything it stores goes through store.js. */

window.CXA = window.CXA || {};

CXA.app = (function () {

  var root, menu, idlePrompt;
  var current = null;          // the mounted screen element
  var currentName = 'splash';
  var session = null;
  var idleTimer = null, warnTimer = null;
  var returnFrom = null;       // where the PIN screen came from

  /* ---------------- session ---------------- */

  function newSession(opts) {
    session = {
      contact: {},
      answers: {},
      index: 0,
      test: !!(opts && opts.test),
      recordId: null,
      calc: null
    };
  }

  /* The questions this visitor actually sees. Recomputed every time because the
     platform answer adds or removes the migration question. */
  function path() {
    return CXA.content.questions.filter(function (q) {
      return !q.showIf || q.showIf(session.answers);
    });
  }

  /* ---------------- screen mounting ---------------- */

  function mount(node, name) {
    if (current) {
      if (current._timer) clearInterval(current._timer);
      CXA.admin.teardownPin(current);
      current.remove();
    }
    root.appendChild(node);
    node.classList.add('is-active');
    current = node;
    currentName = name;
    closeMenu();
    resetIdle();
  }

  /* ---------------- the screens ---------------- */

  function showSplash() {
    session = null;
    mount(CXA.screens.splash({ start: startAudit }), 'splash');
  }

  function startAudit() {
    newSession();
    showContact();
  }

  function showContact() {
    mount(CXA.screens.contact({
      submit: function (values) {
        session.contact = values;
        session.index = 0;
        showQuestion();
      },
      staff: openMenu
    }, session.contact), 'contact');
  }

  function skipContact() {
    /* Testing only. The record still saves, syncs and reaches the CSV so the
       whole storage path gets exercised — it is just flagged. */
    newSession({ test: true });
    session.contact = { first_name: '', last_name: '', email: '', company: '', website: '', consent: false };
    session.index = 0;
    showQuestion();
  }

  function showQuestion() {
    var list = path();
    if (session.index >= list.length) return finish();

    var q = list[session.index];
    mount(CXA.screens.question(q, {
      index: session.index,
      total: list.length,
      answer: session.answers[q.id]
    }, {
      next: function (answer) {
        session.answers[q.id] = answer;
        session.index += 1;
        showQuestion();
      },
      back: function () {
        if (session.index === 0) return showContact();
        session.index -= 1;
        showQuestion();
      },
      staff: openMenu
    }), 'question');
  }

  function finish() {
    var a = session.answers;
    var calc = CXA.roi.calculate({
      tickets: a.tickets.value,
      agents: a.agents.value,
      traffic: a.traffic.value,
      aov: a.aov.value
    });
    session.calc = calc;

    var isShopify = !!(a.platform && a.platform.shopify);
    var band = a.automation_today.band;

    var record = {
      first_name: session.contact.first_name || null,
      last_name: session.contact.last_name || null,
      email: session.contact.email || null,
      company: session.contact.company || null,
      website: session.contact.website || null,
      consent: !!session.contact.consent,

      role: label(a.role),
      platform: label(a.platform),
      migration_interest: label(a.migration_interest),
      channels: (a.channels || []).map(function (o) { return o.label; }),
      automation_today: label(a.automation_today),

      tickets_band: label(a.tickets), tickets_value: a.tickets.value,
      agents_band:  label(a.agents),  agents_value:  a.agents.value,
      traffic_band: label(a.traffic), traffic_value: a.traffic.value,
      aov_band:     label(a.aov),     aov_value:     a.aov.value,

      score_band: band,
      plan_recommended: calc.plan,

      cost_saved_annual: round(calc.costSaved),
      sa_revenue_annual: round(calc.saRevenue),
      total_value_annual: round(calc.totalValue),
      return_multiple: Number(calc.returnMultiple.toFixed(2)),

      booking: null,
      test: session.test
    };

    var saved = CXA.store.save(record);
    session.recordId = saved.id;

    mount(CXA.screens.results({
      calc: calc,
      answers: a,
      contact: session.contact,
      band: band,
      isShopify: isShopify
    }, {
      book: function (outcome) {
        CXA.store.update(session.recordId, { booking: outcome });
        if (outcome === 'booked') window.open(bookingUrl(), '_blank', 'noopener');
        showThanks();
      },
      later: function (outcome) {
        CXA.store.update(session.recordId, { booking: outcome });
        showThanks();
      },
      staff: openMenu
    }), 'results');
  }

  function showThanks() {
    mount(CXA.screens.thanks(session.contact.first_name), 'thanks');
    setTimeout(function () {
      if (currentName === 'thanks') showSplash();
    }, 6000);
    current.addEventListener('click', showSplash);
  }

  function label(answer) { return answer ? answer.label : null; }
  function round(n) { return Math.round(n); }

  function bookingUrl() {
    var url = new URL(CXA.config.bookingUrl);
    Object.keys(CXA.config.bookingUtm).forEach(function (k) {
      url.searchParams.set(k, CXA.config.bookingUtm[k]);
    });
    return url.toString();
  }

  /* ---------------- staff menu ---------------- */

  function openMenu() {
    var s = CXA.content.staff;
    var onContact = currentName === 'contact';
    menu.innerHTML =
      '<div class="card menu-card">' +
        '<button class="menu-item" data-act="reset">' + s.reset + '</button>' +
        (onContact ? '<button class="menu-item" data-act="skip">' + s.skip + '</button>' : '') +
        '<hr>' +
        '<button class="menu-item" data-act="settings">' + s.settings +
          '<span class="tag">' + s.settingsTag + '</span></button>' +
      '</div>';
    menu.classList.add('is-active');

    menu.querySelectorAll('.menu-item').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.dataset.act;
        closeMenu();
        if (act === 'reset') showSplash();
        if (act === 'skip') skipContact();
        if (act === 'settings') showPin();
      });
    });
  }

  function closeMenu() { menu.classList.remove('is-active'); menu.innerHTML = ''; }

  function showAdmin() {
    mount(CXA.admin.panel({ close: showSplash, help: showHelp }), 'admin');
  }

  /* Plain-language notes on the CSV and the buttons around it, for whoever is
     holding the laptop on the day. Behind the PIN, so a visitor never lands on it. */
  function showHelp() {
    mount(CXA.admin.help({ back: showAdmin }), 'help');
  }

  function showPin() {
    returnFrom = currentName;
    mount(CXA.admin.pin({
      ok: showAdmin,
      cancel: function () { showSplash(); }
    }), 'pin');
  }

  /* ---------------- idle ---------------- */

  function idleSecondsFor(name) {
    var c = CXA.config.idle;
    if (name === 'contact') return c.form;
    if (name === 'question') return c.question;
    if (name === 'results') return c.results;
    return 0;   // splash, thanks, pin, admin and help never time out
  }

  function resetIdle() {
    clearTimeout(idleTimer); clearTimeout(warnTimer);
    hideIdlePrompt();
    var seconds = idleSecondsFor(currentName);
    if (!seconds) return;

    warnTimer = setTimeout(showIdlePrompt, (seconds - CXA.config.idle.warning) * 1000);
    idleTimer = setTimeout(function () { showSplash(); }, seconds * 1000);
  }

  function showIdlePrompt() {
    var i = CXA.content.idle;
    idlePrompt.innerHTML =
      '<div class="card modal">' +
        '<h2 class="h3">' + i.title + '</h2>' +
        '<p class="lead">' + i.body + '</p>' +
        '<div class="actions">' +
          '<button class="btn" data-act="stay">' + i.stay + '</button>' +
          '<button class="btn btn--secondary" data-act="reset">' + i.reset + '</button>' +
        '</div>' +
      '</div>';
    idlePrompt.classList.add('is-active');
    idlePrompt.querySelector('[data-act="stay"]').addEventListener('click', resetIdle);
    idlePrompt.querySelector('[data-act="reset"]').addEventListener('click', showSplash);
  }

  function hideIdlePrompt() { idlePrompt.classList.remove('is-active'); idlePrompt.innerHTML = ''; }

  /* The design is drawn at 1440x900 and the whole stage is scaled to the screen
     rather than reflowing, so a booth laptop shows the frame that was designed.

     Scaling alone letterboxes: a 16:9 screen left paper-coloured bars down the
     sides of the splash's dark panel, which read as a bug. So after picking the
     scale, the stage is also grown in design pixels until it covers the screen
     exactly. Nothing is cropped and no type is resized, because the scale is
     unchanged; the screens simply get more room, and every one of them centres
     its content. Growth is capped so an unusually shaped window falls back to
     letterboxing rather than stretching into a shape nobody drew. */
  var STAGE_W = 1440, STAGE_H = 900, MAX_W = 2000, MAX_H = 1240;

  function fitStage() {
    var flag = document.getElementById('env-flag');
    var flagH = (flag && flag.offsetHeight && !CXA.config.isProduction) ? flag.offsetHeight : 0;
    document.body.style.setProperty('--flag-h', flagH + 'px');

    var vw = window.innerWidth;
    var vh = Math.max(window.innerHeight - flagH, 1);
    var scale = Math.min(vw / STAGE_W, vh / STAGE_H);

    var stage = document.getElementById('stage');
    stage.style.width  = Math.min(Math.max(Math.ceil(vw / scale), STAGE_W), MAX_W) + 'px';
    stage.style.height = Math.min(Math.max(Math.ceil(vh / scale), STAGE_H), MAX_H) + 'px';
    stage.style.setProperty('--scale', scale);
  }

  /* ---------------- boot ---------------- */

  function start() {
    root = document.getElementById('app');
    menu = document.getElementById('staff-menu');
    idlePrompt = document.getElementById('idle-prompt');

    document.body.classList.toggle('is-dev', !CXA.config.isProduction);
    document.getElementById('env-flag').textContent = 'Dev build';

    menu.addEventListener('click', function (e) { if (e.target === menu) closeMenu(); });

    ['pointerdown', 'keydown', 'wheel'].forEach(function (evt) {
      document.addEventListener(evt, function () {
        if (idlePrompt.classList.contains('is-active')) return;
        resetIdle();
      }, { passive: true });
    });

    /* Faster than finding the control, for the person running the conversation.
       Cmd/Ctrl + Backspace clears the session outright. */
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') { e.preventDefault(); showSplash(); }
    });

    fitStage();
    window.addEventListener('resize', fitStage);

    CXA.store.start();
    showSplash();
  }

  return { start: start, showSplash: showSplash };
})();

document.addEventListener('DOMContentLoaded', CXA.app.start);
