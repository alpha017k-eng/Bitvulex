/* ============================================================
   BITVULEX — Shared front-end behavior
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initMobileNavHeight();

  // mobile nav toggle
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    // Give the full-width mobile menu its own prominent "Start a project"
    // CTA (the header's own CTA button is hidden on small screens).
    const headerCta = document.querySelector(".nav-cta .btn-primary");
    if (headerCta && !links.querySelector(".nav-cta-mobile")) {
      const ctaClone = headerCta.cloneNode(true);
      ctaClone.classList.remove("btn-sm");
      ctaClone.classList.add("nav-cta-mobile", "btn-block");
      links.appendChild(ctaClone);
    }
    toggle.addEventListener("click", () => {
      links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", links.classList.contains("open"));
      document.body.classList.toggle("nav-open", links.classList.contains("open"));
    });
    links.querySelectorAll("a").forEach(a =>
      a.addEventListener("click", () => {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      })
    );
  }

  // active nav link based on current file (top nav + mobile bottom dock)
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a, .bottom-nav a").forEach(a => {
    const href = a.getAttribute("href");
    if (href === current) a.classList.add("active");
  });

  // footer year
  document.querySelectorAll(".js-year").forEach(el => (el.textContent = new Date().getFullYear()));

  initHero3D();
  if (typeof renderReviewsCarousel === "function") renderReviewsCarousel();
  initFooter3D();
  initThemeToggle();
  initParticles();
  initTilt();
  initAuroraParallax();
  initScrollReveal();
  initPackageModal();
  initHeroCarousel();
  initPricingTabs();
  initScrollProgress();
  initButtonRipple();
  initBackToTop();
  initBottomNavActiveState();
  initCountUpOnView();
  initPkgCarousel();

  if (typeof renderSocialLinks === "function") renderSocialLinks("footer-social");
  if (typeof renderOrgSchema === "function") renderOrgSchema();
});

/* ---------------- Mobile hero carousel ----------------
   Builds the dot indicators for the swipeable service carousel that
   replaces the stacked hero copy on small screens, and keeps the
   active dot synced to whichever slide is centred while the visitor
   swipes. Purely additive — the carousel markup itself is only shown
   below 768px via CSS, so this is a no-op on desktop/tablet. */
function initHeroCarousel() {
  const track = document.getElementById("hero-carousel");
  const dotsWrap = document.getElementById("hero-dots");
  if (!track || !dotsWrap) return;
  const slides = Array.from(track.children);
  if (!slides.length) return;

  dotsWrap.innerHTML = slides.map((_, i) => `<span${i === 0 ? ' class="active"' : ""}></span>`).join("");
  const dots = Array.from(dotsWrap.children);

  const setActive = index => {
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
  };

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      slides[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(slides.indexOf(entry.target));
        });
      },
      { root: track, threshold: 0.6 }
    );
    slides.forEach(s => io.observe(s));
  }
}

/* ---------------- Mobile pricing tabs ----------------
   On the services page, each service ships three package tiers
   (Standard / Medium / Large) stacked in a .pkg-grid. On small
   screens this injects a segmented tab control above each grid so
   visitors flip between tiers instead of scrolling a long column —
   see .mobile-tabs / .pkg-grid.has-mobile-tabs in css/style.css.
   The grid keeps rendering every card normally on tablet/desktop;
   this only changes what's visible below 768px. */
function initPricingTabs() {
  document.querySelectorAll(".pkg-grid").forEach(grid => {
    if (grid.dataset.tabsInit) return;
    const cards = Array.from(grid.querySelectorAll(".pkg-card"));
    if (cards.length < 2) return;
    grid.dataset.tabsInit = "1";

    const tabs = document.createElement("div");
    tabs.className = "mobile-tabs";
    cards.forEach((card, i) => {
      const tierEl = card.querySelector(".pkg-name");
      const tier = tierEl ? tierEl.textContent.trim() : `Tier ${i + 1}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = tier;
      const defaultIndex = cards.findIndex(c => c.classList.contains("featured"));
      const activeIndex = defaultIndex === -1 ? 0 : defaultIndex;
      if (i === activeIndex) btn.classList.add("active");
      btn.addEventListener("click", () => {
        tabs.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        cards.forEach((c, j) => c.classList.toggle("tab-active", j === i));
      });
      tabs.appendChild(btn);
      card.classList.toggle("tab-active", i === activeIndex);
    });

    grid.classList.add("has-mobile-tabs");
    grid.parentNode.insertBefore(tabs, grid);
  });
}

/* ---------------- Package quick-inquiry modal ----------------
   "Get this package" no longer sends visitors to the full contact form —
   it opens a short modal asking only for name, email and phone. On submit
   the lead is saved (shows up under Admin > Messages) and emailed to the
   administrator's notification email (Admin > My Account), same delivery
   path as the full contact form (see submitLead() in js/data.js). */
function initPackageModal() {
  const triggers = document.querySelectorAll(".js-package-cta");
  if (!triggers.length) return;
  if (typeof loadData !== "function" || typeof submitLead !== "function") return;

  let modal = null;

  function buildModal() {
    const wrap = document.createElement("div");
    wrap.className = "pkg-modal-overlay";
    wrap.id = "pkg-modal-overlay";
    wrap.innerHTML = `
      <div class="pkg-modal" role="dialog" aria-modal="true" aria-labelledby="pkg-modal-title">
        <button type="button" class="pkg-modal-close" id="pkg-modal-close" aria-label="Close">&times;</button>
        <div class="eyebrow" id="pkg-modal-eyebrow">Package</div>
        <h3 id="pkg-modal-title">Tell us where to reach you</h3>
        <p class="sub" id="pkg-modal-sub">Just your name, email and phone — we'll follow up with next steps.</p>
        <form id="pkg-modal-form">
          <div class="field">
            <label for="pkg-modal-name">Full name</label>
            <input type="text" id="pkg-modal-name" name="name" required autocomplete="name">
          </div>
          <div class="field">
            <label for="pkg-modal-email">Email</label>
            <input type="email" id="pkg-modal-email" name="email" required autocomplete="email">
          </div>
          <div class="field">
            <label for="pkg-modal-phone">Phone number</label>
            <input type="tel" id="pkg-modal-phone" name="phone" required autocomplete="tel">
          </div>
          <button type="submit" class="btn btn-primary btn-block">Send message</button>
          <div class="form-status" id="pkg-modal-status"></div>
        </form>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.addEventListener("click", (e) => { if (e.target === wrap) closeModal(); });
    wrap.querySelector("#pkg-modal-close").addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && wrap.classList.contains("open")) closeModal();
    });
    wrap.querySelector("#pkg-modal-form").addEventListener("submit", handleSubmit);
    return wrap;
  }

  function openModal(trigger) {
    if (!modal) modal = buildModal();
    const tier = trigger.dataset.pkgTier || "";
    const price = trigger.dataset.pkgPrice || "";
    const serviceId = trigger.dataset.service || "";
    let serviceName = serviceId;
    try {
      const data = loadData();
      const svc = (data.services || []).find(s => s.id === serviceId);
      if (svc) serviceName = svc.name;
    } catch (e) {}

    modal.dataset.tier = tier;
    modal.dataset.service = serviceName;
    modal.dataset.price = price;
    modal.querySelector("#pkg-modal-eyebrow").textContent = [tier, serviceName].filter(Boolean).join(" · ") || "Package";
    modal.querySelector("#pkg-modal-sub").textContent = price
      ? `${tier ? tier + " package" : "This package"} — ${price}. Just your name, email and phone — we'll follow up with next steps.`
      : "Just your name, email and phone — we'll follow up with next steps.";
    modal.querySelector("#pkg-modal-status").textContent = "";
    modal.querySelector("#pkg-modal-status").className = "form-status";
    modal.querySelector("#pkg-modal-form").reset();
    modal.classList.add("open");
    document.body.classList.add("modal-open");
    setTimeout(() => modal.querySelector("#pkg-modal-name").focus(), 50);
  }

  function closeModal() {
    if (modal) modal.classList.remove("open");
    document.body.classList.remove("modal-open");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById("pkg-modal-status");
    const tier = modal.dataset.tier || "";
    const serviceName = modal.dataset.service || "";
    const price = modal.dataset.price || "";

    const payload = {
      id: "m" + Date.now() + Math.random().toString(36).slice(2, 7),
      name: form.name.value.trim(),
      company: "",
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      country: "",
      service: serviceName,
      budget: price || "",
      contactMethod: "Email",
      message: `Package inquiry: ${tier ? tier + " package" : "package"}${serviceName ? " — " + serviceName : ""}${price ? " (" + price + ")" : ""}.`,
      date: new Date().toISOString(),
      read: false,
      replies: [],
      leadStatus: "New",
      priority: "Normal",
      notes: [],
      followUpDate: "",
      source: (typeof getAttributionSource === "function") ? getAttributionSource() : "Direct"
    };

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    await submitLead(payload, status);
    submitBtn.disabled = false;
    form.reset();
    setTimeout(closeModal, 1600);
  }

  triggers.forEach(trigger => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      openModal(trigger);
    });
  });
}

/* ---------------- Mobile nav height sync ----------------
   .site-header is position:sticky, which makes it the containing block
   for its position:fixed descendants — including the full-screen mobile
   .nav-links panel. That used to crush the open menu to the header's own
   (short) height instead of the viewport, so most links were invisible.
   Fix: measure the header's real rendered height and expose it as
   --header-h, which css/style.css uses with viewport units (vh/dvh) to
   size the panel — those are always resolved against the real viewport,
   never the containing block, so the menu now reliably fills the screen. */
function initMobileNavHeight() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const setVar = () => {
    document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
  };
  setVar();
  window.addEventListener("resize", setVar);
  window.addEventListener("orientationchange", setVar);
  if ("ResizeObserver" in window) {
    new ResizeObserver(setVar).observe(header);
  }
}

/* ---------------- Theme toggle ----------------
   The <html data-theme="dark|light"> attribute is set as early as possible
   by an inline script in each page's <head> (reads bitvulex_theme_override,
   falling back to the admin's site-wide default in bitvulex_data.settings.theme).
   This just wires up the header button to flip it and remember the choice. */
function initThemeToggle() {
  document.querySelectorAll(".theme-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      const next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      btn.setAttribute("aria-label", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
      btn.setAttribute("title", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
      try { localStorage.setItem("bitvulex_theme_override", next); } catch (e) {}
    });
  });
}

/* ---------------- Ambient background particles ----------------
   A lightweight full-screen canvas of drifting, softly-connected dots,
   sitting behind every page (z-index:0, see .bg-particles in style.css). */
function initParticles() {
  const canvas = document.getElementById("bg-particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w, h, dots;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const count = Math.max(24, Math.min(48, Math.floor((w * h) / 36000)));
    dots = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.16,
      vy: (Math.random() - 0.5) * 0.16,
      r: Math.random() * 1.6 + 0.6
    }));
  }
  resize();
  window.addEventListener("resize", resize);

  function isLight() {
    return document.documentElement.getAttribute("data-theme") === "light";
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const base = isLight() ? "47,107,255" : "79,216,255";
    dots.forEach(d => {
      if (!reduceMotion) {
        d.x += d.vx;
        d.y += d.vy;
      }
      if (d.x < 0) d.x = w; if (d.x > w) d.x = 0;
      if (d.y < 0) d.y = h; if (d.y > h) d.y = 0;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${base},0.55)`;
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    });
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.strokeStyle = `rgba(${base},${(0.12 * (1 - dist / 120)).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ---------------- 3D tilt on cards ----------------
   CSS-perspective tilt that follows the cursor (desktop) or a finger drag
   (touch), plus a directional "raised surface" shadow that shifts opposite
   the tilt — the combination is what sells depth, rather than rotation
   alone. Applied to every .card / .pkg-card / .team-card on the page,
   on every device, so the site feels equally 3D on phones as on desktop. */
function initTilt() {
  const items = document.querySelectorAll(".card, .pkg-card, .team-card");
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  function applyTiltFromPoint(el, clientX, clientY) {
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);

    const rotX = (0.5 - y) * 4;
    const rotY = (x - 0.5) * 5;
    el.style.transform = `perspective(1100px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-3px) translateZ(3px)`;

    // shadow falls opposite the tilt, like light hitting a raised card
    const shadowX = (-(x - 0.5) * 16).toFixed(1);
    const shadowY = (14 - (0.5 - y) * 8).toFixed(1);
    el.style.boxShadow = `${shadowX}px ${shadowY}px 28px -18px rgba(2,8,20,.48), 0 0 24px -16px rgba(139,123,255,.22)`;
  }

  function resetTilt(el) {
    el.style.transform = "";
    el.style.boxShadow = "";
    el.classList.remove("touch-active");
  }

  items.forEach(el => {
    el.classList.add("tilt");

    if (!isTouch) {
      el.addEventListener("mousemove", e => applyTiltFromPoint(el, e.clientX, e.clientY));
      el.addEventListener("mouseleave", () => resetTilt(el));
      return;
    }

    // Touch devices: a light finger-drag over the card drives the same
    // tilt math as the mouse, so phones/tablets get real 3D interaction
    // instead of a static card.
    el.addEventListener("touchstart", e => {
      el.classList.add("touch-active");
      const t = e.touches[0];
      if (t) applyTiltFromPoint(el, t.clientX, t.clientY);
    }, { passive: true });
    el.addEventListener("touchmove", e => {
      const t = e.touches[0];
      if (t) applyTiltFromPoint(el, t.clientX, t.clientY);
    }, { passive: true });
    el.addEventListener("touchend", () => resetTilt(el));
    el.addEventListener("touchcancel", () => resetTilt(el));
  });
}

/* ---------------- Aurora parallax ----------------
   The ambient glow blobs (see .aurora in css/style.css) drift on their own
   via keyframes; this layers a subtle cursor-following translate on the
   wrapper itself so the whole background has a sense of depth relative
   to the page content sitting above it. */
function initAuroraParallax() {
  const aurora = document.querySelector(".aurora");
  if (!aurora) return;
  const isTouch = window.matchMedia("(hover: none)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (isTouch || reduceMotion) return;
  window.addEventListener("mousemove", e => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    aurora.style.transform = `translate(${(x * 16).toFixed(1)}px, ${(y * 16).toFixed(1)}px)`;
  }, { passive: true });
}

/* ---------------- Scroll reveal ----------------
   Cards, section headers and stat tiles rise into place with a slight
   rotateX as they enter the viewport, echoing the tilt cards' 3D language.
   Progressive enhancement only: the .reveal class (which starts things
   invisible) is added by this function itself, only once IntersectionObserver
   and motion are both available, so nothing is ever hidden without JS. */
function initScrollReveal() {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const targets = document.querySelectorAll(".card, .pkg-card, .team-card, .section-head, .chart-card, .stat-tile");
  if (!targets.length) return;

  targets.forEach(el => el.classList.add("reveal"));

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal-in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

  targets.forEach(el => io.observe(el));
}

/* ---------------- 3D footer: floor grid, rise-in, cursor tilt + spotlight ----------------
   All visual work is CSS (see "3D ANIMATED FOOTER" in css/style.css). This only
   adds the floor element, toggles state classes, and feeds pointer position into
   CSS variables. Pointer effects run on mouse/trackpad only and respect
   prefers-reduced-motion. */
function initFooter3D() {
  const footer = document.querySelector(".site-footer");
  if (!footer) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!footer.querySelector(".footer-floor")) {
    const floor = document.createElement("div");
    floor.className = "footer-floor";
    floor.setAttribute("aria-hidden", "true");
    footer.prepend(floor);
  }

  if ("IntersectionObserver" in window) {
    if (!reduce) footer.classList.add("f3d-ready");
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        footer.classList.toggle("f3d-live", entry.isIntersecting);   // floor animates only while visible
        if (entry.isIntersecting) footer.classList.add("f3d-in");
      });
    }, { threshold: 0.12 });
    io.observe(footer);
  }

  if (reduce || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  let raf = 0, fx = 0, fy = 0;
  footer.addEventListener("pointerenter", () => footer.classList.add("f3d-hot"));
  footer.addEventListener("pointermove", e => {
    const r = footer.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    fx = x * 2 - 1; fy = y * 2 - 1;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      footer.style.setProperty("--mx", (fx + 1) * 50 + "%");
      footer.style.setProperty("--my", (fy + 1) * 50 + "%");
      footer.style.setProperty("--fx", fx.toFixed(3));
      footer.style.setProperty("--fy", fy.toFixed(3));
    });
  }, { passive: true });
  footer.addEventListener("pointerleave", () => {
    footer.classList.remove("f3d-hot");
    footer.style.setProperty("--fx", 0);
    footer.style.setProperty("--fy", 0);
  });
}

/* ---------------- 3D hero: the Bitvulex hex mark, built from geometry ---------------- */

function initHero3D() {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  const stage = canvas.parentElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  function resize() {
    const size = stage.clientWidth;
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  const group = new THREE.Group();
  scene.add(group);

  // Colors come from the active theme's CSS variables, so the model matches
  // the palette and re-tints on light/dark toggle.
  const themeColor = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return new THREE.Color(v || fallback);
  };
  const cyan = themeColor("--cyan", "#8b7bff");
  const blue = themeColor("--blue", "#6b3fd4");
  const coreCol = themeColor("--blue-deep", "#241a52");
  const tintables = []; // [material, which]

  // outer hex ring (line loop) — echoes the logo's hexagon
  function hexPoints(radius) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    pts.push(pts[0].clone());
    return pts;
  }

  const outerGeo = new THREE.BufferGeometry().setFromPoints(hexPoints(2.6));
  const outerMat = new THREE.LineBasicMaterial({ color: cyan.clone(), transparent: true, opacity: 0.9 });
  tintables.push([outerMat, "cyan"]);
  const outerHex = new THREE.LineLoop(outerGeo, outerMat);
  group.add(outerHex);

  const innerGeo = new THREE.BufferGeometry().setFromPoints(hexPoints(1.55));
  const innerMat = new THREE.LineBasicMaterial({ color: cyan.clone(), transparent: true, opacity: 0.55 });
  tintables.push([innerMat, "cyan"]);
  const innerHex = new THREE.LineLoop(innerGeo, innerMat);
  innerHex.rotation.z = 0.35;
  group.add(innerHex);

  // node spheres at three alternating outer vertices, like the logo's circuit nodes
  const nodePositions = hexPoints(2.6).slice(0, 6).filter((_, i) => i % 2 === 0);
  const nodeGeo = new THREE.SphereGeometry(0.14, 16, 16);
  nodePositions.forEach((p, i) => {
    const which = i === 1 ? "cyan" : "blue";
    const mat = new THREE.MeshBasicMaterial({ color: (which === "cyan" ? cyan : blue).clone() });
    tintables.push([mat, which]);
    const sphere = new THREE.Mesh(nodeGeo, mat);
    sphere.position.copy(p);
    group.add(sphere);

    // trace line from node to center-ish, echoing the logo's connector legs
    const traceGeo = new THREE.BufferGeometry().setFromPoints([p, p.clone().multiplyScalar(0.4)]);
    const traceMat = new THREE.LineBasicMaterial({ color: blue.clone(), transparent: true, opacity: 0.7 });
    tintables.push([traceMat, "blue"]);
    group.add(new THREE.Line(traceGeo, traceMat));
  });

  // faint filled core hex for depth
  const coreShape = new THREE.Shape(hexPoints(1.55).map(p => new THREE.Vector2(p.x, p.y)));
  const coreGeo = new THREE.ShapeGeometry(coreShape);
  const coreMat = new THREE.MeshBasicMaterial({ color: coreCol.clone(), transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  tintables.push([coreMat, "core"]);
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.z = -0.3;
  group.add(core);

  // ambient particles
  const starGeo = new THREE.BufferGeometry();
  const starCount = 120;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 12;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    starPos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: cyan.clone(), size: 0.02, transparent: true, opacity: 0.5 });
  tintables.push([starMat, "cyan"]);
  scene.add(new THREE.Points(starGeo, starMat));

  function retint() {
    const c = { cyan: themeColor("--cyan", "#8b7bff"), blue: themeColor("--blue", "#6b3fd4"), core: themeColor("--blue-deep", "#241a52") };
    tintables.forEach(([m, k]) => m.color.copy(c[k]));
  }
  new MutationObserver(retint).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

  let mouseX = 0, mouseY = 0;
  stage.addEventListener("mousemove", (e) => {
    const rect = stage.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    if (!reduceMotion) {
      group.rotation.y = t * 0.35 + mouseX * 0.4;
      group.rotation.x = Math.sin(t * 0.4) * 0.15 + mouseY * 0.25;
      group.rotation.z = Math.sin(t * 0.2) * 0.05;
    }
    renderer.render(scene, camera);
  }
  animate();
}

/* ---------------- Scroll progress bar ----------------
   A thin cyan/blue gradient line under the header that fills as the
   visitor scrolls the page — cheap, glanceable sense of progress that
   reads well on mobile where the header is always in view. Injected
   here (not hardcoded per page) so every page gets it automatically. */
function initScrollProgress() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  bar.id = "scroll-progress";
  header.appendChild(bar);

  let ticking = false;
  function update() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
    bar.style.width = pct + "%";
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
}

/* ---------------- Button ripple ----------------
   A short-lived expanding circle from the tap/click point on every
   .btn — a small tactile cue (the kind native apps give you) that a
   press actually registered, before the link/navigation happens. */
function initButtonRipple() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".btn, .admin-icon-btn, .abn-btn, .theme-toggle, .admin-profile-fab, .bottom-nav a");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "btn-ripple";
    const size = Math.max(rect.width, rect.height) * 1.6;
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
    ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
    btn.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });
}

/* ---------------- Back to top ----------------
   Small floating button, bottom-right, that fades in once the visitor
   has scrolled a couple of screens down. Kept clear of the bottom tab
   bar on mobile via CSS (see body:has(.bottom-nav)). */
function initBackToTop() {
  if (!document.querySelector(".site-header")) return;
  const btn = document.createElement("button");
  btn.className = "back-to-top";
  btn.id = "back-to-top";
  btn.setAttribute("aria-label", "Back to top");
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
  document.body.appendChild(btn);

  let ticking = false;
  function update() {
    btn.classList.toggle("show", window.scrollY > window.innerHeight * 1.1);
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  update();
}

/* ---------------- Bottom tab bar — active state ----------------
   Highlights whichever tab matches the current page so the bar reads
   like a real app shell rather than a plain link row. */
function initBottomNavActiveState() {
  const nav = document.querySelector(".bottom-nav");
  if (!nav) return;
  const file = (location.pathname.split("/").pop() || "index.html");
  nav.querySelectorAll("a").forEach(a => {
    const href = (a.getAttribute("href") || "").split("/").pop();
    if (href === file || (file === "" && href === "index.html")) a.classList.add("active");
  });
}

/* ---------------- Count-up numbers ----------------
   Any element with [data-countup] animates its digits up from 0 (or
   its previous value) once it scrolls into view, keeping any non-digit
   prefix/suffix (%, +, x) intact — e.g. "128+" or "24%". Used on the
   homepage trust strip; also exposed as window.BV.countUp so the admin
   dashboard can reuse the same easing when its stat tiles refresh. */
window.BV = window.BV || {};

window.BV.countUp = function (el, targetText, duration) {
  if (!el) return;
  duration = duration || 700;
  const match = String(targetText).match(/^(\D*)([\d,]+(?:\.\d+)?)(\D*)$/);
  if (!match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = targetText;
    return;
  }
  const [, prefix, numStr, suffix] = match;
  const target = parseFloat(numStr.replace(/,/g, ""));
  const startMatch = String(el.textContent || "").match(/[\d,]+(?:\.\d+)?/);
  const start = startMatch ? parseFloat(startMatch[0].replace(/,/g, "")) : 0;
  const decimals = (numStr.split(".")[1] || "").length;
  const startTime = performance.now();

  function frame(now) {
    const p = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = start + (target - start) * eased;
    el.textContent = prefix + val.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix;
    if (p < 1) requestAnimationFrame(frame);
    else el.textContent = prefix + numStr + suffix;
  }
  requestAnimationFrame(frame);
};

function initCountUpOnView() {
  const targets = document.querySelectorAll("[data-countup]");
  if (!targets.length) return;
  if (!("IntersectionObserver" in window)) {
    targets.forEach(el => (el.textContent = el.textContent));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        window.BV.countUp(entry.target, entry.target.textContent.trim());
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  targets.forEach(el => io.observe(el));
}

/* ---------------- Pricing cards — mobile "featured up front" carousel ----------------
   Below 640px, .pkg-grid (Standard / Medium / Large) becomes a
   horizontally swipeable, center-snapping row (see CSS). This:
   1) starts each grid scrolled to its "Most chosen" card so that's
      what the visitor sees first, and
   2) tracks scroll position to mark whichever card is centered as
      .in-view, so it pops to full size/opacity while its neighbours
      shrink and dim — the "one left, one right, chosen one up front"
      effect. Re-runs on resize so rotating a phone doesn't leave a
      grid stuck mid-scroll from the old layout. */
function initPkgCarousel() {
  const grids = document.querySelectorAll(".pkg-grid");
  if (!grids.length) return;

  function isCarouselWidth() {
    return window.matchMedia("(max-width:640px)").matches;
  }

  function setupGrid(grid) {
    const cards = Array.from(grid.querySelectorAll(".pkg-card"));
    if (!cards.length) return;

    function updateInView() {
      if (!isCarouselWidth()) {
        cards.forEach(c => c.classList.remove("in-view"));
        return;
      }
      const gridRect = grid.getBoundingClientRect();
      const center = gridRect.left + gridRect.width / 2;
      let closest = null, closestDist = Infinity;
      cards.forEach(c => {
        const r = c.getBoundingClientRect();
        const dist = Math.abs((r.left + r.width / 2) - center);
        if (dist < closestDist) { closestDist = dist; closest = c; }
      });
      cards.forEach(c => c.classList.toggle("in-view", c === closest));
    }

    let ticking = false;
    grid.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(() => { updateInView(); ticking = false; }); ticking = true; }
    }, { passive: true });

    function goToFeatured(smooth) {
      if (!isCarouselWidth()) return;
      const featured = grid.querySelector(".pkg-card.featured") || cards[0];
      const gridRect = grid.getBoundingClientRect();
      const target = grid.scrollLeft + (featured.getBoundingClientRect().left - gridRect.left)
        - (grid.clientWidth - featured.clientWidth) / 2;
      grid.scrollTo({ left: target, behavior: smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
      updateInView();
    }

    // Wait a frame so layout (card widths) is settled before measuring.
    requestAnimationFrame(() => goToFeatured(false));

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => goToFeatured(false), 150);
    });
  }

  grids.forEach(setupGrid);
}
