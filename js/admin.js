/* ============================================================
   BITVULEX — Admin panel logic
   Session lives in sessionStorage (cleared when the tab closes).
   Content lives in localStorage via data.js (loadData/saveData).
   NOTE: this is a client-side demo admin system — see the
   security note in the handover message for what a production
   version would need (a real backend + hashed passwords).
   ============================================================ */

const SESSION_KEY = "bitvulex_session";
const ATTEMPTS_KEY = "bitvulex_login_attempts";
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_MS = 15 * 60 * 1000;   // 15 minutes

/* ---------------- Admin login OTP (email verification code) ----------------
   A pending code lives only in sessionStorage — never in the data layer —
   and is cleared as soon as it's used, expires, or the tab closes. */
const OTP_KEY = "bitvulex_otp_pending";
const OTP_VALID_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
let otpResendTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  const bootData = loadData();
  if (window.emailjs && bootData.settings.emailjsPublicKey) {
    try { emailjs.init({ publicKey: bootData.settings.emailjsPublicKey }); } catch (e) {}
  }

  const session = getSession();
  if (session) {
    showAdminShell(session);
  } else {
    showLogin();
  }
  renderLockoutState();

  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("otp-form").addEventListener("submit", handleOtpVerify);
  document.getElementById("otp-resend-link").addEventListener("click", handleOtpResend);
  document.getElementById("otp-back-link").addEventListener("click", (e) => {
    e.preventDefault();
    cancelOtpStep();
  });
  const otpInput = document.getElementById("otp-input");
  if (otpInput) otpInput.addEventListener("input", () => {
    otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
  });
  document.getElementById("logout-btn").addEventListener("click", () => {
    logActivity("Logged out");
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
  const resetLink = document.getElementById("reset-accounts-link");
  if (resetLink) resetLink.addEventListener("click", (e) => {
    e.preventDefault();
    resetAdminAccounts();
  });

  document.querySelectorAll(".admin-nav button").forEach(btn => {
    btn.addEventListener("click", () => switchPanel(btn.dataset.panel));
  });
  document.querySelectorAll("[data-quick-panel]").forEach(btn => {
    btn.addEventListener("click", () => switchPanel(btn.dataset.quickPanel));
  });

  document.getElementById("add-team-btn").addEventListener("click", addTeamMember);
  document.getElementById("add-review-btn").addEventListener("click", addReview);
  document.getElementById("rv-set-save").addEventListener("click", saveReviewSettings);
  document.getElementById("add-service-btn").addEventListener("click", addService);
  document.getElementById("clear-messages-btn").addEventListener("click", clearMessages);
  document.getElementById("settings-email-form").addEventListener("submit", saveEmailSetting);
  document.getElementById("settings-emailjs-form").addEventListener("submit", saveEmailJsSettings);
  document.getElementById("settings-otp-form").addEventListener("submit", saveOtpSettings);
  document.getElementById("theme-radio-dark").addEventListener("change", () => saveThemeSetting("dark"));
  document.getElementById("theme-radio-light").addEventListener("change", () => saveThemeSetting("light"));
  document.getElementById("add-user-btn").addEventListener("click", addUser);
  document.getElementById("account-username-form").addEventListener("submit", changeOwnUsername);
  document.getElementById("account-pass-form").addEventListener("submit", changeOwnPassword);
  const emailForm = document.getElementById("account-email-form");
  if (emailForm) emailForm.addEventListener("submit", saveAccountEmail);
  const clearLogBtn = document.getElementById("clear-activity-log-btn");
  if (clearLogBtn) clearLogBtn.addEventListener("click", clearActivityLog);

  document.getElementById("add-social-btn").addEventListener("click", addSocialRow);
  document.getElementById("save-social-btn").addEventListener("click", saveSocialLinks);
  document.getElementById("add-stat-btn").addEventListener("click", addStatRow);
  document.getElementById("save-stats-btn").addEventListener("click", saveStats);

  document.getElementById("clear-analytics-btn").addEventListener("click", clearAnalyticsData);
  document.getElementById("seo-run-btn").addEventListener("click", runSeoAndRender);
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-copy-target]");
    if (btn) copySeoField(btn.dataset.copyTarget, btn);
  });

  // Show/hide password toggles — delegated so it also covers any
  // password field added later.
  document.addEventListener("click", (e) => {
    const eyeBtn = e.target.closest(".pass-eye");
    if (!eyeBtn) return;
    const input = document.getElementById(eyeBtn.dataset.eyeFor);
    if (!input) return;
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    eyeBtn.querySelector(".eye-open").style.display = showing ? "" : "none";
    eyeBtn.querySelector(".eye-closed").style.display = showing ? "none" : "";
    eyeBtn.title = showing ? "Show password" : "Hide password";
  });

  // Mobile sidebar toggle
  const mobileToggle = document.getElementById("admin-mobile-toggle");
  const sidebar = document.querySelector(".admin-sidebar");
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
    document.querySelectorAll(".admin-nav button").forEach(btn =>
      btn.addEventListener("click", () => sidebar.classList.remove("open"))
    );
  }

  initMobileAppShell(sidebar);

  // Notification bell
  const bellBtn = document.getElementById("notif-bell-btn");
  const bellPanel = document.getElementById("notif-panel");
  if (bellBtn && bellPanel) {
    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      bellPanel.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!bellPanel.contains(e.target) && e.target !== bellBtn) bellPanel.classList.remove("open");
    });
  }
  document.addEventListener("click", (e) => {
    const goBtn = e.target.closest("[data-notif-goto-messages]");
    if (goBtn) { e.preventDefault(); switchPanel("messages"); if (bellPanel) bellPanel.classList.remove("open"); }
  });

  const settingsBtn = document.getElementById("notif-settings-btn");
  if (settingsBtn) settingsBtn.addEventListener("click", () => switchPanel("settings"));
});

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

/* ---------------- Lockout after repeated failed attempts ----------------
   Tracked per browser (not per username) in localStorage, so it survives
   a page reload but is naturally scoped to this device. This blocks
   casual/automated guessing from this browser — it is not a substitute
   for real server-side rate limiting, which a static site can't do. */
function getAttemptState() {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY)) || { count: 0, lockUntil: 0 };
  } catch {
    return { count: 0, lockUntil: 0 };
  }
}

function saveAttemptState(state) {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(state));
}

function isLockedOut() {
  const state = getAttemptState();
  return state.lockUntil && state.lockUntil > Date.now();
}

function recordFailedAttempt() {
  const state = getAttemptState();
  state.count = (state.count || 0) + 1;
  if (state.count >= MAX_LOGIN_ATTEMPTS) {
    state.lockUntil = Date.now() + LOCKOUT_MS;
    state.count = 0;
  }
  saveAttemptState(state);
}

function resetAttemptState() {
  saveAttemptState({ count: 0, lockUntil: 0 });
}

function renderLockoutState() {
  const status = document.getElementById("login-status");
  const btn = document.getElementById("login-submit-btn");
  if (!status || !btn) return;
  if (isLockedOut()) {
    const state = getAttemptState();
    const mins = Math.ceil((state.lockUntil - Date.now()) / 60000);
    status.className = "form-status err";
    status.textContent = `Too many failed attempts. Admin access is locked for about ${mins} more minute${mins === 1 ? "" : "s"}.`;
    btn.disabled = true;
  } else {
    btn.disabled = false;
  }
}

function handleLogin(e) {
  e.preventDefault();
  const status = document.getElementById("login-status");

  // SECURITY: this project is a static frontend. Credentials, OTP codes, and
  // role checks in browser JavaScript can be read or modified by any visitor.
  // Fail closed rather than pretending localStorage authentication is secure.
  // Re-enable admin access only after a backend identity endpoint validates the
  // credentials and returns a server-verified session with authorization checks.
  status.className = "form-status err";
  status.textContent = "Admin sign-in is disabled for security in this static build. Configure server-side authentication and role authorization before enabling admin operations.";
  return;

  if (isLockedOut()) {
    renderLockoutState();
    return;
  }

  const username = document.getElementById("login-user").value.trim();
  const password = document.getElementById("login-pass").value;
  const data = loadData();
  const user = data.admin.users.find(u => u.username === username && u.password === password);

  if (!user) {
    recordFailedAttempt();
    if (isLockedOut()) {
      renderLockoutState();
    } else {
      const remaining = MAX_LOGIN_ATTEMPTS - getAttemptState().count;
      status.className = "form-status err";
      status.textContent = `Incorrect username or password. ${remaining} attempt${remaining === 1 ? "" : "s"} left before access is locked.`;
    }
    return;
  }

  // Password is correct.
  resetAttemptState();

  // If two-factor is turned on (Admin > Site Settings) and everything it
  // needs is actually in place — EmailJS configured, this account has an
  // email on file — send a code and hold the login. Otherwise (not turned
  // on, or not fully configured yet) log in the same way it always did, so
  // enabling the checkbox can never lock an admin out of their own site.
  const otpReady = !!(
    data.settings.otpEnabled && window.emailjs &&
    data.settings.emailjsServiceId && data.settings.emailjsOtpTemplateId &&
    data.settings.emailjsPublicKey && user.email
  );

  if (otpReady) {
    startOtpStep(user);
    return;
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username, role: user.role }));
  logActivity("Logged in");
  showAdminShell({ username: user.username, role: user.role });
}

/* ---------------- OTP step ---------------- */

function maskEmail(email) {
  if (!email || !email.includes("@")) return email || "";
  const [user, domain] = email.split("@");
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${"*".repeat(Math.max(3, user.length - visible.length))}@${domain}`;
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getOtpState() {
  try { return JSON.parse(sessionStorage.getItem(OTP_KEY)); } catch { return null; }
}
function saveOtpState(state) { sessionStorage.setItem(OTP_KEY, JSON.stringify(state)); }
function clearOtpState() { sessionStorage.removeItem(OTP_KEY); }

async function startOtpStep(user) {
  const data = loadData();
  const code = generateOtpCode();
  saveOtpState({
    username: user.username,
    role: user.role,
    email: user.email,
    code,
    expires: Date.now() + OTP_VALID_MINUTES * 60 * 1000,
    attempts: 0
  });

  document.getElementById("login-form").style.display = "none";
  const backLink = document.getElementById("login-back-link");
  if (backLink) backLink.style.display = "none";
  const otpForm = document.getElementById("otp-form");
  otpForm.style.display = "block";
  document.getElementById("otp-masked-email").textContent = maskEmail(user.email);
  document.getElementById("otp-input").value = "";
  document.getElementById("otp-input").focus();

  startOtpResendCooldown();
  await sendOtpEmail(data, user, code, /*isResend*/ false);
}

async function sendOtpEmail(data, user, code, isResend) {
  const status = document.getElementById("otp-status");
  const { emailjsServiceId, emailjsOtpTemplateId, emailjsPublicKey } = data.settings;
  try {
    await emailjs.send(emailjsServiceId, emailjsOtpTemplateId, {
      otp_code: code,
      name: user.username,
      to_email: user.email,
      valid_minutes: OTP_VALID_MINUTES
    }, emailjsPublicKey);
    status.className = "form-status ok";
    status.textContent = isResend
      ? `New code sent to ${maskEmail(user.email)}.`
      : `We sent a 6-digit code to ${maskEmail(user.email)}.`;
  } catch (err) {
    console.error("OTP email send failed:", err);
    status.className = "form-status err";
    status.textContent = "Couldn't send the verification email. Check your connection and try Resend code.";
  }
}

function handleOtpVerify(e) {
  e.preventDefault();
  const status = document.getElementById("otp-status");
  const state = getOtpState();

  if (!state) { cancelOtpStep(); return; }

  if (Date.now() > state.expires) {
    status.className = "form-status err";
    status.textContent = "That code expired. Tap Resend code to get a new one.";
    return;
  }

  const entered = document.getElementById("otp-input").value.trim();
  if (entered !== state.code) {
    state.attempts = (state.attempts || 0) + 1;
    if (state.attempts >= OTP_MAX_ATTEMPTS) {
      clearOtpState();
      status.className = "form-status err";
      status.textContent = "Too many incorrect codes. Please log in again.";
      setTimeout(cancelOtpStep, 1600);
      return;
    }
    saveOtpState(state);
    const remaining = OTP_MAX_ATTEMPTS - state.attempts;
    status.className = "form-status err";
    status.textContent = `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`;
    return;
  }

  // Correct — complete the login.
  clearOtpState();
  if (otpResendTimer) clearInterval(otpResendTimer);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: state.username, role: state.role }));
  logActivity("Logged in (verified)");
  showAdminShell({ username: state.username, role: state.role });
}

function startOtpResendCooldown() {
  const link = document.getElementById("otp-resend-link");
  if (!link) return;
  if (otpResendTimer) clearInterval(otpResendTimer);
  let remaining = Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000);
  link.classList.add("disabled");
  link.textContent = `Resend code (${remaining}s)`;
  otpResendTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(otpResendTimer);
      link.classList.remove("disabled");
      link.textContent = "Resend code";
    } else {
      link.textContent = `Resend code (${remaining}s)`;
    }
  }, 1000);
}

function handleOtpResend(e) {
  e.preventDefault();
  if (e.currentTarget.classList.contains("disabled")) return;
  const state = getOtpState();
  if (!state) { cancelOtpStep(); return; }

  const data = loadData();
  const code = generateOtpCode();
  state.code = code;
  state.expires = Date.now() + OTP_VALID_MINUTES * 60 * 1000;
  state.attempts = 0;
  saveOtpState(state);
  startOtpResendCooldown();
  sendOtpEmail(data, { username: state.username, email: state.email }, code, /*isResend*/ true);
}

function cancelOtpStep() {
  clearOtpState();
  if (otpResendTimer) clearInterval(otpResendTimer);
  document.getElementById("otp-form").style.display = "none";
  document.getElementById("login-form").style.display = "block";
  const backLink = document.getElementById("login-back-link");
  if (backLink) backLink.style.display = "";
  document.getElementById("login-pass").value = "";
  const status = document.getElementById("otp-status");
  status.textContent = "";
  status.className = "form-status";
}

function resetAdminAccounts() {
  if (!confirm("Reset all admin accounts back to the defaults (admin / node1 / node2 with their original passwords)? Your site content (services, team, messages, etc.) is not affected.")) return;
  const data = loadData();
  data.admin = { users: structuredCloneSafe(DEFAULT_DATA.admin.users) };
  saveData(data);
  resetAttemptState();
  sessionStorage.removeItem(SESSION_KEY);
  const status = document.getElementById("login-status");
  status.className = "form-status ok";
  status.textContent = "Admin accounts reset. Log in with: admin / bitvulex@2026";
}

function showLogin() {
  document.getElementById("login-shell").style.display = "flex";
  document.getElementById("admin-shell").style.display = "none";
  // Never resume a half-finished OTP step from a previous page load —
  // always start clean at the username/password screen.
  clearOtpState();
  document.getElementById("otp-form").style.display = "none";
  document.getElementById("login-form").style.display = "block";
  const backLink = document.getElementById("login-back-link");
  if (backLink) backLink.style.display = "";
  renderLockoutState();
}

function showAdminShell(session) {
  document.getElementById("login-shell").style.display = "none";
  document.getElementById("admin-shell").style.display = "grid";

  renderWhoAmI(session);

  // Users & Roles, Team and My Account are administrator-only. Node
  // accounts can reach every other panel (Services & Packages, Demo
  // Projects, Messages, Social Links, Growth Stats, SEO Assistant,
  // Site Settings) but never these three.
  const isAdmin = session.role === "administrator";
  document.getElementById("nav-users").style.display = isAdmin ? "" : "none";
  document.getElementById("nav-team").style.display = isAdmin ? "" : "none";
  document.getElementById("nav-account").style.display = isAdmin ? "" : "none";

  document.getElementById("account-role-display").textContent =
    `Logged in as ${session.username} (${session.role})`;
  document.getElementById("acc-username").value = session.username;
  renderAccountEmail(session);
  renderActivityLog(session);

  renderDashboard();
  renderPackagesEditor();
  renderTeamEditor();
  renderReviewsEditor();
  renderProjectsEditor();
  renderLeads();
  renderMessages();
  renderSocialEditor();
  renderStatsEditor();
  renderSettings();
  if (isAdmin) renderUsers();
  renderNotifications();

  // if a node account somehow lands on an administrator-only panel (e.g.
  // it was left active from a previous administrator session), bounce to
  // the dashboard
  if (!isAdmin) {
    const activePanel = document.querySelector(".admin-panel.active");
    const restricted = ["panel-users", "panel-team", "panel-account"];
    if (activePanel && restricted.includes(activePanel.id)) {
      switchPanel("dashboard");
    }
  }
}

function renderWhoAmI(session) {
  document.getElementById("whoami").innerHTML =
    `Signed in as <b style="color:var(--ink)">${escapeHtml(session.username)}</b><br>` +
    `<span class="badge ${session.role === "administrator" ? "badge-admin" : "badge-node"}">${escapeHtml(session.role)}</span>`;

  const welcomeName = document.getElementById("welcome-name");
  const welcomeUsername = document.getElementById("welcome-username");
  const welcomeRole = document.getElementById("welcome-role");
  const welcomeAvatar = document.getElementById("welcome-avatar");
  if (welcomeName) welcomeName.textContent = session.username;
  if (welcomeUsername) welcomeUsername.textContent = session.username;
  if (welcomeRole) welcomeRole.textContent = session.role;
  if (welcomeAvatar) welcomeAvatar.textContent = session.username.charAt(0).toUpperCase();

  // Bottom-left mobile profile button + its popover — same identity,
  // just mirrored into the phone-sized "app shell" controls.
  const initial = session.username.charAt(0).toUpperCase();
  const isAdmin = session.role === "administrator";
  const mobileAvatar = document.getElementById("mobile-avatar");
  const mobileAvatarLg = document.getElementById("mobile-avatar-lg");
  const mobilePopUsername = document.getElementById("mobile-pop-username");
  const mobilePopRole = document.getElementById("mobile-pop-role");
  const mobilePopAccount = document.getElementById("mobile-pop-account");
  if (mobileAvatar) mobileAvatar.textContent = initial;
  if (mobileAvatarLg) mobileAvatarLg.textContent = initial;
  if (mobilePopUsername) mobilePopUsername.textContent = session.username;
  if (mobilePopRole) {
    mobilePopRole.textContent = session.role;
    mobilePopRole.className = "badge " + (isAdmin ? "badge-admin" : "badge-node");
  }
  // "My account" is administrator-only, same as the sidebar's nav-account
  if (mobilePopAccount) mobilePopAccount.style.display = isAdmin ? "" : "none";
}

function switchPanel(name) {
  const session = getSession();
  // Defense in depth: even if something tries to force-open it, node
  // accounts are blocked from Users & Roles, Team and My Account.
  if (session && session.role !== "administrator" && (name === "users" || name === "team" || name === "account")) {
    return;
  }
  document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".admin-nav button").forEach(b => b.classList.remove("active"));
  document.getElementById("panel-" + name).classList.add("active");
  document.querySelector(`.admin-nav button[data-panel="${name}"]`).classList.add("active");
  // keep the mobile bottom tab bar's active icon in sync too — it's a
  // separate set of buttons from the sidebar nav (see initMobileAppShell)
  document.querySelectorAll(".admin-bottom-nav button[data-panel]").forEach(b =>
    b.classList.toggle("active", b.dataset.panel === name)
  );
  // refresh live numbers whenever the dashboard is opened, in case the
  // admin has browsed the live site (in another tab) since login
  if (name === "dashboard") renderDashboard();
  if (name === "leads") renderLeads();
}

/* ---------------- Mobile "app shell" ----------------
   Wires the bottom tab bar (primary panels + Menu, which opens the
   sidebar as a slide-up sheet) and the bottom-left profile button
   (avatar → popover with account/theme/view-site/logout). Both are
   only visible under 860px (see css/style.css); the elements always
   exist in the DOM so this can run unconditionally on every device. */
function initMobileAppShell(sidebar) {
  document.querySelectorAll(".admin-bottom-nav button[data-panel]").forEach(btn => {
    btn.addEventListener("click", () => {
      switchPanel(btn.dataset.panel);
      closeProfilePop();
    });
  });

  const menuBtn = document.getElementById("admin-bottom-menu-btn");
  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      closeProfilePop();
    });
  }

  const fab = document.getElementById("admin-profile-fab");
  const pop = document.getElementById("admin-profile-pop");
  if (fab && pop) {
    fab.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !pop.classList.contains("open");
      pop.classList.toggle("open", willOpen);
      fab.setAttribute("aria-expanded", String(willOpen));
      if (sidebar) sidebar.classList.remove("open");
    });
    document.addEventListener("click", (e) => {
      if (!pop.contains(e.target) && e.target !== fab) closeProfilePop();
    });
  }

  const popAccount = document.getElementById("mobile-pop-account");
  if (popAccount) popAccount.addEventListener("click", () => {
    switchPanel("account");
    closeProfilePop();
  });

  // Theme + logout reuse the exact sidebar buttons' own logic instead of
  // duplicating it — a real click on the (hidden, off-canvas) sidebar
  // control fires the same handlers already wired above.
  const popTheme = document.getElementById("mobile-pop-theme");
  const sidebarTheme = document.getElementById("theme-toggle-sidebar");
  if (popTheme && sidebarTheme) popTheme.addEventListener("click", () => {
    sidebarTheme.click();
    closeProfilePop();
  });

  const popLogout = document.getElementById("mobile-pop-logout");
  const sidebarLogout = document.getElementById("logout-btn");
  if (popLogout && sidebarLogout) popLogout.addEventListener("click", () => sidebarLogout.click());
}

function closeProfilePop() {
  const pop = document.getElementById("admin-profile-pop");
  const fab = document.getElementById("admin-profile-fab");
  if (pop) pop.classList.remove("open");
  if (fab) fab.setAttribute("aria-expanded", "false");
}

/* ---------------- Dashboard ---------------- */

function statText(id, text) {
  // Animated digit count-up (see window.BV.countUp in main.js) if it's
  // loaded; falls back to a plain assignment so this never breaks if
  // main.js hasn't loaded yet for some reason.
  const el = document.getElementById(id);
  if (!el) return;
  if (window.BV && typeof window.BV.countUp === "function") window.BV.countUp(el, String(text));
  else el.textContent = text;
}

function renderDashboard() {
  const data = loadData();
  statText("stat-services", data.services.length);
  statText("stat-team", data.team.length);
  statText("stat-messages", data.messages.length);
  const projEl = document.getElementById("stat-projects");
  if (projEl) statText("stat-projects", data.services.reduce((sum, s) => sum + ((s.projects || []).length), 0));

  const summary = analyticsSummary();

  statText("stat-conv", summary.totalVisits > 0 ? Math.round((data.messages.length / summary.totalVisits) * 100) + "%" : "–");

  statText("stat-visits7", summary.last7);
  const deltaEl = document.getElementById("stat-visits-delta");
  if (summary.last7 === 0 && summary.prev7 === 0) {
    deltaEl.textContent = "No visits yet";
    deltaEl.className = "stat-delta flat";
  } else {
    deltaEl.textContent = (summary.growthPct >= 0 ? "▲ +" : "▼ ") + summary.growthPct + "% vs prior week";
    deltaEl.className = "stat-delta " + (summary.growthPct > 0 ? "up" : summary.growthPct < 0 ? "down" : "flat");
  }

  statText("stat-sessions", summary.uniqueSessions);
  statText("stat-scroll", summary.totalVisits ? summary.avgScroll + "%" : "–");
  statText("stat-mobile", summary.totalVisits ? summary.mobilePct + "%" : "–");

  renderLeadPipeline(data.messages, "dash-lead-pipeline");
  renderRecentLeads(data.messages);

  renderTrafficChart("traffic-chart");
  renderBarList("scroll-chart", analyticsScrollBuckets(), "visits");
  renderBarList("sources-chart", analyticsSources(6), "visits");
  renderActivityList("activity-list");

  const demand = analyticsServiceDemand();
  renderBarList("demand-interest-chart", demand.map(d => ({ label: d.name, count: d.views + d.clicks })), "");
  renderBarList("demand-inquiry-chart", demand.map(d => ({ label: d.name, count: d.inquiries })), "");
  renderBarList("leads-source-chart", messagesBySource(data), "");
}

function renderRecentLeads(leads) {
  const el = document.getElementById("dash-recent-leads");
  if (!el) return;
  const recent = leads.slice(0, 6);
  if (recent.length === 0) {
    el.innerHTML = `<div class="sub" style="margin:0;">No leads yet — they'll appear here as soon as someone submits the contact form.</div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-scroll">
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Service</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>
          ${recent.map(l => {
            const status = l.leadStatus || "New";
            return `<tr>
              <td>${escapeHtml(l.name || "Unknown")}</td>
              <td>${escapeHtml(l.service || "General")}</td>
              <td>${new Date(l.date).toLocaleDateString()}</td>
              <td><span class="lead-badge status-${status.replace(/\s+/g, "-")}">${escapeHtml(status)}</span></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

function clearAnalyticsData() {
  if (!confirm("Reset all traffic, scroll and demand data recorded in this browser? Messages and site content are not affected.")) return;
  analyticsClearAll();
  logActivity("Reset analytics data");
  renderDashboard();
}

function messagesBySource(data) {
  const counts = {};
  (data.messages || []).forEach(m => {
    const s = m.source || "Direct";
    counts[s] = (counts[s] || 0) + 1;
  });
  return Object.entries(counts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

/* ---------------- Dashboard charts (SVG bar chart + horizontal bar lists) ---------------- */

function renderTrafficChart(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const series = analyticsDaySeries(14);
  const total = series.reduce((s, p) => s + p.count, 0);
  if (total === 0) {
    el.innerHTML = `<div class="empty-hint">No visits recorded yet in this browser — open the live site in another tab to see it populate.</div>`;
    return;
  }

  const W = 620, H = 190, padL = 8, padR = 8, padT = 14, padB = 26;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const max = Math.max(...series.map(p => p.count), 1);
  const barGap = chartW / series.length;
  const barW = Math.min(28, barGap * 0.5);

  let bars = "", labels = "";
  series.forEach((p, i) => {
    const bh = (p.count / max) * chartH;
    const cx = padL + barGap * i + barGap / 2;
    const x = cx - barW / 2;
    const y = padT + (chartH - bh);
    bars += `
      <g style="transition-delay:${i * 35}ms">
        <rect class="mini-bar-track" x="${x.toFixed(1)}" y="${padT}" width="${barW.toFixed(1)}" height="${chartH}" rx="4"></rect>
        <rect class="mini-bar-fill" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="4"></rect>
      </g>`;
    if (i % 2 === 0 || series.length <= 8) {
      labels += `<text class="mini-axis-label" x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle">${p.label}</text>`;
    }
  });

  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="mini-chart-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="miniBarGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="var(--blue)"></stop>
          <stop offset="100%" stop-color="var(--cyan)"></stop>
        </linearGradient>
      </defs>
      ${bars}
      ${labels}
    </svg>`;
  requestAnimationFrame(() => el.querySelectorAll(".mini-bar-fill").forEach(r => r.classList.add("grown")));
}

function renderBarList(containerId, items, suffix) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const clean = (items || []).filter(i => i && i.label);
  if (clean.length === 0 || clean.every(i => !i.count)) {
    el.innerHTML = `<div class="empty-hint">No data yet — numbers appear as visitors browse the live site.</div>`;
    return;
  }
  const max = Math.max(...clean.map(i => i.count || 0), 1);
  el.innerHTML = clean.map(i => `
    <div class="bar-list-row">
      <div class="bar-list-label" title="${escapeHtml(i.label)}">${escapeHtml(i.label)}</div>
      <div class="bar-list-track"><div class="bar-list-fill" data-w="${Math.round(((i.count || 0) / max) * 100)}"></div></div>
      <div class="bar-list-value">${i.count || 0}${suffix ? " " + suffix : ""}</div>
    </div>`).join("");
  requestAnimationFrame(() => el.querySelectorAll(".bar-list-fill").forEach(f => (f.style.width = f.dataset.w + "%")));
}

function renderActivityList(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const recents = analyticsRecentVisits(8);
  if (recents.length === 0) {
    el.innerHTML = `<div class="empty-hint">No visits recorded yet in this browser.</div>`;
    return;
  }
  el.innerHTML = recents.map(v => `
    <div class="activity-row">
      <span class="activity-dot"></span>
      <span class="activity-page">${escapeHtml(v.page)} <span style="color:var(--ink-mute)">· ${escapeHtml(v.source)}</span></span>
      <span class="activity-meta">${timeAgo(v.date)}</span>
    </div>`).join("");
}

/* ---------------- SEO Assistant ---------------- */

function runSeoAndRender() {
  const text = document.getElementById("seo-input").value.trim();
  const brand = document.getElementById("seo-brand").value.trim();
  if (!text) { alert("Type some text describing the page or offer first."); return; }

  const result = runSeoOptimizer(text, brand);
  document.getElementById("seo-results").style.display = "block";

  document.getElementById("seo-out-title").textContent = result.title;
  document.getElementById("seo-out-desc").textContent = result.description;
  document.getElementById("seo-out-slug").textContent = "/" + result.slug;

  const titleCount = document.getElementById("seo-title-count");
  titleCount.textContent = `${result.title.length} / 60 chars`;
  titleCount.className = "seo-char-count" + (result.title.length > 60 ? " bad" : result.title.length < 30 ? " warn" : "");

  const descCount = document.getElementById("seo-desc-count");
  descCount.textContent = `${result.description.length} / 160 chars`;
  descCount.className = "seo-char-count" + (result.description.length > 160 ? " bad" : result.description.length < 120 ? " warn" : "");

  document.getElementById("seo-out-keywords").innerHTML = result.keywords.length
    ? result.keywords.map(k => `<span class="seo-keyword-pill">${escapeHtml(k)}</span>`).join("")
    : `<span class="empty-hint" style="padding:0;">No strong keywords found — add a bit more detail and try again.</span>`;

  document.getElementById("seo-score-num").textContent = result.score;
  document.getElementById("seo-score-ring").style.setProperty("--pct", result.score);
  document.getElementById("seo-score-title").textContent =
    result.score >= 80 ? "Excellent SEO score" : result.score >= 55 ? "Good — a little room to improve" : "Needs work — see tips below";
  document.getElementById("seo-tips").innerHTML = result.tips.map(t =>
    `<li class="${t.good ? "good" : "bad"}"><span class="tip-icon">${t.good ? "✓" : "!"}</span>${escapeHtml(t.text)}</li>`
  ).join("");

  document.getElementById("seo-serp-title").textContent = result.title;
  document.getElementById("seo-serp-desc").textContent = result.description;

  document.getElementById("seo-out-tags").textContent =
`<title>${result.title}</title>
<meta name="description" content="${result.description}">
<meta property="og:title" content="${result.title}">
<meta property="og:description" content="${result.description}">
<link rel="canonical" href="https://www.bitvulex.com/${result.slug}">`;
}

function copySeoField(id, btn) {
  const el = document.getElementById(id);
  if (!el || !el.textContent) return;
  const text = el.textContent;
  const done = () => {
    const original = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = original), 1200);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
  document.body.removeChild(ta);
}

/* ---------------- Packages editor ---------------- */

function renderPackagesEditor() {
  const container = document.getElementById("packages-editor");
  const data = loadData();
  container.innerHTML = "";

  if (data.services.length === 0) {
    const empty = document.createElement("div");
    empty.className = "admin-card";
    empty.innerHTML = `<div class="sub">No services yet. Click "+ Add service" above to create your first one.</div>`;
    container.appendChild(empty);
  }

  data.services.forEach(service => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.innerHTML = `
      <div class="service-block-head-row">
        <div>
          <h3>${escapeHtml(service.name)}</h3>
          <div class="sub">${escapeHtml(service.tagline)}</div>
        </div>
        <button class="btn btn-danger btn-sm" data-remove-service="${service.id}">Remove service</button>
      </div>
      <div class="pkg-edit-wrap" data-service="${service.id}"></div>
      <div class="small-btn-row">
        <button class="btn btn-primary btn-sm" data-save-service="${service.id}">Save changes</button>
        <button class="btn btn-ghost btn-sm" data-add-tier="${service.id}">+ Add package tier</button>
        <span class="form-status" id="status-${service.id}"></span>
      </div>
    `;
    container.appendChild(card);
    const wrap = card.querySelector(".pkg-edit-wrap");
    service.packages.forEach((pkg, idx) => {
      wrap.appendChild(buildPackageEditItem(service.id, pkg, idx));
    });
  });

  container.querySelectorAll("[data-save-service]").forEach(btn => {
    btn.addEventListener("click", () => saveServicePackages(btn.dataset.saveService));
  });
  container.querySelectorAll("[data-remove-service]").forEach(btn => {
    btn.addEventListener("click", () => removeService(btn.dataset.removeService));
  });
  container.querySelectorAll("[data-add-tier]").forEach(btn => {
    btn.addEventListener("click", () => addTier(btn.dataset.addTier));
  });
}

/* ---------------- Add / remove whole services & tiers ---------------- */

function addService() {
  const name = prompt('New service name (e.g. "AI & Automation"):');
  if (!name || !name.trim()) return;
  const tagline = prompt("Short one-line tagline shown under the name:", "") || "";
  const data = loadData();
  let id = slugify(name);
  let n = 2;
  while (data.services.some(s => s.id === id)) id = `${slugify(name)}-${n++}`;
  data.services.push({
    id,
    name: name.trim(),
    tagline: tagline.trim(),
    projects: [],
    packages: [blankPackage("Standard"), blankPackage("Medium"), blankPackage("Large")]
  });
  saveData(data);
  logActivity(`Added service "${data.services[data.services.length - 1].name}"`);
  renderPackagesEditor();
  renderProjectsEditor();
  renderDashboard();
}

function removeService(serviceId) {
  const data = loadData();
  const service = data.services.find(s => s.id === serviceId);
  if (!service) return;
  if (!confirm(`Remove "${service.name}" completely? This deletes all of its packages and can't be undone.`)) return;
  data.services = data.services.filter(s => s.id !== serviceId);
  saveData(data);
  logActivity(`Removed service "${service.name}"`);
  renderPackagesEditor();
  renderProjectsEditor();
  renderDashboard();
}

function addTier(serviceId) {
  const data = loadData();
  const service = data.services.find(s => s.id === serviceId);
  if (!service) return;
  const tierName = prompt('New tier name (e.g. "Enterprise"):', "New tier");
  if (!tierName || !tierName.trim()) return;
  service.packages.push(blankPackage(tierName.trim()));
  saveData(data);
  logActivity(`Added tier "${tierName.trim()}" to "${service.name}"`);
  renderPackagesEditor();
}

function removeTier(serviceId, idx) {
  const data = loadData();
  const service = data.services.find(s => s.id === serviceId);
  if (!service) return;
  if (service.packages.length <= 1) {
    alert("A service needs at least one package tier — remove the whole service instead if you no longer need it.");
    return;
  }
  if (!confirm(`Remove the "${service.packages[idx].tier}" tier?`)) return;
  const tierName = service.packages[idx].tier;
  service.packages.splice(idx, 1);
  saveData(data);
  logActivity(`Removed tier "${tierName}" from "${service.name}"`);
  renderPackagesEditor();
}

function buildPackageEditItem(serviceId, pkg, idx) {
  const item = document.createElement("div");
  item.className = "pkg-edit-item";
  item.dataset.idx = idx;
  item.innerHTML = `
    <div class="row-2">
      <div class="field">
        <label>Tier name</label>
        <input type="text" class="f-tier" value="${escapeHtml(pkg.tier)}">
      </div>
      <div class="field">
        <label>Price</label>
        <input type="text" class="f-price" value="${escapeHtml(pkg.price)}">
      </div>
    </div>
    <div class="row-2">
      <div class="field">
        <label>Billing period label</label>
        <input type="text" class="f-period" value="${escapeHtml(pkg.period)}">
      </div>
      <div class="field">
        <label>Mark as "Most chosen"</label>
        <select class="f-featured">
          <option value="false" ${!pkg.featured ? "selected" : ""}>No</option>
          <option value="true" ${pkg.featured ? "selected" : ""}>Yes</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label>Short description</label>
      <textarea class="f-desc" style="min-height:70px;">${escapeHtml(pkg.desc)}</textarea>
    </div>
    <div class="field">
      <label>Features (one per line)</label>
      <textarea class="f-features" style="min-height:110px;">${escapeHtml(pkg.features.join("\n"))}</textarea>
    </div>
    <div class="small-btn-row" style="margin-top:0;">
      <button type="button" class="btn btn-danger btn-sm" data-remove-tier-btn>Remove this tier</button>
    </div>
  `;
  item.querySelector("[data-remove-tier-btn]").addEventListener("click", () => removeTier(serviceId, idx));
  return item;
}

function saveServicePackages(serviceId) {
  const data = loadData();
  const service = data.services.find(s => s.id === serviceId);
  const wrap = document.querySelector(`.pkg-edit-wrap[data-service="${serviceId}"]`);
  const items = wrap.querySelectorAll(".pkg-edit-item");

  service.packages = Array.from(items).map(item => ({
    tier: item.querySelector(".f-tier").value.trim(),
    price: item.querySelector(".f-price").value.trim(),
    period: item.querySelector(".f-period").value.trim(),
    featured: item.querySelector(".f-featured").value === "true",
    desc: item.querySelector(".f-desc").value.trim(),
    features: item.querySelector(".f-features").value.split("\n").map(f => f.trim()).filter(Boolean)
  }));

  saveData(data);
  logActivity(`Updated packages for "${service.name}"`);
  const status = document.getElementById(`status-${serviceId}`);
  status.className = "form-status ok";
  status.style.display = "inline";
  status.textContent = "Saved — live on the Services page.";
  setTimeout(() => (status.style.display = "none"), 2500);
}

/* ---------------- Team editor ---------------- */

function renderTeamEditor() {
  const container = document.getElementById("team-editor");
  const data = loadData();
  container.innerHTML = "";

  data.team.forEach((member, idx) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.innerHTML = `
      <div class="row-2">
        <div class="field">
          <label>Name</label>
          <input type="text" class="t-name" value="${escapeHtml(member.name)}">
        </div>
        <div class="field">
          <label>Role / title</label>
          <input type="text" class="t-role" value="${escapeHtml(member.role)}">
        </div>
      </div>
      <div class="field">
        <label>Photo URL (optional)</label>
        <input type="text" class="t-photo" placeholder="https://..." value="${escapeHtml(member.photo || "")}">
      </div>
      <div class="field">
        <label>Short bio</label>
        <textarea class="t-bio" style="min-height:70px;">${escapeHtml(member.bio)}</textarea>
      </div>
      <div class="small-btn-row">
        <button class="btn btn-primary btn-sm" data-save-team="${idx}">Save</button>
        <button class="btn btn-danger btn-sm" data-remove-team="${idx}">Remove</button>
        <span class="form-status" id="team-status-${idx}"></span>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll("[data-save-team]").forEach(btn =>
    btn.addEventListener("click", () => saveTeamMember(Number(btn.dataset.saveTeam)))
  );
  container.querySelectorAll("[data-remove-team]").forEach(btn =>
    btn.addEventListener("click", () => removeTeamMember(Number(btn.dataset.removeTeam)))
  );
}

function saveTeamMember(idx) {
  const data = loadData();
  const cards = document.querySelectorAll("#team-editor .admin-card");
  const card = cards[idx];
  data.team[idx] = {
    name: card.querySelector(".t-name").value.trim(),
    role: card.querySelector(".t-role").value.trim(),
    photo: card.querySelector(".t-photo").value.trim(),
    bio: card.querySelector(".t-bio").value.trim()
  };
  saveData(data);
  logActivity(`Updated team member "${data.team[idx].name}"`);
  const status = document.getElementById(`team-status-${idx}`);
  status.className = "form-status ok";
  status.style.display = "inline";
  status.textContent = "Saved.";
  setTimeout(() => (status.style.display = "none"), 2000);
  renderDashboard();
}

function removeTeamMember(idx) {
  if (!confirm("Remove this team member from the Team page?")) return;
  const data = loadData();
  const removedName = data.team[idx] ? data.team[idx].name : "team member";
  data.team.splice(idx, 1);
  saveData(data);
  logActivity(`Removed team member "${removedName}"`);
  renderTeamEditor();
  renderDashboard();
}

function addTeamMember() {
  const data = loadData();
  data.team.push({ name: "New team member", role: "Role / Title", bio: "Add a short bio.", photo: "" });
  saveData(data);
  logActivity("Added a new team member");
  renderTeamEditor();
  renderDashboard();
}

/* ---------------- Demo projects editor ---------------- */
/* One card per service (same grouping as Packages), each holding up to
   MAX_PROJECTS_PER_SERVICE projects shown on that service's public demo
   page (demo.html?service=<id>), linked from a "View demo projects"
   button on the Services page. */

function renderProjectsEditor() {
  const container = document.getElementById("projects-editor");
  if (!container) return;
  const data = loadData();
  container.innerHTML = "";

  if (data.services.length === 0) {
    const empty = document.createElement("div");
    empty.className = "admin-card";
    empty.innerHTML = `<div class="sub">Add a service under "Services & Packages" first — each service gets its own demo projects gallery.</div>`;
    container.appendChild(empty);
    return;
  }

  data.services.forEach(service => {
    const projects = service.projects || [];
    const atLimit = projects.length >= MAX_PROJECTS_PER_SERVICE;
    const card = document.createElement("div");
    card.className = "admin-card";
    card.innerHTML = `
      <div class="service-block-head-row">
        <div>
          <h3>${escapeHtml(service.name)}</h3>
          <div class="sub">${projects.length} / ${MAX_PROJECTS_PER_SERVICE} demo projects uploaded</div>
        </div>
        <a href="demo.html?service=${encodeURIComponent(service.id)}" class="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer">View public page ↗</a>
      </div>
      <div class="proj-edit-wrap" data-service="${service.id}"></div>
      <div class="small-btn-row">
        <button class="btn btn-primary btn-sm" data-save-projects="${service.id}">Save changes</button>
        <button class="btn btn-ghost btn-sm" data-add-project="${service.id}" ${atLimit ? "disabled" : ""}>+ Add project</button>
        <span class="form-status" id="proj-status-${service.id}"></span>
      </div>
      ${atLimit ? `<div class="form-note">Limit of ${MAX_PROJECTS_PER_SERVICE} reached for this service. Remove one to add another, or raise MAX_PROJECTS_PER_SERVICE in js/data.js.</div>` : ""}
    `;
    container.appendChild(card);
    const wrap = card.querySelector(".proj-edit-wrap");
    projects.forEach((project, idx) => {
      wrap.appendChild(buildProjectEditItem(service.id, project, idx));
    });
  });

  container.querySelectorAll("[data-save-projects]").forEach(btn => {
    btn.addEventListener("click", () => saveServiceProjects(btn.dataset.saveProjects));
  });
  container.querySelectorAll("[data-add-project]").forEach(btn => {
    btn.addEventListener("click", () => addProject(btn.dataset.addProject));
  });
}

function buildProjectEditItem(serviceId, project, idx) {
  const item = document.createElement("div");
  item.className = "pkg-edit-item";
  item.dataset.idx = idx;
  item.innerHTML = `
    <div class="field">
      <label>Project title</label>
      <input type="text" class="p-title" value="${escapeHtml(project.title)}">
    </div>
    <div class="field">
      <label>Image URL</label>
      <input type="text" class="p-image" placeholder="https://..." value="${escapeHtml(project.image || "")}">
    </div>
    <div class="field">
      <label>Short description</label>
      <textarea class="p-desc" style="min-height:70px;">${escapeHtml(project.description)}</textarea>
    </div>
    <div class="field" style="margin-bottom:0;">
      <label>Live demo / case study link (optional)</label>
      <input type="text" class="p-link" placeholder="https://..." value="${escapeHtml(project.link || "")}">
    </div>
    <div class="small-btn-row" style="margin-top:14px;">
      <button type="button" class="btn btn-danger btn-sm" data-remove-project-btn>Remove this project</button>
    </div>
  `;
  item.querySelector("[data-remove-project-btn]").addEventListener("click", () => removeProject(serviceId, idx));
  return item;
}

function addProject(serviceId) {
  const data = loadData();
  const service = data.services.find(s => s.id === serviceId);
  if (!service) return;
  service.projects = service.projects || [];
  if (service.projects.length >= MAX_PROJECTS_PER_SERVICE) {
    alert(`This service already has ${MAX_PROJECTS_PER_SERVICE} demo projects — remove one first, or raise MAX_PROJECTS_PER_SERVICE in js/data.js.`);
    return;
  }
  service.projects.push(blankProject());
  saveData(data);
  logActivity(`Added a demo project to "${service.name}"`);
  renderProjectsEditor();
  renderDashboard();
}

function removeProject(serviceId, idx) {
  if (!confirm("Remove this demo project?")) return;
  const data = loadData();
  const service = data.services.find(s => s.id === serviceId);
  if (!service) return;
  service.projects.splice(idx, 1);
  saveData(data);
  logActivity(`Removed a demo project from "${service.name}"`);
  renderProjectsEditor();
  renderDashboard();
}

function saveServiceProjects(serviceId) {
  const data = loadData();
  const service = data.services.find(s => s.id === serviceId);
  if (!service) return;
  const wrap = document.querySelector(`.proj-edit-wrap[data-service="${serviceId}"]`);
  const items = wrap.querySelectorAll(".pkg-edit-item");

  service.projects = Array.from(items).map(item => ({
    title: item.querySelector(".p-title").value.trim(),
    image: item.querySelector(".p-image").value.trim(),
    description: item.querySelector(".p-desc").value.trim(),
    link: item.querySelector(".p-link").value.trim()
  }));

  saveData(data);
  logActivity(`Updated demo projects for "${service.name}"`);
  const status = document.getElementById(`proj-status-${serviceId}`);
  status.className = "form-status ok";
  status.style.display = "inline";
  status.textContent = "Saved — live on the demo page.";
  setTimeout(() => (status.style.display = "none"), 2500);
  renderDashboard();
}

/* ---------------- Messages ---------------- */

/* ---------------- Leads (CRM) ---------------- */

const LEAD_STAGES = ["New", "Contacted", "Qualified", "Proposal Sent", "Won"];
const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"];

function renderLeadPipeline(leads, targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const colors = { New: "#6d9bff", Contacted: "#8b7bff", Qualified: "#c68bff", "Proposal Sent": "#ffb74d", Won: "#56e6a5" };
  el.innerHTML = LEAD_STAGES.map(stage => {
    const count = leads.filter(l => (l.leadStatus || "New") === stage).length;
    return `
      <div class="lead-stage" style="--stage-color:${colors[stage]};">
        <div class="lead-stage-count">${count}</div>
        <div class="lead-stage-name">${escapeHtml(stage)}</div>
      </div>`;
  }).join("");
}

function renderLeads() {
  const data = loadData();
  const list = document.getElementById("leads-list");
  if (!list) return;

  renderLeadPipeline(data.messages, "lead-pipeline");

  const searchEl = document.getElementById("leads-search");
  const filterEl = document.getElementById("leads-status-filter");
  const search = (searchEl && searchEl.value.trim().toLowerCase()) || "";
  const statusFilter = (filterEl && filterEl.value) || "";

  let leads = data.messages.slice();
  if (statusFilter) leads = leads.filter(l => (l.leadStatus || "New") === statusFilter);
  if (search) {
    leads = leads.filter(l =>
      (l.name || "").toLowerCase().includes(search) ||
      (l.company || "").toLowerCase().includes(search) ||
      (l.email || "").toLowerCase().includes(search)
    );
  }

  if (leads.length === 0) {
    list.innerHTML = `<div class="admin-card"><div class="sub" style="margin:0;">No leads match yet.</div></div>`;
  } else {
    list.innerHTML = leads.map(l => {
      const date = new Date(l.date);
      const status = l.leadStatus || "New";
      const priority = l.priority || "Normal";
      return `
      <div class="admin-card lead-card" data-lead-id="${l.id}">
        <div class="lead-card-head">
          <div>
            <b>${escapeHtml(l.name || "Unknown")}</b>${l.company ? ` <span class="sub" style="margin:0;">— ${escapeHtml(l.company)}</span>` : ""}
            <div>
              <span class="lead-badge status-${status.replace(/\s+/g, "-")}">${escapeHtml(status)}</span>
              ${priority === "High" ? `<span class="lead-badge priority-High" style="margin-left:6px;">High priority</span>` : ""}
            </div>
          </div>
          <span class="sub" style="margin:0;">${date.toLocaleDateString()}</span>
        </div>
        <div class="lead-card-meta">
          ${escapeHtml(l.email || "")}${l.phone ? " · " + escapeHtml(l.phone) : ""}${l.country ? " · " + escapeHtml(l.country) : ""}<br>
          ${escapeHtml(l.service || "General enquiry")}${l.budget ? " · Budget: " + escapeHtml(l.budget) : ""}${l.contactMethod ? " · Prefers: " + escapeHtml(l.contactMethod) : ""}
        </div>
        <p style="margin:0 0 4px;">${escapeHtml(l.message || "")}</p>

        <div class="lead-card-controls">
          <select data-lead-status="${l.id}">
            ${LEAD_STATUSES.map(s => `<option value="${s}" ${s === status ? "selected" : ""}>${s}</option>`).join("")}
          </select>
          <select data-lead-priority="${l.id}">
            <option value="Normal" ${priority === "Normal" ? "selected" : ""}>Normal priority</option>
            <option value="High" ${priority === "High" ? "selected" : ""}>High priority</option>
          </select>
          <input type="date" data-lead-followup="${l.id}" value="${l.followUpDate || ""}" title="Follow-up date">
          <button class="btn btn-ghost btn-sm" data-lead-delete="${l.id}">Delete</button>
        </div>

        <div class="lead-notes">
          ${(l.notes || []).map(n => `
            <div class="lead-note">
              <div class="sub">${new Date(n.date).toLocaleDateString()} ${new Date(n.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              ${escapeHtml(n.text)}
            </div>
          `).join("")}
          <div class="small-btn-row" style="margin-top:8px; gap:8px;">
            <input type="text" data-lead-note-input="${l.id}" placeholder="Add a note…" style="flex:1;">
            <button class="btn btn-primary btn-sm" data-lead-note-add="${l.id}">Add</button>
          </div>
        </div>
      </div>`;
    }).join("");
  }

  list.querySelectorAll("[data-lead-status]").forEach(sel =>
    sel.addEventListener("change", () => updateLeadField(sel.dataset.leadStatus, "leadStatus", sel.value))
  );
  list.querySelectorAll("[data-lead-priority]").forEach(sel =>
    sel.addEventListener("change", () => updateLeadField(sel.dataset.leadPriority, "priority", sel.value))
  );
  list.querySelectorAll("[data-lead-followup]").forEach(inp =>
    inp.addEventListener("change", () => updateLeadField(inp.dataset.leadFollowup, "followUpDate", inp.value))
  );
  list.querySelectorAll("[data-lead-delete]").forEach(btn =>
    btn.addEventListener("click", () => deleteLead(btn.dataset.leadDelete))
  );
  list.querySelectorAll("[data-lead-note-add]").forEach(btn =>
    btn.addEventListener("click", () => {
      const id = btn.dataset.leadNoteAdd;
      const input = list.querySelector(`[data-lead-note-input="${id}"]`);
      const text = input.value.trim();
      if (!text) return;
      addLeadNote(id, text);
    })
  );

  if (searchEl && !searchEl.dataset.bound) {
    searchEl.dataset.bound = "1";
    searchEl.addEventListener("input", () => renderLeads());
  }
  if (filterEl && !filterEl.dataset.bound) {
    filterEl.dataset.bound = "1";
    filterEl.addEventListener("change", () => renderLeads());
  }
  const exportBtn = document.getElementById("export-leads-btn");
  if (exportBtn && !exportBtn.dataset.bound) {
    exportBtn.dataset.bound = "1";
    exportBtn.addEventListener("click", exportLeadsCsv);
  }
}

function updateLeadField(id, field, value) {
  const data = loadData();
  const lead = data.messages.find(m => m.id === id);
  if (!lead) return;
  lead[field] = value;
  saveData(data);
  logActivity(`Updated lead ${field} for "${lead.name || "a lead"}"`);
  renderLeads();
  renderDashboard();
}

function addLeadNote(id, text) {
  const data = loadData();
  const lead = data.messages.find(m => m.id === id);
  if (!lead) return;
  lead.notes = lead.notes || [];
  lead.notes.push({ text, date: new Date().toISOString() });
  saveData(data);
  renderLeads();
}

function deleteLead(id) {
  if (!confirm("Delete this lead? This can't be undone.")) return;
  const data = loadData();
  data.messages = data.messages.filter(m => m.id !== id);
  saveData(data);
  logActivity("Deleted a lead");
  renderLeads();
  renderDashboard();
}

function exportLeadsCsv() {
  const data = loadData();
  const cols = ["name", "company", "email", "phone", "country", "service", "budget", "contactMethod", "leadStatus", "priority", "followUpDate", "source", "date", "message"];
  const rows = [cols.join(",")].concat(
    data.messages.map(l => cols.map(c => `"${String(l[c] ?? "").replace(/"/g, '""')}"`).join(","))
  );
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bitvulex-leads.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function renderMessages() {
  const data = loadData();
  const session = getSession();
  const isAdmin = session && session.role === "administrator";
  const list = document.getElementById("messages-list");
  if (!list) return;
  list.innerHTML = "";

  if (data.messages.length === 0) {
    list.innerHTML = `<div class="admin-card"><div class="sub" style="margin:0;">No messages yet.</div></div>`;
    return;
  }

  data.messages.forEach(m => {
    const date = new Date(m.date);
    const card = document.createElement("div");
    card.className = "admin-card msg-card" + (m.read ? "" : " msg-unread");
    card.innerHTML = `
      <div class="msg-head">
        <div>
          <b>${escapeHtml(m.name || "Unknown")}</b>
          <span class="sub" style="margin:0;"> — ${escapeHtml(m.email || "")}</span>
          ${!m.read ? '<span class="badge badge-node" style="margin-left:8px;">New</span>' : ""}
        </div>
        <span class="sub" style="margin:0;">${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div class="sub" style="margin:4px 0 10px;">${escapeHtml(m.service || "General enquiry")} · via ${escapeHtml(m.source || "Direct")}</div>
      <p style="margin:0 0 14px;">${escapeHtml(m.message)}</p>
      ${(m.replies && m.replies.length) ? `
        <div class="msg-thread">
          ${m.replies.map(r => `
            <div class="msg-reply">
              <div class="sub" style="margin:0;"><b>${escapeHtml(r.by)}</b> replied — ${new Date(r.date).toLocaleDateString()} ${new Date(r.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              <div>${escapeHtml(r.text)}</div>
            </div>
          `).join("")}
        </div>
      ` : ""}
      <div class="small-btn-row" style="margin-top:10px;">
        <button class="btn btn-primary btn-sm" data-reply-msg="${m.id}">Reply</button>
        ${!m.read ? `<button class="btn btn-ghost btn-sm" data-read-msg="${m.id}">Mark as read</button>` : ""}
      </div>
      <div class="reply-box" id="reply-box-${m.id}" style="display:none;">
        <textarea class="reply-text" placeholder="Write your reply…" style="min-height:70px;"></textarea>
        <div class="small-btn-row" style="margin-top:8px;">
          <button class="btn btn-primary btn-sm" data-send-reply="${m.id}">Send reply</button>
          <button class="btn btn-ghost btn-sm" data-cancel-reply="${m.id}">Cancel</button>
        </div>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll("[data-reply-msg]").forEach(btn =>
    btn.addEventListener("click", () => {
      const box = document.getElementById("reply-box-" + btn.dataset.replyMsg);
      if (box) { box.style.display = "block"; box.querySelector(".reply-text").focus(); }
    })
  );
  list.querySelectorAll("[data-cancel-reply]").forEach(btn =>
    btn.addEventListener("click", () => {
      const box = document.getElementById("reply-box-" + btn.dataset.cancelReply);
      if (box) box.style.display = "none";
    })
  );
  list.querySelectorAll("[data-send-reply]").forEach(btn =>
    btn.addEventListener("click", () => {
      const box = document.getElementById("reply-box-" + btn.dataset.sendReply);
      const text = box.querySelector(".reply-text").value.trim();
      if (!text) return;
      replyToMessage(btn.dataset.sendReply, text);
    })
  );
  list.querySelectorAll("[data-read-msg]").forEach(btn =>
    btn.addEventListener("click", () => markMessageRead(btn.dataset.readMsg))
  );

  const clearBtn = document.getElementById("clear-messages-btn");
  if (clearBtn) clearBtn.style.display = isAdmin ? "" : "none";
}

function markMessageRead(id) {
  const data = loadData();
  const msg = data.messages.find(m => m.id === id);
  if (!msg) return;
  msg.read = true;
  saveData(data);
  renderMessages();
  renderNotifications();
}

function replyToMessage(id, text) {
  const data = loadData();
  const session = getSession();
  const msg = data.messages.find(m => m.id === id);
  if (!msg) return;
  msg.replies = msg.replies || [];
  msg.replies.push({ by: session.username, text, date: new Date().toISOString() });
  msg.read = true;
  saveData(data);
  logActivity(`Replied to a message from "${msg.name}"`);
  renderMessages();
  renderNotifications();

  // Open a pre-filled email so the reply actually reaches the client —
  // this is a static site with no server, so there's no way to send it
  // automatically without EmailJS/SMTP of its own.
  const subject = encodeURIComponent(`Re: your message to Bitvulex`);
  const body = encodeURIComponent(text);
  if (msg.email) window.location.href = `mailto:${msg.email}?subject=${subject}&body=${body}`;
}

function clearMessages() {
  const session = getSession();
  if (!session || session.role !== "administrator") return;
  if (!confirm("Clear all stored messages? This cannot be undone.")) return;
  const data = loadData();
  data.messages = [];
  saveData(data);
  logActivity("Cleared all messages");
  renderMessages();
  renderDashboard();
  renderNotifications();
}

/* ---------------- Notification bell ---------------- */

function renderNotifications() {
  const bellBtn = document.getElementById("notif-bell-btn");
  const badge = document.getElementById("notif-badge");
  const panelList = document.getElementById("notif-list");
  // Mirrors the desktop bell badge onto the mobile bottom-nav's Messages
  // tab, since the bell itself is hidden below 860px (see .admin-welcome-actions).
  const abnBadge = document.getElementById("abn-notif-badge");
  if (!bellBtn || !panelList) return;

  const data = loadData();
  const unread = (data.messages || []).filter(m => !m.read);

  if (badge) {
    if (unread.length > 0) { badge.textContent = unread.length > 9 ? "9+" : String(unread.length); badge.style.display = "flex"; }
    else badge.style.display = "none";
  }
  if (abnBadge) {
    if (unread.length > 0) { abnBadge.textContent = unread.length > 9 ? "9+" : String(unread.length); abnBadge.style.display = "flex"; }
    else abnBadge.style.display = "none";
  }

  if (unread.length === 0) {
    panelList.innerHTML = `<div class="notif-empty">No new client messages.</div>`;
    return;
  }
  panelList.innerHTML = unread.slice(0, 8).map(m => `
    <div class="notif-item" data-notif-goto-messages>
      <b>${escapeHtml(m.name || "New enquiry")}</b>
      <div class="sub" style="margin:2px 0 0;">${escapeHtml((m.message || "").slice(0, 70))}${(m.message || "").length > 70 ? "…" : ""}</div>
    </div>
  `).join("");
}

/* ---------------- Social Links editor ---------------- */

function renderSocialEditor() {
  const data = loadData();
  const wrap = document.getElementById("social-editor");
  wrap.innerHTML = "";
  (data.settings.social || []).forEach((s, idx) => {
    wrap.appendChild(buildSocialRow(s, idx));
  });
  wireSocialRowPreviews();
}

function buildSocialRow(s, idx) {
  const row = document.createElement("div");
  row.className = "social-edit-row";
  row.dataset.idx = idx;
  row.innerHTML = `
    <span class="social-icon-preview" data-preview>${socialIconSvg(s.platform || "")}</span>
    <input type="text" class="s-platform platform-input" placeholder="Platform (e.g. Facebook)" value="${escapeHtml(s.platform || "")}">
    <input type="text" class="s-url" placeholder="https://... (leave blank to hide)" value="${escapeHtml(s.url || "")}">
    <button type="button" class="btn btn-danger btn-sm" data-remove-social>Remove</button>
  `;
  row.querySelector("[data-remove-social]").addEventListener("click", () => {
    row.remove();
  });
  return row;
}

function wireSocialRowPreviews() {
  document.querySelectorAll("#social-editor .social-edit-row").forEach(row => {
    const input = row.querySelector(".s-platform");
    const preview = row.querySelector("[data-preview]");
    input.addEventListener("input", () => {
      preview.innerHTML = socialIconSvg(input.value);
    });
  });
}

function addSocialRow() {
  const wrap = document.getElementById("social-editor");
  const row = buildSocialRow({ platform: "", url: "" }, wrap.children.length);
  wrap.appendChild(row);
  wireSocialRowPreviews();
  row.querySelector(".s-platform").focus();
}

function saveSocialLinks() {
  const data = loadData();
  const rows = document.querySelectorAll("#social-editor .social-edit-row");
  data.settings.social = Array.from(rows)
    .map(row => ({
      platform: row.querySelector(".s-platform").value.trim(),
      url: row.querySelector(".s-url").value.trim()
    }))
    .filter(s => s.platform || s.url);
  saveData(data);
  logActivity("Updated social links");
  renderSocialEditor();
  flashStatus("social-status", "ok", "Saved — live in the footer of every page.");
}

/* ---------------- Growth Stats editor ---------------- */

function renderStatsEditor() {
  const data = loadData();
  const stats = data.stats || { headline: "", subline: "", unitLabel: "clients", points: [] };
  document.getElementById("stat-headline").value = stats.headline || "";
  document.getElementById("stat-subline").value = stats.subline || "";
  document.getElementById("stat-unit").value = stats.unitLabel || "clients";
  const wrap = document.getElementById("stats-editor");
  wrap.innerHTML = "";
  (stats.points || []).forEach((p, idx) => wrap.appendChild(buildStatRow(p, idx)));
}

function buildStatRow(p, idx) {
  const row = document.createElement("div");
  row.className = "stat-edit-row";
  row.dataset.idx = idx;
  row.innerHTML = `
    <input type="text" class="st-label stat-label-input" placeholder="Label (e.g. 2026)" value="${escapeHtml(String(p.label ?? ""))}">
    <input type="number" class="st-value" placeholder="Value" value="${escapeHtml(String(p.value ?? 0))}">
    <button type="button" class="btn btn-danger btn-sm" data-remove-stat>Remove</button>
  `;
  row.querySelector("[data-remove-stat]").addEventListener("click", () => row.remove());
  return row;
}

function addStatRow() {
  const wrap = document.getElementById("stats-editor");
  const row = buildStatRow({ label: "", value: 0 }, wrap.children.length);
  wrap.appendChild(row);
  row.querySelector(".st-label").focus();
}

function saveStats() {
  const data = loadData();
  const rows = document.querySelectorAll("#stats-editor .stat-edit-row");
  const points = Array.from(rows)
    .map(row => ({
      label: row.querySelector(".st-label").value.trim(),
      value: Number(row.querySelector(".st-value").value) || 0
    }))
    .filter(p => p.label);

  data.stats = {
    headline: document.getElementById("stat-headline").value.trim() || "Trusted by growing businesses",
    subline: document.getElementById("stat-subline").value.trim(),
    unitLabel: document.getElementById("stat-unit").value.trim() || "clients",
    points
  };
  saveData(data);
  logActivity("Updated growth stats");
  renderStatsEditor();
  flashStatus("stats-status", "ok", "Saved — live on the homepage chart.");
}

/* ---------------- Settings ---------------- */

function renderSettings() {
  const data = loadData();
  document.getElementById("set-email").value = data.settings.contactEmail;
  document.getElementById("set-ej-service").value = data.settings.emailjsServiceId;
  document.getElementById("set-ej-template").value = data.settings.emailjsTemplateId;
  document.getElementById("set-ej-key").value = data.settings.emailjsPublicKey;
  document.getElementById("set-otp-template").value = data.settings.emailjsOtpTemplateId || "";
  document.getElementById("set-otp-enabled").checked = !!data.settings.otpEnabled;
  const theme = data.settings.theme === "dark" ? "dark" : "light";
  document.getElementById("theme-radio-dark").checked = theme === "dark";
  document.getElementById("theme-radio-light").checked = theme === "light";
}

function saveThemeSetting(theme) {
  const data = loadData();
  data.settings.theme = theme;
  saveData(data);
  logActivity(`Set site theme to ${theme}`);
  // apply immediately in this tab, and drop any personal override so the
  // admin sees exactly what a fresh visitor will see
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.removeItem("bitvulex_theme_override"); } catch (e) {}
  flashStatus("settings-theme-status", "ok", `Saved — ${theme === "light" ? "Light" : "Dark"} is now the default for every new visitor.`);
}

function saveEmailSetting(e) {
  e.preventDefault();
  const data = loadData();
  data.settings.contactEmail = document.getElementById("set-email").value.trim();
  saveData(data);
  logActivity("Updated contact inbox address");
  flashStatus("settings-email-status", "ok", "Saved — this is now the address shown on Contact and used for submissions.");
}

function saveEmailJsSettings(e) {
  e.preventDefault();
  const data = loadData();
  data.settings.emailjsServiceId = document.getElementById("set-ej-service").value.trim();
  data.settings.emailjsTemplateId = document.getElementById("set-ej-template").value.trim();
  data.settings.emailjsPublicKey = document.getElementById("set-ej-key").value.trim();
  saveData(data);
  if (window.emailjs && data.settings.emailjsPublicKey) {
    try { emailjs.init({ publicKey: data.settings.emailjsPublicKey }); } catch (e) {}
  }
  logActivity("Updated EmailJS settings");
  flashStatus("settings-emailjs-status", "ok", "Saved — messages and package inquiries will now send through EmailJS.");
}

function saveOtpSettings(e) {
  e.preventDefault();
  const data = loadData();
  const templateId = document.getElementById("set-otp-template").value.trim();
  const enabled = document.getElementById("set-otp-enabled").checked;

  if (enabled && (!templateId || !data.settings.emailjsServiceId || !data.settings.emailjsPublicKey)) {
    flashStatus("settings-otp-status", "err", "Set the Service ID and Public key above, plus an OTP Template ID, before turning this on.");
    return;
  }

  data.settings.emailjsOtpTemplateId = templateId;
  data.settings.otpEnabled = enabled;
  saveData(data);
  logActivity(`${enabled ? "Enabled" : "Disabled"} two-factor login verification`);
  flashStatus("settings-otp-status", "ok", enabled
    ? "Saved — every admin login now requires an emailed code."
    : "Saved — logins will no longer require a code.");
}

/* ---------------- Users & Roles (administrator only) ---------------- */

function renderUsers() {
  const data = loadData();
  const tbody = document.getElementById("users-table-body");
  tbody.innerHTML = "";
  const session = getSession();

  data.admin.users.forEach((user, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="u-username" value="${escapeHtml(user.username)}" style="background:var(--panel-2); border:1px solid var(--line-bright); border-radius:6px; color:var(--ink); padding:7px 9px; width:130px;"></td>
      <td><input type="email" class="u-email" value="${escapeHtml(user.email || "")}" placeholder="name@example.com" style="background:var(--panel-2); border:1px solid var(--line-bright); border-radius:6px; color:var(--ink); padding:7px 9px; width:180px;"></td>
      <td>
        <select class="u-role" style="background:var(--panel-2); border:1px solid var(--line-bright); border-radius:6px; color:var(--ink); padding:7px 9px;">
          <option value="administrator" ${user.role === "administrator" ? "selected" : ""}>administrator</option>
          <option value="Node1" ${user.role === "Node1" ? "selected" : ""}>Node1</option>
          <option value="Node2" ${user.role === "Node2" ? "selected" : ""}>Node2</option>
        </select>
      </td>
      <td>
        <button class="btn btn-ghost btn-sm" data-save-user="${idx}">Save</button>
        <button class="btn btn-ghost btn-sm" data-reset-pass="${idx}">Reset password</button>
        <button class="btn btn-danger btn-sm" data-remove-user="${idx}" ${user.username === session.username ? "disabled title='Cannot remove your own account'" : ""}>Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-save-user]").forEach(btn =>
    btn.addEventListener("click", () => saveUser(Number(btn.dataset.saveUser)))
  );
  tbody.querySelectorAll("[data-reset-pass]").forEach(btn =>
    btn.addEventListener("click", () => resetUserPassword(Number(btn.dataset.resetPass)))
  );
  tbody.querySelectorAll("[data-remove-user]").forEach(btn =>
    btn.addEventListener("click", () => removeUser(Number(btn.dataset.removeUser)))
  );
}

function saveUser(idx) {
  const data = loadData();
  const rows = document.querySelectorAll("#users-table-body tr");
  const row = rows[idx];
  const newUsername = row.querySelector(".u-username").value.trim();
  const newEmail = row.querySelector(".u-email").value.trim();
  if (!newUsername) return alert("Username can't be empty.");
  if (!newEmail || !newEmail.includes("@")) return alert("Enter a valid email — login codes are sent there.");
  data.admin.users[idx].username = newUsername;
  data.admin.users[idx].email = newEmail;
  data.admin.users[idx].role = row.querySelector(".u-role").value;
  saveData(data);
  logActivity(`Updated account "${newUsername}"`);
  renderUsers();
}

function resetUserPassword(idx) {
  const newPass = prompt("Enter a new password for this user (min 6 characters):");
  if (!newPass) return;
  if (newPass.length < 6) return alert("Password must be at least 6 characters.");
  const data = loadData();
  data.admin.users[idx].password = newPass;
  saveData(data);
  logActivity(`Reset password for "${data.admin.users[idx].username}"`);
}

function removeUser(idx) {
  const data = loadData();
  const session = getSession();
  if (data.admin.users[idx].username === session.username) {
    return alert("You can't remove the account you're currently logged in as.");
  }
  if (!confirm(`Remove user "${data.admin.users[idx].username}"?`)) return;
  const removedName = data.admin.users[idx].username;
  data.admin.users.splice(idx, 1);
  saveData(data);
  logActivity(`Removed account "${removedName}"`);
  renderUsers();
}

function addUser() {
  const username = prompt("New username:");
  if (!username) return;
  const email = prompt("Their email (required — this is where their login code is sent):");
  if (!email || !email.includes("@")) return alert("A valid email is required.");
  const password = prompt("Temporary password (min 6 characters):");
  if (!password || password.length < 6) return alert("Password must be at least 6 characters.");
  const data = loadData();
  if (data.admin.users.some(u => u.username === username)) return alert("That username already exists.");
  data.admin.users.push({ username, password, role: "Node1", email });
  saveData(data);
  logActivity(`Created account "${username}"`);
  renderUsers();
}

/* ---------------- My account (administrator only) ---------------- */

function changeOwnUsername(e) {
  e.preventDefault();
  const session = getSession();
  const data = loadData();
  const user = data.admin.users.find(u => u.username === session.username);
  const newUsername = document.getElementById("acc-username").value.trim();

  if (!user) return;
  if (!newUsername) {
    flashStatus("account-username-status", "err", "Username can't be empty.");
    return;
  }
  if (newUsername !== user.username && data.admin.users.some(u => u.username === newUsername)) {
    flashStatus("account-username-status", "err", "That username is already taken.");
    return;
  }

  const oldUsername = user.username;
  user.username = newUsername;
  saveData(data);
  logActivity(`Renamed account "${oldUsername}" to "${newUsername}"`);
  const newSession = { username: newUsername, role: session.role };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
  renderWhoAmI(newSession);
  document.getElementById("account-role-display").textContent = `Logged in as ${newUsername} (${newSession.role})`;
  flashStatus("account-username-status", "ok", "Username updated. Use it next time you log in.");
}

function changeOwnPassword(e) {
  e.preventDefault();
  const session = getSession();
  const data = loadData();
  const user = data.admin.users.find(u => u.username === session.username);
  const current = document.getElementById("acc-current").value;
  const next = document.getElementById("acc-new").value;

  if (!user || user.password !== current) {
    flashStatus("account-status", "err", "Current password is incorrect.");
    return;
  }
  user.password = next;
  saveData(data);
  logActivity("Changed their own password");
  document.getElementById("account-pass-form").reset();
  flashStatus("account-status", "ok", "Password updated. Use it next time you log in.");
}

function renderAccountEmail(session) {
  const data = loadData();
  const user = data.admin.users.find(u => u.username === session.username);
  const emailInput = document.getElementById("acc-email");
  if (emailInput) emailInput.value = (user && user.email) || "";
}

function saveAccountEmail(e) {
  e.preventDefault();
  const session = getSession();
  const data = loadData();
  const user = data.admin.users.find(u => u.username === session.username);
  const newEmail = document.getElementById("acc-email").value.trim();
  if (!user) return;
  if (!newEmail || !newEmail.includes("@")) {
    flashStatus("account-email-status", "err", "Enter a valid email address.");
    return;
  }
  user.email = newEmail;
  saveData(data);
  logActivity("Updated their own login email");
  flashStatus("account-email-status", "ok", "Saved. Your next login code will be sent here.");
}

function logActivity(action) {
  const session = getSession();
  if (!session) return;
  const data = loadData();
  data.activityLog = data.activityLog || [];
  data.activityLog.unshift({
    username: session.username,
    role: session.role,
    action,
    date: new Date().toISOString()
  });
  data.activityLog = data.activityLog.slice(0, 200);
  saveData(data);
  renderActivityLog(session);
  // every logged action already reads as a clear, human sentence
  // ("Removed team member ...", "Updated packages for ..."), so surface
  // it as a toast too — this is what actually confirms to the admin
  // that a delete/update/upload went through, on every panel, without
  // having to touch each individual save/remove function.
  notifyActivity(action);
}

/* ---------------- Toast notifications ----------------
   A single, consistent, professional confirmation for every admin
   action — "X deleted", "X updated/saved" — instead of the browser's
   native alert() or a small text line only some panels had. Picks its
   color/icon from the action text logActivity() already writes. */
function notifyActivity(action) {
  const lower = action.toLowerCase();
  const isDelete = /^(removed|cleared|deleted)/.test(lower);
  toast(action, isDelete ? "delete" : "success");
}

function toast(message, type) {
  type = type === "delete" || type === "error" ? type : "success";
  let stack = document.getElementById("admin-toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "admin-toast-stack";
    stack.className = "admin-toast-stack";
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }

  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>'
  };
  const labels = { success: "Saved", delete: "Deleted", error: "Heads up" };

  const el = document.createElement("div");
  el.className = `admin-toast admin-toast-${type}`;
  el.innerHTML = `
    <span class="admin-toast-icon">${icons[type]}</span>
    <span class="admin-toast-body">
      <span class="admin-toast-title">${labels[type]}</span>
      <span class="admin-toast-msg"></span>
    </span>
    <button type="button" class="admin-toast-close" aria-label="Dismiss notification">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
    <span class="admin-toast-bar"></span>
  `;
  el.querySelector(".admin-toast-msg").textContent = message;
  stack.appendChild(el);

  requestAnimationFrame(() => el.classList.add("show"));

  const DURATION = 4200;
  const dismiss = () => {
    el.classList.remove("show");
    el.classList.add("hide");
    setTimeout(() => el.remove(), 300);
  };
  const timer = setTimeout(dismiss, DURATION);
  el.querySelector(".admin-toast-close").addEventListener("click", () => {
    clearTimeout(timer);
    dismiss();
  });

  // cap the stack so a burst of actions doesn't pile up forever
  const toasts = stack.querySelectorAll(".admin-toast");
  if (toasts.length > 4) toasts[0].querySelector(".admin-toast-close").click();
}

function renderActivityLog() {
  const tbody = document.getElementById("activity-log-body");
  if (!tbody) return;
  const data = loadData();
  const log = data.activityLog || [];
  tbody.innerHTML = "";
  if (log.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--ink-mute);">No activity recorded yet.</td></tr>`;
    return;
  }
  log.forEach((entry, idx) => {
    const tr = document.createElement("tr");
    const d = new Date(entry.date);
    tr.innerHTML = `
      <td>${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
      <td>${escapeHtml(entry.username)}</td>
      <td><span class="badge ${entry.role === "administrator" ? "badge-admin" : "badge-node"}">${escapeHtml(entry.role)}</span></td>
      <td>${escapeHtml(entry.action)}</td>
      <td><button class="btn btn-ghost btn-sm" data-delete-log="${idx}" title="Delete this entry">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll("[data-delete-log]").forEach(btn =>
    btn.addEventListener("click", () => deleteActivityLogEntry(Number(btn.dataset.deleteLog)))
  );
}

function deleteActivityLogEntry(idx) {
  const data = loadData();
  const log = data.activityLog || [];
  if (idx < 0 || idx >= log.length) return;
  log.splice(idx, 1);
  data.activityLog = log;
  saveData(data);
  renderActivityLog();
}

function clearActivityLog() {
  if (!confirm("Clear the entire activity log? This can't be undone.")) return;
  const data = loadData();
  data.activityLog = [];
  saveData(data);
  renderActivityLog();
  toast("Cleared the activity log", "delete");
}

/* ---------------- Utilities ---------------- */

function flashStatus(id, kind, msg) {
  const el = document.getElementById(id);
  el.className = `form-status ${kind}`;
  el.style.display = "block";
  el.textContent = msg;
  setTimeout(() => (el.style.display = "none"), 3000);
}


/* ---------------- Reviews editor ---------------- */

function renderReviewsEditor() {
  const data = loadData();
  const cfg = data.reviewsSettings;
  document.getElementById("rv-set-title").value = cfg.title;
  document.getElementById("rv-set-biz").value = cfg.businessName;
  document.getElementById("rv-set-cta").value = cfg.ctaLabel;
  document.getElementById("rv-set-link").value = cfg.ctaLink;

  const container = document.getElementById("reviews-editor");
  container.innerHTML = "";
  if (!data.reviews.length) {
    container.innerHTML = `<div class="admin-card muted">No reviews yet. Click “+ Add review” to create the first one.</div>`;
    return;
  }
  data.reviews.forEach((r, idx) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.innerHTML = `
      <div class="row-2">
        <div class="field"><label>Client name</label><input type="text" class="r-name" value="${escapeHtml(r.name)}"></div>
        <div class="field"><label>Role / company (optional)</label><input type="text" class="r-role" value="${escapeHtml(r.role)}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Stars</label>
          <select class="r-stars">${[5,4,3,2,1].map(n => `<option value="${n}" ${Number(r.stars) === n ? "selected" : ""}>${"★".repeat(n)}${"☆".repeat(5-n)} (${n})</option>`).join("")}</select></div>
        <div class="field"><label>Review date</label><input type="date" class="r-date" value="${escapeHtml(r.date)}"></div>
      </div>
      <div class="field"><label>Review message</label><textarea class="r-msg" style="min-height:90px;">${escapeHtml(r.message)}</textarea></div>
      <label class="check-row"><input type="checkbox" class="r-pub" ${r.published ? "checked" : ""}> Published on website</label>
      <div class="small-btn-row">
        <button class="btn btn-primary btn-sm" data-save-review="${idx}">Save</button>
        <button class="btn btn-danger btn-sm" data-remove-review="${idx}">Remove</button>
        <span class="form-status" id="review-status-${idx}"></span>
      </div>`;
    container.appendChild(card);
  });
  container.querySelectorAll("[data-save-review]").forEach(b => b.addEventListener("click", () => saveReview(Number(b.dataset.saveReview))));
  container.querySelectorAll("[data-remove-review]").forEach(b => b.addEventListener("click", () => removeReview(Number(b.dataset.removeReview))));
}

function saveReview(idx) {
  const data = loadData();
  const card = document.querySelectorAll("#reviews-editor .admin-card")[idx];
  const old = data.reviews[idx];
  data.reviews[idx] = {
    ...old,
    name: card.querySelector(".r-name").value.trim(),
    role: card.querySelector(".r-role").value.trim(),
    stars: Number(card.querySelector(".r-stars").value),
    date: card.querySelector(".r-date").value,
    message: card.querySelector(".r-msg").value.trim(),
    published: card.querySelector(".r-pub").checked
  };
  saveData(data);
  logActivity(`Updated review by "${data.reviews[idx].name}"`);
  const st = document.getElementById(`review-status-${idx}`);
  st.className = "form-status ok"; st.style.display = "inline"; st.textContent = "Saved — live on the homepage.";
  setTimeout(() => (st.style.display = "none"), 2200);
}

function removeReview(idx) {
  if (!confirm("Remove this review?")) return;
  const data = loadData();
  const name = data.reviews[idx] ? data.reviews[idx].name : "review";
  data.reviews.splice(idx, 1);
  saveData(data);
  logActivity(`Removed review by "${name}"`);
  renderReviewsEditor();
}

function addReview() {
  const data = loadData();
  data.reviews.unshift({ id: "r" + Date.now(), name: "", role: "", message: "", stars: 5,
    date: new Date().toISOString().slice(0, 10), published: true });
  saveData(data);
  logActivity("Added a new review");
  renderReviewsEditor();
}

function saveReviewSettings() {
  const data = loadData();
  data.reviewsSettings = {
    title: document.getElementById("rv-set-title").value.trim() || "What our clients say",
    businessName: document.getElementById("rv-set-biz").value.trim() || "Bitvulex",
    ctaLabel: document.getElementById("rv-set-cta").value.trim() || "Start a project",
    ctaLink: document.getElementById("rv-set-link").value.trim() || "contact.html"
  };
  saveData(data);
  const st = document.getElementById("rv-set-status");
  st.className = "form-status ok"; st.style.display = "inline"; st.textContent = "Saved.";
  setTimeout(() => (st.style.display = "none"), 2000);
}
