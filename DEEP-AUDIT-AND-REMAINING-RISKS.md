# Bitvulex quality, security, and release audit

## Scope
Static source review of HTML, CSS, JavaScript, JSON/Vercel configuration, local asset references, and browser-side data/authentication patterns. This archive has not been deployed or tested against a live backend. A repeatable static quality gate is provided as `scripts-audit.py`.

## Changes in this pass
- Removed hard-coded default administrator and node account passwords from `js/data.js`.
- Made the admin login handler fail closed and display an explicit explanation: browser-only authentication is not a security boundary. Admin access remains intentionally disabled until a backend identity/session endpoint and server-side authorization are implemented. This prevents the current insecure login from being mistaken for production-safe authentication.
- Kept the storage failure recovery behavior in `js/data.js` so blocked/full/invalid local storage does not crash the public site.
- Added `scripts-audit.py`, a repeatable static check for JS syntax, JSON config parsing, duplicate HTML IDs, local asset/link references, responsive CSS, security headers, and hard-coded password patterns.

## Automated static checks run
- 14 HTML files parsed; duplicate IDs and local relative references checked.
- JavaScript syntax checked with Node.js.
- JSON configuration parsed.
- Vercel security-header configuration inspected.
- Static audit result: 6 passed check groups, 0 warnings, 0 failures.

## Critical work still required before production
1. **Server-side authentication and authorization:** the admin panel is disabled in this static package. Implement a trusted backend/identity provider, secure HTTP-only session cookies, CSRF protections where relevant, server-side role checks on every privileged endpoint, password hashing/rotation, rate limits, and server-generated OTPs. Never re-enable the old browser-only login.
2. **Shared data backend:** site content and contact leads currently rely on browser storage. Move authoritative content and leads to a protected database/API with access control, validation, backups, retention, and audit logging.
3. **XSS/input safety:** data-driven templates use `innerHTML` in multiple renderers. Audit every field that reaches HTML, use `textContent`/DOM construction for plain text, sanitize intentionally rich content with a maintained allowlist sanitizer, validate URL schemes, and add regression tests. Static review did not prove all render paths safe.
4. **Integrations:** EmailJS and GA4 require real configuration and delivery/consent tests. No live credentials or accounts were available, so these integrations are not verified.
5. **Content:** verify pricing, claims, team details, testimonials, social links, and canonical domain before publication.

## Browser/device QA not performed
A Chromium browser binary was not available in the execution environment. Therefore no real Playwright end-to-end tests, device emulation, Lighthouse run, accessibility-tree checks, live form submissions, pricing interactions, theme-toggle tests, or admin workflow tests were executed. Do not interpret the static audit as proof those paths work.

## Staging release checklist
- Install Playwright browsers in CI and add E2E tests for all navigation links, contact/demo forms (including invalid input, duplicate submits, and success/failure states), theme persistence, pricing CTAs, mobile navigation, and admin API authorization.
- Test viewport widths 320, 375, 768, 1024, and 1440 px; test keyboard-only use, screen-reader labels, focus visibility, reduced motion, contrast, zoom, and no horizontal overflow.
- Run Lighthouse and axe-core, dependency/SCA scans, secret scanning, CSP validation, external-link checks, and security headers against staging.
- Verify GA4 events only after consent where required, EmailJS delivery and spam protection, sitemap/canonical URLs, robots rules, Open Graph metadata, cache policy, and error monitoring.
- Configure backend auth and API before enabling admin workflows; rotate any credentials previously used in client-side code.
