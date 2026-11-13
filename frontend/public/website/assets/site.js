/* kanzms.com, refreshed (2026-11). One script for every page:
   - the visit's UTM tags, kept 30 days and carried onto links to Circle,
     pay.kanzms.com and the Radar (website-funnel.md §3.1);
   - website events pushed to GTM's dataLayer: cta_click, plan_click,
     section_view, faq_open, social_click, period_selected, plans_loaded,
     plans_fallback, embed_fallback;
   - the plans, read from the paywall (pay.kanzms.com/api/site-plans), else
     from assets/plans.json, in the visitor's currency by country like the
     paywall, with a link to the paywall when neither loads;
   - the next Thursday workshop, in the visitor's own time;
   - the TikTok feed and the newest X posts (assets/x-posts.json), loaded only
     when their section nears the screen, with a profile card when an embed
     does not render.
   No framework, no build step. Nothing here sends data anywhere but GTM. */
(function () {
  "use strict";
  var doc = document;
  var root = doc.documentElement;
  root.classList.add("js");
  var LANG = root.lang === "en" ? "en" : "ar";
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (_) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  };

  /* ══ EVENTS → GTM ══ */
  window.dataLayer = window.dataLayer || [];
  function track(name, params) {
    var ev = { event: name, lang: LANG, page: location.pathname };
    for (var k in params || {}) if (params[k] !== undefined && params[k] !== "") ev[k] = params[k];
    window.dataLayer.push(ev);
  }

  /* ══ THEME ══ dark by default, as the paywall and the Radar. */
  (function theme() {
    var saved = store.get("kanz_theme");
    if (saved === "light" || saved === "dark") root.dataset.theme = saved;
    doc.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", root.dataset.theme === "light" ? "true" : "false");
      b.addEventListener("click", function () {
        var next = root.dataset.theme === "light" ? "dark" : "light";
        root.dataset.theme = next;
        store.set("kanz_theme", next);
        b.setAttribute("aria-pressed", next === "light" ? "true" : "false");
      });
    });
  })();

  /* ══ SOURCE ══ The same record, key and 30 days as the paywall, so a
     visitor who arrives here tagged keeps the tags on the way to paying. */
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var SOURCE = (function () {
    var KEEP_MS = 30 * 24 * 3600 * 1000;
    var q = new URLSearchParams(location.search);
    var tags = {};
    UTM_KEYS.forEach(function (k) {
      var v = (q.get(k) || "").trim();
      if (v) tags[k] = v.slice(0, 120);
    });
    var ref = "";
    try { ref = doc.referrer ? new URL(doc.referrer).hostname : ""; } catch (_) {}
    if (ref === location.hostname) ref = "";
    var stored = store.get("kanz_source");
    if (stored && !(stored.first_seen_at && Date.now() - stored.first_seen_at * 1000 < KEEP_MS)) stored = null;
    if (Object.keys(tags).length || (!stored && ref)) {
      stored = Object.assign(tags, {
        referrer_host: ref || undefined,
        landing_page: (location.pathname || "/").slice(0, 120),
        first_seen_at: Math.floor(Date.now() / 1000),
      });
      store.set("kanz_source", stored);
    }
    return stored || {};
  })();

  var CARRY_HOSTS = ["kanzms.circle.so", "pay.kanzms.com", "radar.kanzms.com"];
  function withSource(href) {
    try {
      var u = new URL(href, location.href);
      if (CARRY_HOSTS.indexOf(u.hostname) < 0) return href;
      UTM_KEYS.forEach(function (k) {
        if (SOURCE[k] && !u.searchParams.has(k)) u.searchParams.set(k, SOURCE[k]);
      });
      return u.toString();
    } catch (_) {
      return href;
    }
  }
  function decorate(scope) {
    (scope || doc).querySelectorAll("a[href]").forEach(function (a) {
      var next = withSource(a.getAttribute("href"));
      if (next !== a.getAttribute("href")) a.setAttribute("href", next);
    });
  }
  decorate();

  /* Clicks: anything carrying data-track says which event it is. */
  doc.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-track]");
    if (!el) return;
    var d = el.dataset;
    var sec = el.closest("[data-section]");
    track(d.track, {
      section: d.section || (sec ? sec.dataset.section : ""),
      target: d.target,
      plan: d.plan,
      period: d.period,
      currency: d.currency,
      platform: d.platform,
      link_url: el.href || "",
    });
  });

  /* ══ HEADER ══ */
  (function menu() {
    var btn = doc.querySelector("[data-menu]");
    var drawer = doc.getElementById("drawer");
    if (!btn || !drawer) return;
    var ico = btn.querySelector("[data-menu-ico]");
    function set(open) {
      drawer.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (ico) ico.textContent = open ? "close" : "menu";
      doc.body.classList.toggle("locked", open);
    }
    btn.addEventListener("click", function () { set(!drawer.classList.contains("open")); });
    drawer.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("open")) { set(false); btn.focus(); }
    });
    window.addEventListener("resize", function () { if (window.innerWidth >= 1140 && drawer.classList.contains("open")) set(false); });
  })();

  /* ══ HEADER STATE, SCROLL-SPY, MOBILE DOCK ══ */
  (function chrome() {
    var hdr = doc.querySelector("[data-hdr]");
    var dock = doc.querySelector("[data-dock]");
    var hero = doc.getElementById("hero");
    var plans = doc.getElementById("plans");
    var spyLinks = Array.prototype.slice.call(doc.querySelectorAll(".nav a[data-spy]"));
    var spyTargets = spyLinks.map(function (a) { return doc.querySelector(a.getAttribute("href")); });
    var ticking = false;
    function inView(el) {
      if (!el) return false;
      var r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    }
    function update() {
      ticking = false;
      var y = window.scrollY;
      if (hdr) hdr.classList.toggle("scrolled", y > 8);
      if (dock && hero) {
        var past = hero.getBoundingClientRect().bottom < 0;
        var show = past && !inView(plans);
        dock.classList.toggle("show", show);
        dock.setAttribute("aria-hidden", show ? "false" : "true");
        var a = dock.querySelector("a");
        if (a) a.tabIndex = show ? 0 : -1;
      }
      var mark = window.innerHeight * 0.35;
      var current = -1;
      spyTargets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= mark) current = i; });
      spyLinks.forEach(function (a, i) {
        if (i === current) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  })();

  /* ══ HERO FIGURES ══ count up once, unless the visitor asked for less motion. */
  (function countUp() {
    var els = doc.querySelectorAll("[data-count]");
    if (!els.length || !("IntersectionObserver" in window)) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        obs.unobserve(en.target);
        var el = en.target;
        var to = +el.dataset.count;
        var suffix = el.dataset.suffix || "";
        var t0 = null;
        var dur = 1400;
        function step(t) {
          if (t0 === null) t0 = t;
          var p = Math.min(1, (t - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * eased).toLocaleString("en-US") + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { obs.observe(el); });
  })();

  /* ══ SECTION VIEWS + REVEALS ══ */
  if ("IntersectionObserver" in window) {
    var seen = {};
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var s = en.target.dataset.section;
        if (en.isIntersecting && !seen[s]) { seen[s] = 1; track("section_view", { section: s }); }
      });
    }, { threshold: 0.35 });
    doc.querySelectorAll("section[data-section]").forEach(function (s) { secObs.observe(s); });
    var rvObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); rvObs.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    doc.querySelectorAll(".rv").forEach(function (el) { rvObs.observe(el); });
  } else {
    doc.querySelectorAll(".rv").forEach(function (el) { el.classList.add("in"); });
  }

  /* ══ FAQ ══ */
  doc.querySelectorAll("details[data-q]").forEach(function (d) {
    d.addEventListener("toggle", function () { if (d.open) track("faq_open", { question_id: d.dataset.q }); });
  });

  /* ══ PLANS ══ */
  var T = {
    ar: {
      per: { monthly: "/ شهريًا", quarterly: "/ 3 أشهر", semiannual: "/ 6 أشهر", annual: "/ سنويًا" },
      egp: "ج.م",
      paidMonthly: "تُدفع شهريًا",
      equals: "أي ما يعادل ",
      perMonth: " شهريًا",
      save: function (p) { return " · توفّر " + p + "%"; },
      upTo: function (p) { return "حتى " + p + "%"; },
      unavailable: "الأسعار على صفحة الباقات",
    },
    en: {
      per: { monthly: "/ month", quarterly: "/ 3 months", semiannual: "/ 6 months", annual: "/ year" },
      egp: "EGP",
      paidMonthly: "Billed monthly",
      equals: "That is ",
      perMonth: " a month",
      save: function (p) { return " · save " + p + "%"; },
      upTo: function (p) { return "up to " + p + "%"; },
      unavailable: "Prices on the plans page",
    },
  }[LANG];
  var MONTHS = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };
  var TIERS = ["student", "basic", "elite"];

  (function plans() {
    var box = doc.querySelector("[data-plans]");
    if (!box) return;
    var api = box.dataset.plansApi || "https://pay.kanzms.com/api/site-plans";
    var data = null;
    var currency = "EGP";
    var period = "monthly";

    function fmt(n) {
      return currency === "USD"
        ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : Math.round(n).toLocaleString("en-US");
    }
    function money(n) { return currency === "USD" ? "$" + fmt(n) : fmt(n) + " " + T.egp; }
    function saving(tier, per) {
      var p = data.prices[currency][tier];
      if (!p || !p.monthly || per === "monthly") return 0;
      var full = p.monthly * MONTHS[per];
      return Math.floor(((full - p[per]) / full) * 100);
    }
    // The API names the checkout URLs; only https links to the paywall or
    // Circle reach an href. Anything else keeps the button's own link to the
    // plans page (pay.kanzms.com), which the HTML ships with.
    var CHECKOUT_HOSTS = ["pay.kanzms.com", "kanzms.circle.so"];
    function safeUrl(raw) {
      try {
        var u = new URL(String(raw));
        return u.protocol === "https:" && CHECKOUT_HOSTS.indexOf(u.hostname) >= 0 && !u.username && !u.password ? u : null;
      } catch (_) {
        return null;
      }
    }
    function checkoutUrl(tier) {
      var u;
      if (currency === "USD") {
        u = safeUrl(data.checkout.USD && data.checkout.USD[tier]);
      } else {
        u = safeUrl(data.checkout.EGP);
        if (u) {
          u.searchParams.set("plan", tier);
          u.searchParams.set("period", period);
        }
      }
      return u ? withSource(u.toString()) : null;
    }
    function freeUrl() {
      var u = safeUrl(data.checkout.free);
      return u ? withSource(u.toString()) : null;
    }
    function render() {
      box.querySelectorAll(".plan[data-tier]").forEach(function (card) {
        var tier = card.dataset.tier;
        var btn = card.querySelector("[data-checkout]");
        if (tier === "free") {
          var fu = freeUrl();
          if (btn && fu) btn.href = fu;
          return;
        }
        var p = data.prices[currency][tier];
        if (!p) return;
        var amt = p[period];
        card.querySelector("[data-amt]").textContent = currency === "USD" ? "$" + fmt(amt) : fmt(amt);
        card.querySelector("[data-cur]").textContent = currency === "USD" ? "" : T.egp;
        card.querySelector("[data-per]").textContent = T.per[period];
        var sub = card.querySelector("[data-sub]");
        sub.textContent = "";
        if (period === "monthly") {
          sub.textContent = T.paidMonthly;
        } else {
          sub.appendChild(doc.createTextNode(T.equals));
          var m = doc.createElement("span");
          m.className = "mono ltr";
          m.textContent = money(amt / MONTHS[period]);
          sub.appendChild(m);
          sub.appendChild(doc.createTextNode(T.perMonth));
          var pct = saving(tier, period);
          if (pct >= 1) { var b = doc.createElement("b"); b.textContent = T.save(pct); sub.appendChild(b); }
        }
        if (btn) {
          var cu = checkoutUrl(tier);
          if (cu) btn.href = cu;
          btn.dataset.period = period;
          btn.dataset.currency = currency;
        }
      });
      // Persona and academy buttons elsewhere on the page go to the same checkout.
      doc.querySelectorAll("[data-checkout-for]").forEach(function (a) {
        var t = a.dataset.checkoutFor;
        if (t === "free") { var fu = freeUrl(); if (fu) a.href = fu; return; }
        if (!data.prices[currency][t]) return;
        var cu = checkoutUrl(t);
        if (cu) a.href = cu;
        a.dataset.period = period;
        a.dataset.currency = currency;
      });
      box.querySelectorAll("[data-save-for]").forEach(function (el) {
        var best = Math.max.apply(null, TIERS.map(function (t) { return saving(t, el.dataset.saveFor); }));
        el.textContent = best >= 1 ? T.upTo(best) : "";
        el.hidden = best < 1;
      });
      box.querySelectorAll("[data-cur-note]").forEach(function (el) { el.hidden = el.dataset.curNote !== currency; });
    }
    function radios(groupSel, attr, onPick) {
      var btns = Array.prototype.slice.call(box.querySelectorAll(groupSel + " [role=radio]"));
      btns.forEach(function (b, i) {
        b.addEventListener("click", function () { onPick(b.dataset[attr]); });
        b.addEventListener("keydown", function (e) {
          var fwd = LANG === "ar" ? "ArrowLeft" : "ArrowRight";
          var back = LANG === "ar" ? "ArrowRight" : "ArrowLeft";
          var dir = e.key === fwd ? 1 : e.key === back ? -1 : 0;
          if (!dir) return;
          e.preventDefault();
          var nb = btns[(i + dir + btns.length) % btns.length];
          onPick(nb.dataset[attr]);
          nb.focus();
        });
      });
      return function sync(value) {
        btns.forEach(function (b) {
          var on = b.dataset[attr] === value;
          b.setAttribute("aria-checked", on ? "true" : "false");
          b.tabIndex = on ? 0 : -1;
        });
      };
    }
    var syncPeriod = radios("[data-period-group]", "period", function (p) {
      period = p; syncPeriod(p); if (data) render(); track("period_selected", { period: p, section: "plans" });
    });
    syncPeriod(period);

    function fallback() {
      box.classList.add("price-fallback");
      box.querySelectorAll("[data-period-group]").forEach(function (g) { g.hidden = true; });
      box.querySelectorAll(".plan[data-tier]").forEach(function (card) {
        if (card.dataset.tier === "free") return;
        var a = card.querySelector("[data-amt]");
        if (a) a.textContent = T.unavailable;
        var sub = card.querySelector("[data-sub]");
        if (sub) sub.textContent = "";
      });
      track("plans_fallback", { section: "plans" });
    }

    // The currency follows the visitor's country, like the paywall
    // (checkout.py _detect_currency): Egypt pays in pounds, any other known
    // country in dollars, an unknown one in pounds. There is no switch.
    function currencyFor(country) {
      country = String(country || "").toUpperCase();
      if (country === "EG" || country === "" || country === "XX" || country === "T1") return "EGP";
      return "USD";
    }
    function getJson(url, ms) {
      var ctrl = "AbortController" in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms);
      return fetch(url, { credentials: "omit", signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { clearTimeout(timer); return r.ok ? r.json() : Promise.reject(r.status); },
              function (e) { clearTimeout(timer); throw e; });
    }
    function valid(json) {
      return json && json.prices && json.prices.EGP && json.prices.USD && json.checkout;
    }
    // Cloudflare answers /cdn-cgi/trace on every proxied host, Pages included,
    // with the visitor's country as "loc=XX".
    function country() {
      var ctrl = "AbortController" in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 3000);
      return fetch("/cdn-cgi/trace", { credentials: "omit", signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { return r.ok ? r.text() : ""; })
        .then(function (t) { clearTimeout(timer); var m = /^loc=([A-Z0-9]{2})$/m.exec(t); return m ? m[1] : ""; },
              function () { clearTimeout(timer); return ""; });
    }
    function show(json, cur, source) {
      data = json;
      currency = cur;
      render();
      track("plans_loaded", { source: source, currency: cur, section: "plans" });
    }
    // 1. The paywall's live prices (one place to change a price).
    // 2. If the paywall does not answer, the same prices from assets/plans.json
    //    on this site, which a test keeps equal to the paywall's.
    // 3. If neither loads, the cards link to the plans page without a price.
    var base = (doc.querySelector('script[src*="site.js"]') || {}).src || "";
    var snapshot = base.replace(/site\.js.*$/, "plans.json");
    getJson(api, 5000)
      .then(function (json) {
        if (!valid(json)) throw new Error("shape");
        show(json, json.currency === "USD" ? "USD" : "EGP", "live");
      })
      .catch(function () {
        return Promise.all([getJson(snapshot, 5000), country()]).then(function (r) {
          if (!valid(r[0])) throw new Error("shape");
          show(r[0], currencyFor(r[1]), "snapshot");
        });
      })
      .catch(function () {
        // 3. The snapshot inlined in the page (a file:// preview or an offline visit).
        var el = doc.getElementById("plans-snapshot");
        var json = null;
        try { json = el ? JSON.parse(el.textContent) : null; } catch (_) {}
        if (!valid(json)) throw new Error("no snapshot");
        return country().then(function (c) { show(json, currencyFor(c), "inline"); });
      })
      .catch(function () { fallback(); });
  })();

  /* ══ NEXT WORKSHOP ══ Every Thursday at 20:30 Cairo time (owner, 2026-11-11) unless
     assets/workshops.json says otherwise (a date, a topic, a week off). */
  (function workshop() {
    var el = doc.querySelector("[data-next-workshop]");
    if (!el) return;
    var base = (doc.querySelector('script[src*="site.js"]') || {}).src || "";
    var url = base.replace(/site\.js.*$/, "workshops.json");

    // The UTC instant of a wall-clock time in a time zone, with Intl alone.
    function zoned(y, mo, d, h, mi, tz) {
      var guess = Date.UTC(y, mo, d, h, mi);
      for (var i = 0; i < 2; i++) {
        var parts = {};
        new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
          .formatToParts(new Date(guess)).forEach(function (p) { parts[p.type] = p.value; });
        var asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
        guess += Date.UTC(y, mo, d, h, mi) - asUtc;
      }
      return new Date(guess);
    }
    function cairoParts(dt, tz) {
      var p = {};
      new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
        .formatToParts(dt).forEach(function (x) { p[x.type] = x.value; });
      return p;
    }
    function nextSlot(cfg) {
      var tz = cfg.timezone || "Africa/Cairo";
      var hm = (cfg.time || "20:30").split(":");
      var now = new Date();
      var skip = cfg.skip || [];
      for (var add = 0; add < 21; add++) {
        var probe = new Date(now.getTime() + add * 86400000);
        var p = cairoParts(probe, tz);
        if (p.weekday !== "Thu") continue;
        var iso = p.year + "-" + p.month + "-" + p.day;
        if (skip.indexOf(iso) >= 0) continue;
        var at = zoned(+p.year, +p.month - 1, +p.day, +hm[0], +hm[1], tz);
        if (at.getTime() + 90 * 60000 > now.getTime()) return { at: at, iso: iso, tz: tz };
      }
      return null;
    }
    function show(cfg) {
      var slot = null;
      var n = cfg.next || {};
      if (n.datetime) {
        var at = new Date(n.datetime);
        if (!isNaN(at) && at.getTime() + 90 * 60000 > Date.now()) slot = { at: at, tz: cfg.timezone || "Africa/Cairo", iso: n.datetime.slice(0, 10) };
      }
      var topic = slot ? n["topic_" + LANG] : "";
      if (!slot) slot = nextSlot(cfg);
      if (!slot) return;
      var loc = LANG === "ar" ? "ar-EG-u-nu-latn" : "en-GB";
      var when = new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(slot.at);
      var cairo = new Intl.DateTimeFormat(loc, { timeZone: "Africa/Cairo", hour: "numeric", minute: "2-digit" }).format(slot.at);
      var whenEl = el.querySelector("[data-when]");
      var cairoEl = el.querySelector("[data-cairo]");
      var topicEl = el.querySelector("[data-topic]");
      if (whenEl) { whenEl.textContent = when; whenEl.setAttribute("datetime", slot.at.toISOString()); }
      if (cairoEl) cairoEl.textContent = cairo;
      if (topicEl && topic) { topicEl.textContent = topic; topicEl.hidden = false; }
      el.querySelectorAll("[data-local]").forEach(function (x) { x.hidden = false; });
    }
    var defaults = { timezone: "Africa/Cairo", time: "20:30" };
    fetch(url, { credentials: "omit" })
      .then(function (r) { return r.ok ? r.json() : defaults; })
      .catch(function () { return defaults; })
      .then(show);
  })();

  /* ══ SOCIAL FEEDS ══ The official embeds, loaded only when the section
     nears the screen. X's profile timeline does not draw for signed-out
     visitors ("Rate limit exceeded"), so X shows its newest posts one by one,
     with X's single-post embed, from assets/x-posts.json (refreshed from X at
     each deploy). If a slot has not drawn anything after a few seconds, it
     shows a card linking to the profile instead. */
  (function feeds() {
    var slots = doc.querySelectorAll("[data-embed]");
    if (!slots.length) return;
    var SCRIPTS = {
      tiktok: "https://www.tiktok.com/embed.js",
      x: "https://platform.twitter.com/widgets.js",
    };
    function loadScript(src) {
      return new Promise(function (resolve, reject) {
        var s = doc.createElement("script");
        s.async = true;
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        doc.body.appendChild(s);
      });
    }
    function drawn(slot) {
      var frames = slot.querySelectorAll("iframe");
      for (var i = 0; i < frames.length; i++) if (frames[i].getBoundingClientRect().height > 150) return true;
      return false;
    }
    function useFallback(slot, platform, why) {
      var tpl = slot.querySelector("template[data-fallback]");
      if (!tpl) return;
      var card = tpl.content.cloneNode(true);
      slot.replaceChildren(card);
      slot.classList.add("is-fallback");
      track("embed_fallback", { platform: platform, reason: why, section: "feed" });
    }
    // Fills the X slot with one blockquote per post id; the ids are digits only.
    function xPosts(slot) {
      var box = slot.querySelector("[data-x-posts]");
      var base = (doc.querySelector('script[src*="site.js"]') || {}).src || "";
      return fetch(base.replace(/site\.js.*$/, "x-posts.json"), { credentials: "omit" })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (json) {
          var handle = /^[A-Za-z0-9_]{1,15}$/.test(json.handle || "") ? json.handle : "RealKnzMS";
          var ids = (json.posts || []).filter(function (id) { return /^[0-9]{5,25}$/.test(String(id)); }).slice(0, 3);
          if (!box || !ids.length) throw new Error("no posts");
          ids.forEach(function (id) {
            var q = doc.createElement("blockquote");
            q.className = "twitter-tweet";
            q.setAttribute("data-theme", root.dataset.theme === "light" ? "light" : "dark");
            q.setAttribute("data-dnt", "true");
            q.setAttribute("data-lang", LANG);
            q.setAttribute("data-conversation", "none");
            var a = doc.createElement("a");
            a.href = "https://twitter.com/" + handle + "/status/" + id;
            q.appendChild(a);
            box.appendChild(q);
          });
        });
    }
    function start(slot) {
      var platform = slot.dataset.embed;
      var tpl = slot.querySelector("template[data-markup]");
      var fb = slot.querySelector("template[data-fallback]");
      if (!tpl) return;
      var markup = tpl.content.cloneNode(true);
      slot.replaceChildren(markup);
      if (fb) slot.appendChild(fb);
      (platform === "x" ? xPosts(slot) : Promise.resolve()).then(function () {
        return loadScript(SCRIPTS[platform]);
      }).then(function () {
        if (platform === "x" && window.twttr && window.twttr.widgets) window.twttr.widgets.load(slot);
        setTimeout(function () { if (!drawn(slot)) useFallback(slot, platform, "not_drawn"); }, 9000);
      }, function () { useFallback(slot, platform, "script_blocked"); });
    }
    if (!("IntersectionObserver" in window)) { slots.forEach(start); return; }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { obs.unobserve(en.target); start(en.target); } });
    }, { rootMargin: "400px 0px" });
    slots.forEach(function (s) { obs.observe(s); });
  })();

  /* ══ FOOTER YEAR ══ */
  doc.querySelectorAll("[data-year]").forEach(function (y) { y.textContent = String(new Date().getFullYear()); });
})();
