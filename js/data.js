/* ============================================================
   BITVULEX — Data layer
   Everything the admin panel controls lives in localStorage
   under the key "bitvulex_data". This file defines the default
   content (first run), read/write helpers, and the render
   functions each public page calls to display live data.
   ============================================================ */

const STORAGE_KEY = "bitvulex_data";

// Cap on how many demo projects can be uploaded per service from the Admin
// Panel. Raise this number any time — it's the only place it's defined.
const MAX_PROJECTS_PER_SERVICE = 6;

const DEFAULT_DATA = {
  settings: {
    contactEmail: "contact@bitvulex.com",
    // EmailJS lets a static site send real email without a server.
    // Leave blank until the admin sets these up (see Admin > Settings).
    emailjsServiceId: "",
    emailjsTemplateId: "",
    emailjsPublicKey: "",
    // Admin-login OTP (email verification code) — reuses the Service ID and
    // Public key above, but its own Template ID (see Admin > Site Settings).
    // Off by default so nobody gets locked out before it's configured.
    otpEnabled: false,
    emailjsOtpTemplateId: "",
    // Site-wide default theme ("dark" or "light"). Set from Admin > Site Settings.
    // Individual visitors can still flip this for themselves with the header
    // toggle — see js/main.js initThemeToggle() / bitvulex_theme_override.
    theme: "light",
    // Social media links — fully editable from Admin > Social Links.
    // Type any platform name in "platform" (Facebook, LinkedIn, Instagram, X,
    // YouTube, GitHub, TikTok, WhatsApp, Telegram, Discord, Pinterest, Snapchat,
    // Threads...) and the matching icon is picked automatically — see
    // matchSocialIcon() below. Leave "url" blank to hide that entry on the site.
    social: [
      { platform: "Facebook", url: "https://facebook.com/bitvulex" },
      { platform: "LinkedIn", url: "https://linkedin.com/company/bitvulex" },
      { platform: "Instagram", url: "https://instagram.com/bitvulex" },
      { platform: "X (Twitter)", url: "https://x.com/bitvulex" }
    ]
  },
  // Growth / track-record numbers shown as an animated chart on the homepage.
  // Fully editable from Admin > Growth Stats.
  stats: {
    headline: "Trusted by growing businesses",
    subline: "Clients closed and projects delivered, year over year.",
    unitLabel: "clients",
    points: [
      { label: "2022", value: 6 },
      { label: "2023", value: 18 },
      { label: "2024", value: 34 },
      { label: "2025", value: 58 },
      { label: "2026", value: 79 }
    ]
  },
  services: [
    {
      id: "web",
      name: "Web Development",
      tagline: "Marketing sites, dashboards and web platforms built to scale.",
      // Demo projects shown on this service's public showcase page
      // (demo.html?service=web) and managed from Admin > Demo Projects.
      // Up to MAX_PROJECTS_PER_SERVICE — empty until the admin uploads some.
      projects: [],
      packages: [
        {
          tier: "Standard",
          price: "PKR 60,000",
          period: "one-time",
          desc: "A focused, fast-loading site for small businesses that need a real online presence.",
          features: [
            "Up to 5 pages",
            "Mobile-responsive design",
            "Contact form",
            "Basic on-page SEO",
            "2 rounds of revisions"
          ],
          featured: false
        },
        {
          tier: "Medium",
          price: "PKR 150,000",
          period: "one-time",
          desc: "For growing businesses that need custom design and light backend functionality.",
          features: [
            "Up to 12 pages",
            "Custom UI design",
            "CMS / admin panel",
            "Blog or news section",
            "Speed & SEO optimisation",
            "4 rounds of revisions"
          ],
          featured: true
        },
        {
          tier: "Large",
          price: "Custom quote",
          period: "project-based",
          desc: "Full web platforms — dashboards, portals, multi-role systems.",
          features: [
            "Unlimited pages / modules",
            "Custom backend & database",
            "User roles & authentication",
            "3rd-party API integrations",
            "Dedicated project manager",
            "Post-launch support plan"
          ],
          featured: false
        }
      ]
    },
    {
      id: "app",
      name: "App Development",
      tagline: "Android, iOS and cross-platform apps for business and consumers.",
      projects: [],
      packages: [
        {
          tier: "Standard",
          price: "PKR 120,000",
          period: "one-time",
          desc: "A simple, single-purpose app to get your business on mobile.",
          features: [
            "Single platform (Android or iOS)",
            "Up to 6 screens",
            "Basic UI design",
            "Play Store / App Store submission",
            "1 month bug-fix support"
          ],
          featured: false
        },
        {
          tier: "Medium",
          price: "PKR 300,000",
          period: "one-time",
          desc: "Cross-platform app with backend, accounts and real functionality.",
          features: [
            "Android + iOS (cross-platform)",
            "Up to 15 screens",
            "User accounts & login",
            "Backend API & database",
            "Push notifications",
            "2 months bug-fix support"
          ],
          featured: true
        },
        {
          tier: "Large",
          price: "Custom quote",
          period: "project-based",
          desc: "Complex, high-traffic apps — marketplaces, on-demand platforms, fintech.",
          features: [
            "Unlimited screens & modules",
            "Scalable cloud backend",
            "Payment gateway integration",
            "Admin & analytics dashboard",
            "Dedicated QA cycle",
            "Ongoing maintenance plan"
          ],
          featured: false
        }
      ]
    },
    {
      id: "api",
      name: "API & Integrations",
      tagline: "REST APIs, third-party integrations and secure backend connections.",
      projects: [],
      packages: [
        {
          tier: "Standard",
          price: "PKR 70,000",
          period: "one-time",
          desc: "A single, well-documented API or integration for a clear, contained use case.",
          features: [
            "One REST API or integration",
            "Up to 5 endpoints",
            "API documentation",
            "Basic authentication",
            "1 month support"
          ],
          featured: false
        },
        {
          tier: "Medium",
          price: "PKR 160,000",
          period: "one-time",
          desc: "Multiple integrations connecting your systems, payments and third-party services.",
          features: [
            "Multiple APIs / integrations",
            "Payment gateway integration",
            "Third-party service connections",
            "Secure backend communication",
            "Error handling & logging",
            "2 months support"
          ],
          featured: true
        },
        {
          tier: "Large",
          price: "Custom quote",
          period: "project-based",
          desc: "Complex, multi-system integration work with ongoing reliability requirements.",
          features: [
            "Multi-system integration architecture",
            "Custom middleware / API gateway",
            "High-availability setup",
            "Monitoring & alerting",
            "Dedicated project manager",
            "Ongoing maintenance plan"
          ],
          featured: false
        }
      ]
    },
    {
      id: "pos",
      name: "POS Software",
      tagline: "Point-of-sale systems for retail, restaurants and wholesale.",
      projects: [],
      packages: [
        {
          tier: "Standard",
          price: "PKR 80,000",
          period: "one-time",
          desc: "Core billing and inventory for a single-outlet shop.",
          features: [
            "Billing & receipt printing",
            "Basic inventory tracking",
            "Single user login",
            "Daily sales report",
            "1 month support"
          ],
          featured: false
        },
        {
          tier: "Medium",
          price: "PKR 200,000",
          period: "one-time",
          desc: "Multi-user POS with stock alerts and staff-level access.",
          features: [
            "Everything in Standard",
            "Multi-user roles (cashier/manager)",
            "Low-stock alerts",
            "Supplier & purchase records",
            "Sales analytics dashboard",
            "3 months support"
          ],
          featured: true
        },
        {
          tier: "Large",
          price: "Custom quote",
          period: "project-based",
          desc: "Multi-branch POS with centralised control and integrations.",
          features: [
            "Multi-branch sync",
            "Centralised inventory & reporting",
            "Loyalty / discount engine",
            "Accounting software integration",
            "Custom hardware integration",
            "Priority support plan"
          ],
          featured: false
        }
      ]
    }
  ],
  team: [
    {
      name: "Add your first team member",
      role: "Role / Title",
      bio: "Edit this from Admin Panel → Team to introduce your team, or delete this placeholder.",
      photo: ""
    }
  ],
  // Client reviews — created in Admin Panel → Reviews. Empty by default (no
  // invented testimonials); the homepage section stays hidden until at least
  // one published review exists. No limit on how many can be added.
  reviews: [],
  reviewsSettings: { title: "What our clients say", businessName: "Bitvulex", ctaLabel: "Start a project", ctaLink: "contact.html" },
  admin: {
    // No default credentials. Client-side credentials are public to every visitor
    // and must never be used as an authentication boundary. Provision accounts in
    // a trusted server-side identity system before enabling admin operations.
    users: []
  },
  messages: [], // local record of contact form submissions (in-browser only)
  activityLog: [] // audit trail: who logged in / created / edited / deleted, and when
};


const SERVICE_OVERVIEWS = {
  web: {
    purpose: "Your website is your business's front door — and its hardest-working salesperson. It is open 24/7, works on every phone and laptop, and is often the first thing a customer judges you by.",
    types: [
      { title: "Business & personal websites", desc: "Clean, professional sites for companies, freelancers and professionals who need a credible online presence." },
      { title: "E-commerce stores", desc: "Online shops with product catalogues, carts and checkout so you can sell around the clock." },
      { title: "Blogging & content websites", desc: "Easy-to-update blogs and content hubs that build an audience and attract search traffic." },
      { title: "Web apps & portals", desc: "Custom dashboards, booking systems and client portals built around how your business works." }
    ],
    benefits: ["Reach customers 24/7, not just in shop hours", "Look trustworthy and professional from the first visit", "Sell products and take orders or bookings online", "Get found on Google with fast, well-structured pages"]
  },
  app: {
    purpose: "A mobile app puts your business on your customers' home screen — a direct, always-available channel for orders, bookings, updates and loyalty.",
    types: [
      { title: "Android apps", desc: "Apps built for the widest range of phones in the market." },
      { title: "iOS apps", desc: "Polished iPhone and iPad apps that follow Apple's design standards." },
      { title: "Cross-platform apps", desc: "One codebase that runs on both Android and iOS to save time and budget." },
      { title: "Custom business apps", desc: "Internal tools for staff, delivery, field sales or customer self-service." }
    ],
    benefits: ["Stay one tap away from your customers", "Send updates and offers straight to their phones", "Make ordering and booking faster than a website", "Give your team mobile tools to work from anywhere"]
  },
  api: {
    purpose: "APIs and integrations make your systems talk to each other, so data moves on its own instead of being copied by hand — fewer errors, less admin, faster service.",
    types: [
      { title: "REST API development", desc: "Secure, documented APIs that power your web and mobile products." },
      { title: "Payment integrations", desc: "Connect payment gateways so customers can pay online safely." },
      { title: "Third-party integrations", desc: "Link your software with CRM, SMS, email, delivery and accounting tools." },
      { title: "Automation & data sync", desc: "Keep orders, stock and customer data consistent across every system." }
    ],
    benefits: ["Remove repetitive manual data entry", "Cut mistakes caused by copy-and-paste work", "Accept online payments without friction", "Connect the tools you already use into one workflow"]
  },
  pos: {
    purpose: "A point-of-sale system is the control centre of a shop or restaurant — it handles billing, tracks stock and shows you exactly how the business is performing, every day.",
    types: [
      { title: "Retail POS", desc: "Fast billing, barcode scanning and receipts for shops and stores." },
      { title: "Restaurant & cafe POS", desc: "Table orders, kitchen tickets and split billing for food businesses." },
      { title: "Inventory management", desc: "Know what is in stock, what is running low and what sells best." },
      { title: "Sales reports & analytics", desc: "Daily, weekly and monthly reports to guide better decisions." }
    ],
    benefits: ["Bill customers faster with fewer errors", "Never run out of your best-selling items unnoticed", "See profit and sales clearly, without spreadsheets", "Manage staff access and multiple branches in one place"]
  }
};

const SERVICE_SCENES = {
  web: `<div class="s3d-layer s3d-win" style="--z:0px"><div class="w-bar"><i></i><i></i><i></i></div><div class="w-hero"></div><div class="w-lines"><b></b><b></b><b></b></div><div class="w-cards"><u></u><u></u><u></u></div></div>
        <div class="s3d-layer s3d-chip s3d-cart" style="--z:70px;--x:-28%;--y:37%"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M3 4h3l2.4 11h10l2-8H7"/></svg></div>
        <div class="s3d-layer s3d-chip s3d-code" style="--z:110px;--x:24%;--y:-20%">&lt;/&gt;</div>
        <div class="s3d-layer s3d-chip s3d-stat" style="--z:90px;--x:23%;--y:42%"><span></span><span></span><span></span></div>`,
  app: `<div class="s3d-layer s3d-phone" style="--z:0px"><div class="p-notch"></div><div class="p-screen"><div class="p-head"></div><div class="p-tile"></div><div class="p-row"><b></b><b></b></div><div class="p-row"><b></b><b></b></div></div><div class="p-tabs"><i></i><i></i><i></i></div></div>
        <div class="s3d-layer s3d-chip s3d-bell" style="--z:90px;--x:28%;--y:-18%"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg></div>
        <div class="s3d-layer s3d-chip s3d-heart" style="--z:120px;--x:-31%;--y:12%"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-5.3-8-11a4.5 4.5 0 018-2.6A4.5 4.5 0 0120 10c0 5.700-8 11-8 11z"/></svg></div>`,
  api: `<div class="s3d-layer s3d-ring r1" style="--z:0px"></div><div class="s3d-layer s3d-ring r2" style="--z:0px"></div>
        <div class="s3d-layer s3d-core" style="--z:20px"><div class="cube"><i class="f1"></i><i class="f2"></i><i class="f3"></i><i class="f4"></i><i class="f5"></i><i class="f6"></i></div></div>
        <div class="s3d-layer s3d-chip s3d-node" style="--z:60px;--x:-36%;--y:-12%">{ }</div>
        <div class="s3d-layer s3d-chip s3d-node" style="--z:100px;--x:35%;--y:-24%">API</div>
        <div class="s3d-layer s3d-chip s3d-node" style="--z:80px;--x:26%;--y:37%">&#8644;</div>
        <div class="s3d-layer s3d-chip s3d-node" style="--z:120px;--x:-29%;--y:40%">$</div>`,
  pos: `<div class="s3d-layer s3d-term" style="--z:0px"><div class="t-screen"><div class="t-total"></div><div class="t-line"></div><div class="t-line short"></div><div class="t-line"></div></div><div class="t-base"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
        <div class="s3d-layer s3d-chip s3d-receipt" style="--z:100px;--x:30%;--y:18%"><b></b><b></b><b></b><b class="s"></b></div>
        <div class="s3d-layer s3d-chip s3d-barcode" style="--z:70px;--x:-30%;--y:-20%"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
        <div class="s3d-layer s3d-chip s3d-box" style="--z:120px;--x:-26%;--y:36%"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg></div>`
};
function serviceSceneHtml(id) {
  return `<div class="s3d" data-scene="${escapeHtml(id)}" aria-hidden="true"><div class="s3d-floor"></div><div class="s3d-rig"><div class="s3d-sway">${SERVICE_SCENES[id] || SERVICE_SCENES.web}</div></div></div>`;
}

function getServiceOverview(service) {
  const d = SERVICE_OVERVIEWS[service.id] || {};
  return {
    purpose: service.purpose || d.purpose || service.tagline || "",
    types: (service.types && service.types.length) ? service.types : (d.types || []),
    benefits: (service.benefits && service.benefits.length) ? service.benefits : (d.benefits || [])
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveData(DEFAULT_DATA);
      return structuredCloneSafe(DEFAULT_DATA);
    }
    const parsed = JSON.parse(raw);
    // fill in any top-level keys added in later versions without wiping saved edits
    const merged = { ...structuredCloneSafe(DEFAULT_DATA), ...parsed };
    // "settings" is a nested object, so the shallow spread above would silently
    // drop any settings key that didn't exist yet when this browser last saved
    // (e.g. "theme", added later) — merge it one level deeper so new keys
    // always show up with their default instead of being undefined.
    merged.settings = { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) };
    // Backfill "projects" on any service saved before demo projects existed,
    // so older browsers' saved data doesn't break the new demo pages.
    merged.services = (merged.services || []).map(s => ({ ...s, projects: s.projects || [] }));
    // Backfill "email" on any users saved before the account email field
    // existed, so older browsers' saved accounts don't break — it's used
    // as the notification email for new messages/package inquiries.
    merged.admin = merged.admin || { users: [] };
    merged.admin.users = (merged.admin.users || []).map(u => ({ email: "", ...u }));
    merged.activityLog = merged.activityLog || [];
    merged.reviews = (merged.reviews || []).map((r, i) => ({
      id: r.id || ("r" + Date.now() + i), name: "", role: "", message: "", stars: 5,
      date: "", published: true, ...r
    }));
    merged.reviewsSettings = { ...DEFAULT_DATA.reviewsSettings, ...(parsed.reviewsSettings || {}) };
    // Backfill "id"/"read"/"replies" on messages saved before the reply
    // system existed, and CRM fields ("leadStatus" etc.) added when the
    // Leads pipeline was introduced.
    merged.messages = (merged.messages || []).map((m, i) => ({
      id: m.id || ("m" + Date.parse(m.date || 0) + i),
      read: m.read || false,
      replies: m.replies || [],
      company: m.company || "",
      country: m.country || "",
      budget: m.budget || "",
      contactMethod: m.contactMethod || "Email",
      leadStatus: m.leadStatus || "New",
      priority: m.priority || "Normal",
      notes: m.notes || [],
      followUpDate: m.followUpDate || "",
      ...m
    }));
    return merged;
  } catch (e) {
    // Storage can be blocked (private browsing, browser policy, quota errors) or
    // contain malformed JSON. Keep the public site renderable even when persistence
    // is unavailable; do not recursively call saveData from this recovery path.
    console.warn("Bitvulex data could not be loaded; using defaults for this page view.", e);
    return structuredCloneSafe(DEFAULT_DATA);
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    // Callers can detect false and show a persistence warning. Avoid crashing the
    // UI when storage is unavailable or full.
    console.warn("Bitvulex changes could not be saved in this browser.", e);
    return false;
  }
}

function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* ---------------- Public-site render helpers ---------------- */

function renderTeamGrid(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const data = loadData();
  el.innerHTML = "";
  data.team.forEach(member => {
    const card = document.createElement("div");
    card.className = "card team-card";
    card.innerHTML = `
      <div class="team-photo">
        ${member.photo ? `<img src="${escapeHtml(member.photo)}" alt="${escapeHtml(member.name)}">` : `
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
          <span style="display:block; margin-top:8px;">Photo coming soon</span>
        `}
      </div>
      <div class="team-name">${escapeHtml(member.name)}</div>
      <div class="team-role">${escapeHtml(member.role)}</div>
      <p class="team-bio">${escapeHtml(member.bio)}</p>
    `;
    el.appendChild(card);
  });
}

function renderServicesFull(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const data = loadData();
  el.innerHTML = "";
  data.services.forEach(service => {
    const ov = getServiceOverview(service);
    const block = document.createElement("div");
    block.className = "service-block svc-story";
    block.id = `service-${service.id}`;
    block.setAttribute("data-service", service.id);
    const pkgUrl = `packages.html?service=${encodeURIComponent(service.id)}`;
    block.innerHTML = `
      <h2 class="svc-title">${escapeHtml(service.name)}</h2>
      <div class="svc-story-grid">
        <div class="svc-story-copy">
          <p class="svc-purpose">${escapeHtml(ov.purpose)}</p>
          <h3 class="svc-sub">What we offer</h3>
          <ul class="svc-offer">
            ${ov.types.map(t => `<li title="${escapeHtml(t.desc)}"><span class="svc-hex" aria-hidden="true"></span>${escapeHtml(t.title)}</li>`).join("")}
          </ul>
          <h3 class="svc-sub">Main uses</h3>
          <ul class="svc-benefits">
            ${ov.benefits.map(b => `<li><span class="svc-check" aria-hidden="true">&#10003;</span>${escapeHtml(b)}</li>`).join("")}
          </ul>
          <div class="svc-cta">
            <a href="demo.html?service=${encodeURIComponent(service.id)}" class="btn btn-ghost">Demo projects</a>
            <a href="${pkgUrl}" class="btn btn-primary">View packages &rarr;</a>
          </div>
        </div>
        <div class="svc-story-art">${serviceSceneHtml(service.id)}</div>
      </div>
    `;
    el.appendChild(block);
  });
  initScene3D(el);
  if (el.hasAttribute("data-one-by-one")) initServiceTabs(el, data.services);
}

/* Pointer-driven tilt for the 3D service scenes (auto-sway is pure CSS). */
function initScene3D(root) {
  if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  root.querySelectorAll(".s3d").forEach(scene => {
    const rig = scene.querySelector(".s3d-rig");
    let raf = 0;
    scene.addEventListener("pointermove", e => {
      const r = scene.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { rig.style.transform = `rotateY(${x * 34}deg) rotateX(${-y * 26}deg)`; });
    });
    scene.addEventListener("pointerleave", () => { rig.style.transform = ""; });
  });
}

/* packages.html — the packages for one service (?service=web), with links to the others. */
function renderPackagesPage(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const data = loadData();
  const services = data.services;
  const wanted = new URLSearchParams(location.search).get("service");
  let idx = services.findIndex(s => s.id === wanted);
  if (idx < 0) idx = 0;
  const service = services[idx];
  const next = services[(idx + 1) % services.length];
  document.title = `${service.name} Packages — Bitvulex`;
  el.innerHTML = `
    <div class="svc-tabs" role="navigation" aria-label="Service packages">
      ${services.map((sv, i) => `<a class="svc-tab ${i === idx ? "active" : ""}" href="packages.html?service=${encodeURIComponent(sv.id)}">${escapeHtml(sv.name)}</a>`).join("")}
    </div>
    <div class="service-block svc-in" data-service="${escapeHtml(service.id)}">
      <div class="service-block-head">
        <div><h2>${escapeHtml(service.name)} packages</h2><p>${escapeHtml(service.tagline)}</p></div>
        <a href="services.html#service-${encodeURIComponent(service.id)}" class="btn btn-ghost btn-sm">&larr; About this service</a>
      </div>
      <div class="pkg-grid">${service.packages.map(pkg => packageCardHtml(pkg, service.id)).join("")}</div>
    </div>
    <div class="svc-pager">
      <a class="btn btn-ghost btn-sm" href="services.html#service-${encodeURIComponent(service.id)}">&larr; Back to services</a>
      <a class="btn btn-ghost btn-sm" href="packages.html?service=${encodeURIComponent(next.id)}">Next: ${escapeHtml(next.name)} packages &rarr;</a>
    </div>`;
}

/* One service at a time: pill selector + prev/next, deep-linkable via #service-<id>. */
function initServiceTabs(el, services) {
  const blocks = [...el.querySelectorAll(".service-block")];
  if (blocks.length < 2) return;
  el.classList.add("svc-tabs-on");
  const nav = document.createElement("div");
  nav.className = "svc-tabs";
  nav.setAttribute("role", "tablist");
  nav.innerHTML = services.map((sv, i) =>
    `<button type="button" role="tab" class="svc-tab" data-i="${i}">${escapeHtml(sv.name)}</button>`).join("");
  el.insertBefore(nav, el.firstChild);
  const foot = document.createElement("div");
  foot.className = "svc-pager";
  foot.innerHTML = `<button type="button" class="btn btn-ghost btn-sm" data-dir="-1">&larr; Previous service</button>
    <span class="svc-dots"></span>
    <button type="button" class="btn btn-ghost btn-sm" data-dir="1">Next service &rarr;</button>`;
  el.appendChild(foot);
  let cur = 0;
  function show(i, scroll) {
    cur = (i + blocks.length) % blocks.length;
    blocks.forEach((b, k) => { b.hidden = k !== cur; if (k === cur) { b.classList.remove("svc-in"); void b.offsetWidth; b.classList.add("svc-in"); } });
    nav.querySelectorAll(".svc-tab").forEach((t, k) => { t.classList.toggle("active", k === cur); t.setAttribute("aria-selected", k === cur); });
    foot.querySelector(".svc-dots").innerHTML = blocks.map((_, k) => `<i class="${k === cur ? "on" : ""}"></i>`).join("");
    if (scroll) nav.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  nav.addEventListener("click", e => { const t = e.target.closest(".svc-tab"); if (t) { show(+t.dataset.i, false); history.replaceState(null, "", "#" + blocks[cur].id); } });
  foot.addEventListener("click", e => { const b = e.target.closest("[data-dir]"); if (b) { show(cur + +b.dataset.dir, true); history.replaceState(null, "", "#" + blocks[cur].id); } });
  const fromHash = () => { const k = blocks.findIndex(b => "#" + b.id === location.hash); show(k >= 0 ? k : 0, false); };
  window.addEventListener("hashchange", () => { fromHash(); nav.scrollIntoView({ behavior: "smooth", block: "start" }); });
  fromHash();
}

function renderServicesTeaser(containerId) {
  // used on homepage: just the Medium tier of each service, as a compact teaser
  const el = document.getElementById(containerId);
  if (!el) return;
  const data = loadData();
  el.innerHTML = "";
  data.services.forEach(service => {
    const mid = service.packages[1] || service.packages[0];
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-service", service.id);
    card.innerHTML = `
      <span class="tag">${escapeHtml(service.id)}</span>
      <h3>${escapeHtml(service.name)}</h3>
      <p>${escapeHtml(service.tagline)}</p>
      <p style="color:var(--cyan-soft); font-family:var(--font-mono); font-size:14px; margin-bottom:0;">
        From ${escapeHtml(service.packages[0].price)}
      </p>
    `;
    el.appendChild(card);
  });
}

function packageCardHtml(pkg, serviceId) {
  return `
    <div class="pkg-card ${pkg.featured ? "featured" : ""}">
      <div class="pkg-tier">${escapeHtml(pkg.tier)} package</div>
      <div class="pkg-name">${escapeHtml(pkg.tier)}</div>
      <div class="pkg-price">${escapeHtml(pkg.price)} <span>/ ${escapeHtml(pkg.period)}</span></div>
      <p class="pkg-desc">${escapeHtml(pkg.desc)}</p>
      <ul class="pkg-features">
        ${pkg.features.map(f => `<li>${escapeHtml(f)}</li>`).join("")}
      </ul>
      <a href="contact.html" class="btn ${pkg.featured ? "btn-primary" : "btn-ghost"} btn-block js-package-cta" data-pkg-tier="${escapeHtml(pkg.tier)}" data-pkg-price="${escapeHtml(pkg.price)}" ${serviceId ? `data-service="${escapeHtml(serviceId)}"` : ""}>Get this package</a>
    </div>
  `;
}

function getServiceById(data, id) {
  return (data.services || []).find(s => s.id === id) || null;
}

function blankProject() {
  return { title: "New project", image: "", description: "Describe this project in a sentence or two.", link: "" };
}

/* ---------------- Demo project cards (per-service showcase pages) ---------------- */

function projectCardHtml(project) {
  return `
    <div class="card project-card">
      <div class="project-photo">
        ${project.image ? `<img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}">` : `
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 15l-5-5-9 9"/></svg>
          <span style="display:block; margin-top:8px;">Preview coming soon</span>
        `}
      </div>
      <div class="project-title">${escapeHtml(project.title)}</div>
      <p class="project-desc">${escapeHtml(project.description)}</p>
      ${project.link && project.link.trim() ? `<a href="${escapeHtml(project.link.trim())}" class="btn btn-ghost btn-sm btn-block" target="_blank" rel="noopener noreferrer">View live demo</a>` : ""}
    </div>
  `;
}

// Renders a service's demo projects into containerId. Returns the number of
// projects rendered (used by initServiceDemoPage() to decide what else to show).
function renderProjectsGrid(serviceId, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return 0;
  const data = loadData();
  const service = getServiceById(data, serviceId);
  const projects = (service && service.projects) || [];
  if (projects.length === 0) {
    el.innerHTML = `
      <div class="card" style="text-align:center; padding:50px 30px;">
        <h3 style="margin-bottom:10px;">Demo projects coming soon</h3>
        <p style="max-width:440px; margin:0 auto;">We're preparing real project examples for this service — check back shortly, or get in touch and we'll walk you through our past work directly.</p>
      </div>
    `;
    return 0;
  }
  el.innerHTML = `<div class="projects-grid">${projects.map(projectCardHtml).join("")}</div>`;
  return projects.length;
}

// Homepage "Selected Work" teaser: pulls a handful of real projects across all
// services (one per service where possible) so the homepage never fabricates
// work — if the admin hasn't uploaded any projects yet, a clean coming-soon
// state is shown instead, matching the per-service demo page pattern above.
function featuredProjectCardHtml(project, serviceName, serviceId) {
  const cta = project.link && project.link.trim()
    ? `<a href="${escapeHtml(project.link.trim())}" class="btn btn-ghost btn-sm btn-block" target="_blank" rel="noopener noreferrer">View Project</a>`
    : `<a href="demo.html?service=${encodeURIComponent(serviceId)}" class="btn btn-ghost btn-sm btn-block">View Project</a>`;
  return `
    <div class="card project-card">
      <div class="project-photo">
        ${project.image ? `<img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}">` : `
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 15l-5-5-9 9"/></svg>
          <span style="display:block; margin-top:8px;">Preview coming soon</span>
        `}
      </div>
      <span class="tag" style="margin-bottom:8px;">${escapeHtml(serviceName)}</span>
      <div class="project-title">${escapeHtml(project.title)}</div>
      <p class="project-desc">${escapeHtml(project.description)}</p>
      ${cta}
    </div>
  `;
}

function renderFeaturedWork(containerId, maxItems) {
  const el = document.getElementById(containerId);
  if (!el) return 0;
  const data = loadData();
  const limit = maxItems || 6;
  const flattened = [];
  (data.services || []).forEach(service => {
    (service.projects || []).forEach(project => {
      flattened.push({ project, serviceName: service.name, serviceId: service.id });
    });
  });
  if (flattened.length === 0) {
    el.innerHTML = `
      <div class="card" style="text-align:center; padding:50px 30px;">
        <h3 style="margin-bottom:10px;">Selected work coming soon</h3>
        <p style="max-width:460px; margin:0 auto 22px;">We're adding real project examples here as they're ready to share. In the meantime, get in touch and we'll walk you through our past work directly.</p>
        <a href="contact.html" class="btn btn-primary">Talk about your project</a>
      </div>
    `;
    return 0;
  }
  const items = flattened.slice(0, limit);
  el.innerHTML = `<div class="projects-grid">${items.map(({ project, serviceName, serviceId }) => featuredProjectCardHtml(project, serviceName, serviceId)).join("")}</div>`;
  return items.length;
}

// Wires up demo.html, which is a single template shared by every service —
// each service gets its own URL via ?service=<id>, e.g. demo.html?service=web.
function initServiceDemoPage() {
  const params = new URLSearchParams(window.location.search);
  const serviceId = params.get("service");
  const data = loadData();
  const service = getServiceById(data, serviceId);

  const notFoundEl = document.getElementById("demo-not-found");
  const headerEl = document.getElementById("demo-page-header");
  const gridSection = document.getElementById("demo-grid-section");

  if (!service) {
    if (headerEl) headerEl.style.display = "none";
    if (gridSection) gridSection.style.display = "none";
    if (notFoundEl) notFoundEl.style.display = "";
    document.title = "Demo Projects — Bitvulex";
    return;
  }

  document.title = `${service.name} — Demo Projects — Bitvulex`;
  const titleEl = document.getElementById("demo-title");
  const taglineEl = document.getElementById("demo-tagline");
  if (titleEl) titleEl.textContent = `${service.name} — real project examples`;
  if (taglineEl) taglineEl.textContent = service.tagline || "";
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) descMeta.setAttribute("content", `See real ${service.name} projects delivered by Bitvulex. ${service.tagline || ""}`.trim());

  renderProjectsGrid(service.id, "demo-projects-grid");
}

function blankPackage(tier) {
  return {
    tier: tier,
    price: "PKR 0",
    period: "one-time",
    desc: "Describe what's included in this tier.",
    features: ["Feature one", "Feature two"],
    featured: false
  };
}

function slugify(name) {
  const base = String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "service";
  return base;
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* ---------------- Social links (icon auto-matched by platform name) ---------------- */

// Each entry: keywords to match against the admin-typed platform name (lowercased,
// substring match) -> an inline SVG body (viewBox 0 0 24 24, stroke-based to match
// the site's existing icon language). First match wins; nothing matches -> "website".
const SOCIAL_ICONS = [
  { key: "facebook", test: ["facebook", "fb"], svg: '<path d="M14.5 8.5h2.3V5.7h-2.3c-2 0-3.6 1.6-3.6 3.6v1.8H8.7v3h2.2V21h3v-6.9h2.3l.6-3h-2.9v-1.8c0-.4.3-.8.8-.8Z"/>' },
  { key: "instagram", test: ["instagram", "insta"], svg: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none"/>' },
  { key: "twitter", test: ["twitter", "x.com", "\"x\"", " x ", "x (twitter)"], svg: '<path d="M4.5 4.5l15 15M19.5 4.5l-15 15"/>' },
  { key: "linkedin", test: ["linkedin"], svg: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><line x1="7.7" y1="10" x2="7.7" y2="17"/><circle cx="7.7" cy="6.8" r="1.15" fill="currentColor" stroke="none"/><path d="M11.3 17v-4.3c0-1.6 1-2.7 2.5-2.7s2.4 1 2.4 2.6V17"/><line x1="11.3" y1="10" x2="11.3" y2="17"/>' },
  { key: "youtube", test: ["youtube", "yt"], svg: '<rect x="3" y="6" width="18" height="12" rx="4"/><path d="M10.8 9.6l4.6 2.4-4.6 2.4z" fill="currentColor" stroke="none"/>' },
  { key: "github", test: ["github"], svg: '<path d="M12 2.5a9.8 9.8 0 0 0-3.1 19c.5.1.7-.2.7-.5v-1.7c-2.7.6-3.3-1.3-3.3-1.3-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.8.8.1-.6.3-1.1.6-1.3-2.2-.2-4.5-1.1-4.5-4.8 0-1.1.4-2 1-2.6-.1-.2-.4-1.2.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.6.6.6 1 1.5 1 2.6 0 3.7-2.3 4.6-4.5 4.8.4.3.7.9.7 1.8v2.7c0 .3.2.6.7.5A9.8 9.8 0 0 0 12 2.5Z"/>' },
  { key: "tiktok", test: ["tiktok", "tik tok"], svg: '<path d="M14 3.5v9.8a3.3 3.3 0 1 1-2.8-3.3"/><path d="M14 3.5c.4 2.1 1.9 3.7 4.2 4"/>' },
  { key: "whatsapp", test: ["whatsapp", "whats app"], svg: '<path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.2A8.5 8.5 0 1 0 12 3.5Z"/><path d="M8.8 8.9c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.4l.6 1.4c.1.2 0 .4-.1.6l-.4.5c-.1.1-.1.3 0 .4.4.7 1.3 1.5 2 1.9.1.1.3.1.4 0l.5-.4c.2-.1.4-.1.6 0l1.4.7c.2.1.3.2.3.4 0 .7-.8 1.3-1.4 1.3-1.8 0-4.9-2-5.6-5.5-.1-.5.1-1 .5-1.2Z" fill="currentColor" stroke="none"/>' },
  { key: "telegram", test: ["telegram", "tg"], svg: '<path d="M21 4.5L3.5 11.3l5.6 1.8M21 4.5l-3.7 15-8-4.6M21 4.5L8.5 14.3"/>' },
  { key: "discord", test: ["discord"], svg: '<rect x="4" y="6.5" width="16" height="11" rx="5.5"/><circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none"/>' },
  { key: "pinterest", test: ["pinterest"], svg: '<circle cx="12" cy="12" r="8.5"/><path d="M9.7 19c.4-1.7 1.4-5.6 1.4-5.6s-.4-.7-.4-1.8c0-1.7.9-2.9 2.1-2.9 1 0 1.5.7 1.5 1.6 0 1-.6 2.5-1 3.9-.2 1.1.6 2 1.7 2 2 0 3.5-2.6 3.5-5.7 0-2.4-1.7-4.1-4.6-4.1-3.3 0-5.4 2.5-5.4 5.2 0 1 .4 1.7.7 2.2.1.1.1.2.1.4l-.3.9c0 .2-.2.3-.4.2-1.3-.5-1.9-2-1.9-3.6" fill="currentColor" stroke="none"/>' },
  { key: "snapchat", test: ["snapchat", "snap"], svg: '<path d="M12 3.5c2.4 0 4.2 2 4.1 4.5l.1 1.9c.9.2 1.4.5 1.4.9s-.5.7-1.4.9c-.2.5-.5 1.1-1.3 1.8.2.4.9.8 1.8.9-.1.5-.9.9-1.7 1-.2.4-.5.9-1.6.9-.8 0-1.2.5-2.2.5s-1.4-.5-2.2-.5c-1.1 0-1.4-.5-1.6-.9-.9 0-1.6-.4-1.7-1 .9-.1 1.6-.5 1.8-.9-.9-.7-1.1-1.3-1.3-1.8-.9-.2-1.4-.6-1.4-.9s.5-.7 1.4-.9l.1-1.9c-.1-2.5 1.9-4.5 4.1-4.5Z"/>' },
  { key: "threads", test: ["threads"], svg: '<path d="M12 3.5c-3.8 0-6.3 2.3-6.3 7.5S8.2 20.5 12 20.5c3 0 5.5-1.5 5.9-4.4M12 3.5c3.5 0 5.6 2 5.9 5"/><path d="M9.7 12c0-1.5 1.2-2.6 2.9-2.6 2 0 3.1 1.3 3.1 2.9 0 2.2-1.6 3.3-3.4 3.3-1.3 0-2.2-.7-2.2-1.6 0-1.3 1.4-1.8 3.1-1.8.9 0 1.7.2 2.2.4"/>' },
  { key: "email", test: ["email", "mail"], svg: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4.5 7l7.5 6 7.5-6"/>' }
];
const SOCIAL_ICON_DEFAULT = '<circle cx="12" cy="12" r="8.5"/><line x1="3.5" y1="12" x2="20.5" y2="12"/><path d="M12 3.5c2.3 2.3 3.6 5.4 3.6 8.5s-1.3 6.2-3.6 8.5c-2.3-2.3-3.6-5.4-3.6-8.5s1.3-6.2 3.6-8.5Z"/>';

function matchSocialIcon(platform) {
  const name = String(platform || "").toLowerCase().trim();
  for (const entry of SOCIAL_ICONS) {
    if (entry.test.some(t => name.includes(t))) return entry.svg;
  }
  return SOCIAL_ICON_DEFAULT;
}

function socialIconSvg(platform, extraClass) {
  return `<svg class="social-icon ${extraClass || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${matchSocialIcon(platform)}</svg>`;
}

function renderSocialLinks(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const data = loadData();
  const links = (data.settings.social || []).filter(s => s.url && s.url.trim());
  el.innerHTML = "";
  if (links.length === 0) return;
  links.forEach(s => {
    const a = document.createElement("a");
    a.className = "social-btn";
    a.href = s.url.trim();
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", s.platform || "Social link");
    a.title = s.platform || "";
    a.innerHTML = socialIconSvg(s.platform);
    el.appendChild(a);
  });
}

/* ---------------- Growth / track-record chart (homepage) ---------------- */

function renderStatsChart(svgId, numbersId) {
  const svgWrap = document.getElementById(svgId);
  const data = loadData();
  const points = (data.stats && data.stats.points) || [];
  if (svgWrap) {
    const headline = document.getElementById(svgId + "-headline");
    const subline = document.getElementById(svgId + "-subline");
    if (headline) headline.textContent = data.stats.headline || "Trusted by growing businesses";
    if (subline) subline.textContent = data.stats.subline || "";
  }
  if (numbersId) {
    const numEl = document.getElementById(numbersId);
    if (numEl && points.length) {
      const latest = points[points.length - 1].value;
      const first = points[0].value;
      const total = points.reduce((sum, p) => sum + Number(p.value || 0), 0);
      const growth = first > 0 ? Math.round(((latest - first) / first) * 100) : 0;
      const unit = data.stats.unitLabel || "clients";
      numEl.innerHTML = `
        <div class="stat-num"><b>${latest}+</b><span>${escapeHtml(unit)} this year</span></div>
        <div class="stat-num"><b>${total}+</b><span>${escapeHtml(unit)} all-time</span></div>
        <div class="stat-num"><b>${growth >= 0 ? "+" : ""}${growth}%</b><span>growth since ${escapeHtml(String(points[0].label))}</span></div>
      `;
    }
  }
  if (!svgWrap || points.length === 0) return;

  const W = 640, H = 260, padL = 30, padR = 16, padT = 20, padB = 34;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const max = Math.max(...points.map(p => Number(p.value) || 0), 1);
  const barGap = chartW / points.length;
  const barW = Math.min(52, barGap * 0.5);

  let bars = "";
  let labels = "";
  points.forEach((p, i) => {
    const val = Number(p.value) || 0;
    const bh = (val / max) * chartH;
    const cx = padL + barGap * i + barGap / 2;
    const x = cx - barW / 2;
    const y = padT + (chartH - bh);
    bars += `
      <g class="chart-bar" style="transition-delay:${i * 90}ms">
        <rect class="chart-bar-track" x="${x.toFixed(1)}" y="${padT}" width="${barW.toFixed(1)}" height="${chartH}" rx="6"></rect>
        <rect class="chart-bar-fill" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="6" data-h="${bh.toFixed(1)}" data-y="${y.toFixed(1)}"></rect>
        <text class="chart-value" x="${cx.toFixed(1)}" y="${(y - 10).toFixed(1)}" text-anchor="middle">${val}</text>
      </g>`;
    labels += `<text class="chart-label" x="${cx.toFixed(1)}" y="${H - 10}" text-anchor="middle">${escapeHtml(String(p.label))}</text>`;
  });

  svgWrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" class="growth-svg">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="var(--blue)"></stop>
          <stop offset="100%" stop-color="var(--cyan)"></stop>
        </linearGradient>
      </defs>
      <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" class="chart-axis"></line>
      ${bars}
      ${labels}
    </svg>`;

  // animate bars growing in once visible
  const grow = () => {
    svgWrap.querySelectorAll(".chart-bar-fill").forEach(rect => {
      rect.style.transformOrigin = "bottom";
      requestAnimationFrame(() => rect.classList.add("grown"));
    });
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { grow(); io.disconnect(); }
      });
    }, { threshold: 0.3 });
    io.observe(svgWrap);
  } else {
    grow();
  }
}

/* ---------------- SEO: Organization structured data (JSON-LD) ---------------- */
/* Built from live admin data (name, description, logo, social links) so it
   always reflects whatever the admin has configured — see Admin > Social Links. */
function renderOrgSchema() {
  try {
    const data = loadData();
    const origin = window.location.origin && window.location.origin !== "null" ? window.location.origin : "";
    const descMeta = document.querySelector('meta[name="description"]');
    const sameAs = (data.settings.social || []).filter(s => s.url && s.url.trim()).map(s => s.url.trim());
    const schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Bitvulex",
      "url": origin ? origin + "/index.html" : "",
      "logo": origin ? origin + "/assets/logo-mark.png" : "assets/logo-mark.png",
      "description": descMeta ? descMeta.getAttribute("content") : "Bitvulex builds web platforms, mobile apps and POS software for growing businesses.",
      "email": data.settings.contactEmail || undefined,
      "sameAs": sameAs
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "org-schema";
    script.textContent = JSON.stringify(schema);
    const existing = document.getElementById("org-schema");
    if (existing) existing.remove();
    document.head.appendChild(script);
  } catch (e) { /* schema injection is non-critical */ }
}

/* ---------------- Contact form handling ---------------- */

// The address that new messages / package inquiries get emailed to.
// Set from the Admin Panel under My Account -> Notification email
// (the administrator account's email). Falls back to the general
// contact inbox address if that hasn't been set yet.
function getNotifyEmail(data) {
  const admin = (data.admin && data.admin.users || []).find(u => u.role === "administrator");
  if (admin && admin.email && admin.email.includes("@")) return admin.email;
  return data.settings.contactEmail;
}

// Shared by the full contact form and the package-selection quick form.
// Saves the lead so it shows up under Admin > Messages, then tries to
// email it via EmailJS (if configured) or falls back to a mailto: draft.
async function submitLead(payload, statusEl) {
  const data = loadData();
  const notifyEmail = getNotifyEmail(data);
  payload.to_email = notifyEmail;
  // reply_to lets the admin hit "Reply" in their own inbox and have it go
  // straight back to the client — set this as the Reply-To field on the
  // EmailJS template (see admin/email-template.html for the template).
  payload.reply_to = payload.email;
  // Human-readable date/time for the email template ({{sent_on}}). "date"
  // stays an ISO string for storage/sorting in the admin Messages panel.
  payload.sent_on = new Date(payload.date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  data.messages.unshift(payload);
  data.messages = data.messages.slice(0, 200);
  saveData(data);

  const { emailjsServiceId, emailjsTemplateId, emailjsPublicKey } = data.settings;

  if (emailjsServiceId && emailjsTemplateId && emailjsPublicKey && window.emailjs) {
    try {
      await emailjs.send(emailjsServiceId, emailjsTemplateId, payload, emailjsPublicKey);
      showStatus(statusEl, "ok", "Thanks for reaching out. We've received your project request and will get back to you shortly.");
      return true;
    } catch (err) {
      console.error("EmailJS send failed:", err);
      showStatus(statusEl, "err", "Couldn't send automatically. Please email us directly at " + notifyEmail + " — your message has also been saved.");
      return true;
    }
  }

  // Fallback when email delivery isn't configured yet: open a pre-filled
  // email draft so the message still reaches the inbox.
  const subject = encodeURIComponent(`Website enquiry from ${payload.name || "a visitor"}`);
  const body = encodeURIComponent(
    `Name: ${payload.name}\nEmail: ${payload.email}\nPhone: ${payload.phone}\nService: ${payload.service}\n\n${payload.message}`
  );
  showStatus(statusEl, "ok", "Thanks for reaching out. We've received your project request and will get back to you shortly. (Opening your email app to also send it to " + notifyEmail + " — set up EmailJS in the Admin Panel to send this automatically instead.)");
  window.location.href = `mailto:${notifyEmail}?subject=${subject}&body=${body}`;
  return true;
}

function initContactForm(formId, statusId) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const field = (name) => (form[name] ? form[name].value.trim() : "");
    const payload = {
      id: "m" + Date.now() + Math.random().toString(36).slice(2, 7),
      name: field("name"),
      company: field("company"),
      email: field("email"),
      phone: field("phone"),
      country: field("country"),
      service: form.service ? form.service.value : "",
      budget: form.budget ? form.budget.value : "",
      contactMethod: form.contactMethod ? form.contactMethod.value : "Email",
      message: field("message"),
      date: new Date().toISOString(),
      // Inbox status (Messages panel): Unread / Read / Replied / Archived
      read: false,
      replies: [],
      // CRM status (Leads panel pipeline): New / Contacted / Qualified /
      // Proposal Sent / Negotiation / Won / Lost
      leadStatus: "New",
      priority: "Normal",
      notes: [],
      followUpDate: "",
      // Where this lead came from — first-touch referrer for the session,
      // captured by analytics.js. Powers "projects by source" in the admin
      // dashboard. Falls back to "Direct" if analytics.js isn't loaded.
      source: (typeof getAttributionSource === "function") ? getAttributionSource() : "Direct"
    };

    await submitLead(payload, status);
    form.reset();
  });
}

function showStatus(el, kind, msg) {
  if (!el) return;
  el.className = `form-status ${kind}`;
  el.textContent = msg;
}


/* ---------------- Reviews carousel (homepage) ---------------- */

function starsSvg(n) {
  let out = "";
  for (let i = 1; i <= 5; i++) {
    out += `<svg class="star ${i <= n ? "on" : ""}" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>`;
  }
  return `<span class="stars" role="img" aria-label="${n} out of 5 stars">${out}</span>`;
}

function reviewAgo(dateStr) {
  const d = Date.parse(dateStr);
  if (!d) return "";
  const days = Math.floor((Date.now() - d) / 86400000);
  if (days < 1) return "today";
  if (days < 31) return days + (days === 1 ? " day ago" : " days ago");
  const m = Math.floor(days / 30.4);
  if (m < 12) return m + (m === 1 ? " month ago" : " months ago");
  const y = Math.floor(m / 12);
  return y + (y === 1 ? " year ago" : " years ago");
}

function renderReviewsCarousel() {
  const root = document.getElementById("reviews-section");
  if (!root) return;
  const data = loadData();
  const list = (data.reviews || []).filter(r => r.published && r.name && r.message);
  if (!list.length) { root.hidden = true; return; }
  root.hidden = false;
  const cfg = data.reviewsSettings;
  const avg = list.reduce((a, r) => a + Number(r.stars || 0), 0) / list.length;
  const rounded = Math.round(avg);

  document.getElementById("reviews-title").textContent = cfg.title;
  document.getElementById("reviews-summary").innerHTML = `
    <div class="rv-biz">${escapeHtml(cfg.businessName)}</div>
    ${starsSvg(rounded)}
    <div class="rv-avg">${avg.toFixed(1)} average</div>
    <div class="rv-count">${list.length} client review${list.length === 1 ? "" : "s"}</div>
    <a class="btn btn-primary btn-sm" href="${escapeHtml(cfg.ctaLink)}">${escapeHtml(cfg.ctaLabel)}</a>`;

  const track = document.getElementById("reviews-track");
  track.innerHTML = list.map(r => {
    const ago = r.date ? reviewAgo(r.date) : "";
    const long = r.message.length > 150;
    return `<article class="rv-card" tabindex="0">
      <header class="rv-head">
        <span class="rv-avatar" aria-hidden="true">${escapeHtml(r.name.trim().charAt(0).toUpperCase())}</span>
        <div class="rv-who"><strong>${escapeHtml(r.name)}</strong>
          <small>${escapeHtml([r.role, ago].filter(Boolean).join(" · "))}</small></div>
      </header>
      <div class="rv-rating">${starsSvg(Number(r.stars) || 5)}
        <span class="rv-verified" title="Added by Bitvulex admin">✔</span></div>
      <p class="rv-text clamp">${escapeHtml(r.message)}</p>
      ${long ? `<button type="button" class="rv-more">Read more</button>` : ""}
    </article>`;
  }).join("");

  track.querySelectorAll(".rv-more").forEach(b => b.addEventListener("click", () => {
    const t = b.previousElementSibling;
    const open = t.classList.toggle("clamp");
    b.textContent = open ? "Read more" : "Show less";
  }));

  const prev = document.getElementById("reviews-prev");
  const next = document.getElementById("reviews-next");
  const step = () => Math.max(260, track.clientWidth * 0.8);
  prev.onclick = () => track.scrollBy({ left: -step(), behavior: "smooth" });
  next.onclick = () => track.scrollBy({ left: step(), behavior: "smooth" });
  const upd = () => {
    prev.disabled = track.scrollLeft < 4;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  track.onscroll = upd; upd();
  window.addEventListener("resize", upd);
}
