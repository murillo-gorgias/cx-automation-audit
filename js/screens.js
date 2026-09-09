/* Rendering. One function per screen, each returning an element.
   No state lives here — app.js owns the flow and hands each screen what it needs. */

window.CXA = window.CXA || {};

CXA.screens = (function () {

  var C = function () { return CXA.content; };

  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function orbit() {
    return '<img class="orbit" src="assets/img/bg-orbit.svg" alt="" aria-hidden="true">';
  }

  function menuBtn() {
    return '<button class="menu-btn" id="staff-open" aria-label="Staff menu">' +
           '<img src="assets/img/icon-menu.svg" alt=""></button>';
  }

  function ticks(total, index) {
    var out = '<div class="ticks" aria-hidden="true">';
    for (var i = 0; i < total; i++) out += '<i class="' + (i <= index ? 'is-on' : '') + '"></i>';
    return out + '</div>';
  }

  /* ---------------- splash ---------------- */

  function splash(handlers) {
    var s = C().splash;
    var node = el(
      '<section class="screen" id="screen-splash">' +
        '<div class="panel"><div class="dark"></div></div>' +
        orbit() +
        '<div class="frame"><div class="inner cols">' +
          '<div class="left">' +
            '<img class="logo" src="assets/img/logo.svg" alt="Gorgias">' +
            '<div class="hero">' +
              '<h1 class="h1">' + esc(s.title[0]) + '<em>' + esc(s.title[1]) + '</em>' + esc(s.title[2]) + '</h1>' +
              '<p class="lead">' + esc(s.subtitle) + '</p>' +
              '<button class="btn btn--lg" id="splash-start">' + esc(s.cta) + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="right">' +
            '<div class="stat"><div class="stat-body">' +
              '<p class="mono stat-eyebrow"></p>' +
              '<p class="stat-figure"></p>' +
              '<p class="stat-caption"></p>' +
            '</div></div>' +
            ticks(s.stats.length, 0) +
          '</div>' +
        '</div></div>' +
      '</section>'
    );

    var body = node.querySelector('.stat-body');
    var bars = node.querySelectorAll('.ticks i');
    var i = 0;

    function paint(n) {
      var stat = s.stats[n];
      body.querySelector('.stat-eyebrow').textContent = stat.eyebrow;
      body.querySelector('.stat-figure').innerHTML =
        esc(stat.figure) + (stat.unit ? '<span class="unit">' + esc(stat.unit) + '</span>' : '');
      body.querySelector('.stat-caption').textContent = stat.caption;
      for (var b = 0; b < bars.length; b++) bars[b].classList.toggle('is-on', b === n);
    }
    paint(0);

    /* The splash will get a proper animation pass later. This is the plain
       cross-fade that holds the place until then. */
    node._timer = setInterval(function () {
      body.classList.add('is-out');
      setTimeout(function () {
        i = (i + 1) % s.stats.length;
        paint(i);
        body.classList.remove('is-out');
      }, 600);
    }, s.statIntervalMs);

    node.querySelector('#splash-start').addEventListener('click', handlers.start);
    return node;
  }

  /* ---------------- contact ---------------- */

  function contact(handlers, prefill) {
    var c = C().contact;
    var fields = c.fields.map(function (f) {
      return '<div class="field" data-field="' + f.name + '"' + (f.wide ? ' style="flex:1 1 100%"' : '') + '>' +
               '<label for="f-' + f.name + '">' + esc(f.label) + '</label>' +
               '<input id="f-' + f.name + '" name="' + f.name + '" type="' + (f.type || 'text') + '" ' +
                 'placeholder="' + esc(f.placeholder) + '" autocomplete="off" spellcheck="false" ' +
                 'value="' + esc((prefill && prefill[f.name]) || '') + '">' +
               '<span class="err"></span>' +
             '</div>';
    });

    var node = el(
      '<section class="screen" id="screen-contact">' +
        orbit() +
        '<div class="frame"><div class="inner cols">' +
          '<div class="left">' +
            '<div class="left-hero">' +
              '<h1 class="h1">' + esc(c.title) + '</h1>' +
              '<p class="lead">' + esc(c.subtitle) + '</p>' +
            '</div>' +
            '<div class="card gdpr">' +
              '<b>' + esc(c.gdprTitle) + '</b>' +
              '<p>' + esc(c.gdprBody) + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="right"><form class="card form" id="contact-form" novalidate>' +
            '<div class="form-row" style="flex-wrap:wrap">' + fields.join('') + '</div>' +
            '<hr>' +
            '<label class="consent"><input type="checkbox" id="f-consent">' +
              '<span>' + esc(c.consent) + '</span></label>' +
            '<div><button class="btn" type="submit">' + esc(c.cta) + '</button></div>' +
          '</form></div>' +
        '</div></div>' +
        menuBtn() +
      '</section>'
    );

    node.querySelector('#contact-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var values = {}, ok = true;

      c.fields.forEach(function (f) {
        var wrap = node.querySelector('[data-field="' + f.name + '"]');
        var input = wrap.querySelector('input');
        var err = wrap.querySelector('.err');
        var v = input.value.trim();
        values[f.name] = v;
        wrap.classList.remove('has-error');
        err.textContent = '';

        if (f.required && !v) {
          wrap.classList.add('has-error');
          err.textContent = c.errors.required.replace('%s', f.label.toLowerCase());
          ok = false;
        } else if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
          wrap.classList.add('has-error');
          err.textContent = c.errors.email;
          ok = false;
        }
      });

      var consentBox = node.querySelector('#f-consent');
      var consentWrap = node.querySelector('.consent');
      consentWrap.classList.toggle('has-error', !consentBox.checked);
      if (!consentBox.checked) ok = false;
      values.consent = consentBox.checked;

      if (ok) handlers.submit(values);
    });

    node.querySelector('#staff-open').addEventListener('click', handlers.staff);
    return node;
  }

  /* ---------------- question ---------------- */

  function question(q, ctx, handlers) {
    var chosen = ctx.answer;
    var opts = q.options.map(function (o, idx) {
      var on = q.multi
        ? (chosen || []).some(function (x) { return x.label === o.label; })
        : (chosen && chosen.label === o.label);
      return '<button class="option' + (on ? ' is-on' : '') + '" data-index="' + idx + '" type="button">' +
             esc(o.label) + '</button>';
    });

    var node = el(
      '<section class="screen" id="screen-question">' +
        orbit() +
        '<div class="frame"><div class="inner">' +
          '<div class="q-top">' +
            '<div class="q-head">' +
              '<div class="q-step"><span class="dot"></span>' +
                '<span class="mono">Question ' + (ctx.index + 1) + ' of ' + ctx.total + ' &middot; ' + esc(q.step) + '</span>' +
              '</div>' +
              ticks(ctx.total, ctx.index) +
            '</div>' +
            '<div class="q-body">' +
              '<h2 class="h3 q-title">' + esc(q.title) + '</h2>' +
              '<div class="options">' + opts.join('') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="q-foot">' +
            (q.hint ? '<span class="q-hint">' + esc(q.hint) + '</span>' : '') +
            '<button class="btn btn--secondary" id="q-back" type="button">' + esc(C().nav.back) + '</button>' +
            '<button class="btn" id="q-next" type="button">' + esc(C().nav.next) + '</button>' +
          '</div>' +
        '</div></div>' +
        menuBtn() +
      '</section>'
    );

    var next = node.querySelector('#q-next');
    function refresh() {
      var picked = q.multi ? (chosen || []).length > 0 : !!chosen;
      next.disabled = !picked;
    }
    refresh();

    node.querySelectorAll('.option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var option = q.options[Number(btn.dataset.index)];
        if (q.multi) {
          chosen = chosen || [];
          var at = chosen.findIndex(function (x) { return x.label === option.label; });
          if (at >= 0) chosen.splice(at, 1); else chosen.push(option);
          btn.classList.toggle('is-on', at < 0);
          refresh();
        } else {
          chosen = option;
          node.querySelectorAll('.option').forEach(function (b) { b.classList.remove('is-on'); });
          btn.classList.add('is-on');
          refresh();
          /* One tap, one answer, straight on — the AE never reaches for Continue
             on a single-choice question. */
          setTimeout(function () { handlers.next(chosen); }, 180);
        }
      });
    });

    next.addEventListener('click', function () { handlers.next(chosen); });
    node.querySelector('#q-back').addEventListener('click', handlers.back);
    node.querySelector('#staff-open').addEventListener('click', handlers.staff);
    return node;
  }

  /* ---------------- results ---------------- */

  function results(data, handlers) {
    var r = C().results;
    var m = CXA.roi.money;
    var calc = data.calc;
    var shopify = data.isShopify;
    var online = navigator.onLine;

    /* Three cases, so the hero label never over-claims:
         Shopify with revenue     -> total value, then savings, then revenue
         not Shopify with revenue -> savings, then return, then revenue-once-you-move
         revenue suppressed       -> savings, then return, then the sentence */
    var showTotal = shopify && calc.showRevenue;
    var heroKey   = showTotal ? r.shopify.heroKey : r.notShopify.heroKey;
    var heroSub   = showTotal ? r.shopify.heroSub : r.notShopify.heroSub;
    var heroValue = showTotal ? calc.totalValue : calc.costSaved;

    var figures = [
      '<div class="r-fig r-fig--hero">' +
        '<span class="k">' + esc(heroKey) + '</span>' +
        '<div><div class="v">' + m(heroValue) + '</div><div class="s">' + esc(heroSub) + '</div></div>' +
      '</div>'
    ];

    if (showTotal) {
      figures.push(
        '<div class="r-fig r-fig--plain">' +
          '<span class="k">' + esc(r.savedKey) + '</span>' +
          '<div><div class="v">' + m(calc.costSaved) + '</div>' +
          '<div class="s">' + CXA.roi.percent(calc.costSavedPct) + ' less than today.</div></div>' +
        '</div>'
      );
    } else {
      figures.push(
        '<div class="r-fig r-fig--plain">' +
          '<span class="k">' + esc(r.returnKey) + '</span>' +
          '<div><div class="v">' + calc.returnMultiple.toFixed(1) + '&times;</div>' +
          '<div class="s">Back for every dollar on Gorgias.</div></div>' +
        '</div>'
      );
    }

    if (!calc.showRevenue) {
      figures.push(
        '<div class="r-fig r-fig--plain">' +
          '<span class="k">Revenue</span>' +
          '<div><div class="s">' + esc(r.revenueSuppressed) + '</div></div>' +
        '</div>'
      );
    } else {
      var revKey = shopify ? r.revenueKey : r.revenueLockedKey;
      var orders = Math.round(calc.attributedOrdersPerMonth);
      figures.push(
        '<div class="r-fig r-fig--plain">' +
          '<span class="k">' + esc(revKey) + '</span>' +
          '<div><div class="v">' + m(calc.saRevenue) + '</div>' +
          '<div class="s">From about ' + orders + ' extra order' + (orders === 1 ? '' : 's') +
          ' a month via Shopping Assistant.</div></div>' +
        '</div>'
      );
    }

    var note = r.note
      .replace('%tickets%', data.answers.tickets.label.toLowerCase())
      .replace('%agents%', data.answers.agents.label);
    var bench = r.benchmark
      .replace('%tickets%', esc(data.answers.tickets.label.toLowerCase()))
      .replace('%agents%', esc(data.answers.agents.label));

    var node = el(
      '<section class="screen" id="screen-results">' +
        orbit() +
        '<div class="frame"><div class="inner">' +
          '<div class="r-head">' +
            '<span class="mono">' + esc(r.label) + ' &middot; ' + esc(data.contact.company) + '</span>' +
            '<span class="r-chip">' + esc(data.answers.platform.label) +
              ' &middot; Recommended plan: ' + esc(calc.plan) + '</span>' +
          '</div>' +
          '<div class="r-band">' +
            '<span class="name">' + esc(data.band) + '</span>' +
            '<p class="sentence">' + esc(r.bands[data.band]) + '</p>' +
          '</div>' +
          '<div class="r-figures' + (calc.showRevenue ? '' : ' is-two') + '">' + figures.join('') + '</div>' +
          '<div class="r-lower">' +
            '<div class="card r-break">' +
              '<span class="k">' + esc(r.breakdownTitle) + '</span>' +
              '<div class="r-group">' +
                row(r.rows.labourToday, m(calc.labourToday)) +
                row(r.rows.toolingToday, m(calc.toolingToday)) +
                row(r.rows.totalToday, m(calc.costToday), 'is-total') +
              '</div>' +
              '<div class="r-group" style="margin-top:20px">' +
                row(r.rows.labourGorgias, m(calc.labourWithGorgias)) +
                row(r.rows.plan.replace('%s', calc.plan), m(calc.planCost)) +
                row(r.rows.ai, m(calc.aiCost)) +
                row(r.rows.totalGorgias, m(calc.costWithGorgias), 'is-total') +
              '</div>' +
              '<div class="r-row is-keep"><span>' + esc(r.rows.keep) + '</span>' +
                '<b>' + m(calc.costSaved) + ' a year</b></div>' +
              '<p class="r-note">' + esc(note) + '</p>' +
            '</div>' +
            '<div class="r-side">' +
              '<div class="r-bench"><span class="k">' + esc(r.benchmarkKey) + '</span><p>' + bench + '</p></div>' +
              '<div class="r-close">' +
                '<button class="btn btn--block" id="r-book">' +
                  esc(online ? r.book : r.bookOffline) + '</button>' +
                '<span class="u">' + esc(online ? r.bookUnder : r.bookOfflineUnder) + '</span>' +
                '<button class="btn btn--secondary btn--block" id="r-later">' + esc(r.followUp) + '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div></div>' +
        menuBtn() +
      '</section>'
    );

    node.querySelector('#r-book').addEventListener('click', function () {
      handlers.book(navigator.onLine ? 'booked' : 'intent_offline');
    });
    node.querySelector('#r-later').addEventListener('click', function () { handlers.later('follow_up'); });
    node.querySelector('#staff-open').addEventListener('click', handlers.staff);
    return node;
  }

  function row(label, value, cls) {
    return '<div class="r-row ' + (cls || '') + '"><span>' + esc(label) + '</span><span>' + value + '</span></div>';
  }

  /* ---------------- thank you ---------------- */

  function thanks(firstName) {
    var t = C().thanks;
    return el(
      '<section class="screen" id="screen-thanks">' +
        orbit() +
        '<div class="frame"><div class="inner">' +
          '<h1 class="h1">' + esc(t.title.replace('%s', firstName || 'you')) + '</h1>' +
          '<p class="lead">' + esc(t.body.replace('%s', CXA.config.standNumber)) + '</p>' +
        '</div></div>' +
      '</section>'
    );
  }

  return {
    el: el, esc: esc,
    splash: splash, contact: contact, question: question,
    results: results, thanks: thanks
  };
})();
