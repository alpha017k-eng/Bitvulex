# Analytics and production launch checklist

The built-in `js/analytics.js` currently tracks visits, referrer/source, viewport class, scroll depth, and service interactions in the visitor's own browser storage. This is useful for demos but **is not cross-visitor reporting** and should not be treated as production analytics.

## Google Analytics 4 (optional)
1. Create a GA4 property and web data stream in Google Analytics.
2. Copy its Measurement ID (`G-XXXXXXXXXX`).
3. Add the following before `js/analytics.js` on each public page, replacing the placeholder with your real ID. Do not publish a made-up ID.

```html
<script>
  window.BITVULEX_ANALYTICS = {
    ga4MeasurementId: "G-XXXXXXXXXX",
    // Set true only after implementing your region-appropriate consent banner.
    consentGranted: false
  };
</script>
```

4. Before launch, implement a consent banner and update `consentGranted` only after the visitor's affirmative choice. Follow applicable privacy and cookie laws for your audience. Do not send personal or sensitive data to analytics.
5. Verify page views and events in GA4 Realtime / DebugView, test both consent choices, and update the site's privacy policy with the services and retention details you actually use.

## Other optional services
- **Google Search Console:** verify the domain and submit `sitemap.xml`.
- **Bing Webmaster Tools:** verify the site and submit the sitemap.
- **Performance:** run Lighthouse on a mobile device profile; compress oversized images and configure long-lived caching for static assets.
- **Security:** use HTTPS, keep admin credentials private, and move any real customer data or secrets to a secured backend. Static HTML/JS cannot securely store secrets.
- **Operational checks:** test every form, navigation link, theme toggle, and admin workflow on iOS Safari, Android Chrome, tablet, laptop, and wide desktop before deployment.

Deploy the contents of this `site/` directory as the website root. No tracking ID or external analytics account is included by default.
