/* ============================================================
   BITVULEX — Analytics layer
   Lightweight, no-dependency visit / engagement tracker. Like the
   rest of this demo site, everything is stored in the browser via
   localStorage under "bitvulex_analytics" — there is no server, so
   this reflects activity *in this browser* (useful while testing,
   or if every visitor's device is what you care about). For real
   cross-visitor traffic numbers once this is deployed, wire in a
   proper analytics service (Plausible, GA4, etc.) alongside this.
   ============================================================ */

const ANALYTICS_KEY = "bitvulex_analytics";
const ANALYTICS_SESSION_KEY = "bitvulex_sid";
const ANALYTICS_SOURCE_KEY = "bitvulex_source";

const DEFAULT_ANALYTICS = {
  visits: [],        // { date, page, source, device, sid }
  scrolls: [],        // { date, page, depth, sid }
  serviceViews: {},   // serviceId -> impression count (scrolled into view)
  serviceClicks: {}   // serviceId -> "Get this package" click count
};

function loadAnalytics() {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    if (!raw) { saveAnalytics(DEFAULT_ANALYTICS); return structuredCloneSafe(DEFAULT_ANALYTICS); }
    const parsed = JSON.parse(raw);
    return { ...structuredCloneSafe(DEFAULT_ANALYTICS), ...parsed };
  } catch (e) {
    saveAnalytics(DEFAULT_ANALYTICS);
    return structuredCloneSafe(DEFAULT_ANALYTICS);
  }
}

function saveAnalytics(a) {
  try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(a)); } catch (e) { /* storage full/blocked — ignore */ }
}

function getSessionId() {
  try {
    let sid = sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    if (!sid) {
      sid = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem(ANALYTICS_SESSION_KEY, sid);
    }
    return sid;
  } catch (e) { return "s0"; }
}

// First-touch attribution for this session: which site/link sent the
// visitor here. Used both for the traffic-source chart and to tag any
// contact-form lead with where it originated (see initContactForm in data.js).
function getAttributionSource() {
  try {
    let src = sessionStorage.getItem(ANALYTICS_SOURCE_KEY);
    if (src) return src;
    src = classifyReferrer(document.referrer);
    sessionStorage.setItem(ANALYTICS_SOURCE_KEY, src);
    return src;
  } catch (e) { return "Direct"; }
}

function classifyReferrer(ref) {
  if (!ref) return "Direct";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (!host || host === location.hostname) return "Direct";
    if (/google\./.test(host)) return "Google";
    if (/bing\./.test(host)) return "Bing";
    if (/(facebook|fb)\./.test(host)) return "Facebook";
    if (/instagram\./.test(host)) return "Instagram";
    if (/(twitter|x)\.com/.test(host)) return "X / Twitter";
    if (/linkedin\./.test(host)) return "LinkedIn";
    if (/youtube\./.test(host)) return "YouTube";
    if (/whatsapp\./.test(host)) return "WhatsApp";
    if (/(t\.me|telegram)/.test(host)) return "Telegram";
    return host;
  } catch (e) { return "Direct"; }
}

function isMobileViewport() {
  return window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
}

function currentPageName() {
  const file = location.pathname.split("/").pop();
  return file && file.trim() ? file : "index.html";
}

/* ---------------- Tracking (public pages only) ---------------- */

function trackVisit() {
  const a = loadAnalytics();
  a.visits.push({
    date: new Date().toISOString(),
    page: currentPageName(),
    source: getAttributionSource(),
    device: isMobileViewport() ? "mobile" : "desktop",
    sid: getSessionId()
  });
  a.visits = a.visits.slice(-3000);
  saveAnalytics(a);
}

function trackScrollDepth() {
  let maxPct = 0;
  let saved = false;

  const measure = () => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? Math.min(100, Math.round(((window.scrollY) / scrollable) * 100)) : 100;
    if (pct > maxPct) maxPct = pct;
  };

  const persist = () => {
    if (saved || maxPct <= 0) return;
    saved = true;
    const a = loadAnalytics();
    a.scrolls.push({ date: new Date().toISOString(), page: currentPageName(), depth: maxPct, sid: getSessionId() });
    a.scrolls = a.scrolls.slice(-3000);
    saveAnalytics(a);
  };

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { measure(); ticking = false; });
  }, { passive: true });

  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") persist(); });
  window.addEventListener("pagehide", persist);
  measure();
}

// Impressions: which service blocks / teaser cards actually get seen.
// Clicks: which "Get this package" CTA gets clicked. Together these are
// a proxy for market demand per service, ahead of an actual inquiry.
function trackServiceInterest() {
  const seen = new Set();
  const els = document.querySelectorAll("[data-service]");
  if (els.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const id = entry.target.getAttribute("data-service");
        if (entry.isIntersecting && id && !seen.has(id)) {
          seen.add(id);
          const a = loadAnalytics();
          a.serviceViews[id] = (a.serviceViews[id] || 0) + 1;
          saveAnalytics(a);
        }
      });
    }, { threshold: 0.4 });
    els.forEach(el => io.observe(el));
  }

  document.querySelectorAll("a[data-service]").forEach(link => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("data-service");
      if (!id) return;
      const a = loadAnalytics();
      a.serviceClicks[id] = (a.serviceClicks[id] || 0) + 1;
      saveAnalytics(a);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Guard: only self-track on public pages. admin.html has #login-shell,
  // which no public page uses — the dashboard reads the aggregates
  // instead of adding to them.
  if (document.getElementById("login-shell")) return;
  trackVisit();
  trackScrollDepth();
  trackServiceInterest();
});

/* ---------------- Aggregation helpers (used by the admin dashboard) ---------------- */

function analyticsDaySeries(days) {
  const a = loadAnalytics();
  const buckets = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.push({ key: d.toISOString().slice(0, 10), label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 });
  }
  const map = new Map(buckets.map(b => [b.key, b]));
  a.visits.forEach(v => {
    const key = String(v.date).slice(0, 10);
    const b = map.get(key);
    if (b) b.count++;
  });
  return buckets;
}

function analyticsSummary() {
  const a = loadAnalytics();
  const now = Date.now();
  const last7 = a.visits.filter(v => now - new Date(v.date).getTime() <= 7 * 86400000);
  const prev7 = a.visits.filter(v => {
    const t = now - new Date(v.date).getTime();
    return t > 7 * 86400000 && t <= 14 * 86400000;
  });
  const sessions = new Set(a.visits.map(v => v.sid));
  const avgScroll = a.scrolls.length
    ? Math.round(a.scrolls.reduce((s, r) => s + (Number(r.depth) || 0), 0) / a.scrolls.length)
    : 0;
  const deepScrollers = a.scrolls.filter(r => r.depth >= 75).length;
  const growthPct = prev7.length > 0
    ? Math.round(((last7.length - prev7.length) / prev7.length) * 100)
    : (last7.length > 0 ? 100 : 0);

  return {
    totalVisits: a.visits.length,
    last7: last7.length,
    prev7: prev7.length,
    growthPct,
    uniqueSessions: sessions.size,
    avgScroll,
    deepScrollers,
    mobilePct: a.visits.length ? Math.round((a.visits.filter(v => v.device === "mobile").length / a.visits.length) * 100) : 0
  };
}

function analyticsScrollBuckets() {
  const a = loadAnalytics();
  const buckets = [
    { label: "0–25%", count: 0 }, { label: "25–50%", count: 0 },
    { label: "50–75%", count: 0 }, { label: "75–100%", count: 0 }
  ];
  a.scrolls.forEach(r => {
    const d = Number(r.depth) || 0;
    const idx = d >= 75 ? 3 : d >= 50 ? 2 : d >= 25 ? 1 : 0;
    buckets[idx].count++;
  });
  return buckets;
}

function analyticsSources(limit) {
  const a = loadAnalytics();
  const counts = {};
  a.visits.forEach(v => { counts[v.source || "Direct"] = (counts[v.source || "Direct"] || 0) + 1; });
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((x, y) => y.count - x.count)
    .slice(0, limit || 6);
}

function analyticsServiceDemand() {
  const data = loadData();
  const a = loadAnalytics();
  return data.services.map(s => ({
    id: s.id,
    name: s.name,
    views: a.serviceViews[s.id] || 0,
    clicks: a.serviceClicks[s.id] || 0,
    inquiries: data.messages.filter(m => m.service === s.id || m.service === s.name).length
  }));
}

function analyticsRecentVisits(limit) {
  const a = loadAnalytics();
  return a.visits.slice(-1 * (limit || 8)).reverse();
}

function analyticsClearAll() {
  saveAnalytics(structuredCloneSafe(DEFAULT_ANALYTICS));
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.round(hrs / 24) + "d ago";
}
