# UI/UX redesign verification

Date: 2026-09-22 (America/La_Paz). This is a local build, not a VPS deployment.

## Follow-up: publication access and support

- Swapped stickmen for a CSS-composed Kenney Tiny Town PNG scene (CC0, 5KB atlas).
- /publicar now redirects guests to account creation or login, retaining the return URL.
- The publication API checks the session before reading uploads; requests store the actual
  account id/email, ignoring any account id provided in the payload.
- Draft keys are scoped per account. Existing unscoped drafts are not shared between accounts.
- Added FAQ, help and safety pages, expanded footer navigation, updated terms/privacy copy,
  and branded WhatsApp support at +591 78504969. Added Google Maps directions links.
- Auth integration tests now validate real register/login/logout, rejection of forged sessions,
  owner rental restrictions, photo persistence and request-account association.
  These tests start a separate server with MySQL disabled and a unique storage directory.
  No existing user accounts or production publication records are modified.
- Browser registration from /publicar successfully returned to the unlocked wizard.
- FAQ, help, safety, contact and legal pages passed width checks at 320, 768 and 1440px.
- The review queue is still manual. These tests do not verify Google OAuth or the historical
  MySQL accounts mentioned below. The earlier persistence test limitation is superseded only
  for the isolated integration environment, not production.

```powershell
$env:RUN_AUTH_QA='1'
$env:RENTALS_TEST_URL='http://localhost:3000'
node --import tsx --test scripts/direct-rentals.test.ts scripts/redesign.test.ts scripts/rental-routes.test.ts scripts/publication-auth.test.ts
```

Optional browser QA: `node scripts/start-isolated-auth-qa.mjs 3003`.
Runtime auth/upload storage can be relocated with ZENTRO_STORAGE_DIR; the default is unchanged.

## Implemented

- New shared header, mobile navigation, footer, search-first home and photo-first cards.
- Persistent light/dark theme, Lucide controls, CSS stickman key handoff on desktop.
- Static mobile layout, reduced-motion support, lightweight loading states and error recovery.
- Full-photo gallery, keyboard navigation, focus restoration and optimized image sizes.
- Four-step publication wizard: local text draft, cover selection, sequential photo analysis,
  720px previews, optional unknown bathrooms, deposit and monthly/entry cost breakdown.
- Leaflet map provider repair, attribution, zoom limit 18, explicit error/retry handling.
- Updated robots.txt, custom not-found page and real HTTP 404 responses for hidden listings.
- Refreshed login, contact, advertising and legal page presentation. No visible T/C label.
- Advertising is inline on the home page, not a timed overlay.

## Automated checks

Passed:

```powershell
npx --yes pnpm lint
npx --yes pnpm build
$env:RENTALS_TEST_URL='http://localhost:3000'
node --import tsx --test scripts/direct-rentals.test.ts scripts/redesign.test.ts scripts/rental-routes.test.ts
```

13 tests pass. Checks cover direct-rental scope, old-route redirects, hidden listing/OG 404s,
sitemap, publication API rejection, deposit arithmetic, one-off price formatting and robots.

## Browser verification

Chrome via Playwright, with screenshots under `output/playwright/`:

- Home, results, publication, login, contact, advertising, privacy, terms and 404 at
  320, 768 and 1440px: no document-level horizontal overflow, one H1, working skip target.
- Additional mobile interaction checks at 360x800 and desktop at 1440x1000.
- Light/dark switching persists after reload. Reduced motion disables the stickman animation.
- Results filter from 10 rentals to 3 houses; no-results state and clear-filters restore all 10.
- Gallery opens, changes image, contains rather than crops the full photo, closes with Escape
  and restores focus. Optimized mobile full image requested at 360px in the 1x test viewport.
- Native upload tested with two local images. Preview dimensions reduced to 720px;
  originals retained in the multipart request. Room categories and cover reordering work.
- Publication steps accept unknown bathrooms/area; Bs 2,500 rent + Bs 250 expenses +
  one-month deposit yields Bs 2,750 monthly and Bs 5,250 entry.
- Successful publication UI tested using an intercepted API response, avoiding test-data writes.
  Server-side rejection tests use the actual API. End-to-end persistence was not asserted.
- Real OSM streets and attribution displayed on overview and property-detail maps.
  Aborting tile requests showed retry; restoring requests recovered the overview map.
- Max-zoom control reaches 18 and disables further zoom. This boundary test reused an
  intercepted tile to avoid repeatedly requesting upstream tiles; it is not a geographic
  accuracy test at every zoom level.
- Optimized build served at localhost:3000: home 200, missing page 404, no JS page errors in
  that smoke test. One local sample measured TTFB 17ms / DOM ready 126ms, not a field benchmark.

## Important limits

- No physical Galaxy A21s, old Samsung Internet, iOS device or low-end GPU was available.
  Viewport emulation does not validate GPU drivers or guarantee every device/browser.
- The local configured MySQL backend is unavailable for historical password accounts;
  an unknown-account login returned the existing 503 response. Local-account fallback remains
  unchanged. Google sign-in and historical account access have not been validated end to end.
- Publication still enters the existing manual review queue, not automatic approval.
  Photo checks are technical heuristics; room classification remains owner-supplied.
- Existing demo rentals remain labeled as test listings. No fake availability counters or
  testimonials were added. No database purge, migration or account changes were performed.
- OSM is a best-effort provider, not an SLA. A configured tile provider can be supplied with
  NEXT_PUBLIC_MAP_TILE_URL and NEXT_PUBLIC_MAP_ATTRIBUTION before a larger launch.
  Provider requirements: https://operations.osmfoundation.org/policies/tiles/

## Routing note

The /propiedades page and its loading boundary live in the `(catalog)` route group.
Do not move that loading boundary above `[slug]`: early streaming changes missing detail
responses from HTTP 404 to HTTP 200. The regression tests check both detail and OG URLs.

## Welcome and directions follow-up

- Added optional `/bienvenida`, linked from the account menu and footer, with canonical/OG
  metadata and sitemap entry. Home and search remain direct entry points (no forced redirect).
- Replaced all pixel-art references in application code with an original family/home bitmap
  atlas. Lossless WebP delivery preserves alpha at 644 KB rather than the 1.7 MB source PNG.
  CSS animation runs once for four seconds on eligible desktops; replay is explicit.
  Mobile, coarse pointers and reduced-motion preferences have static rendering.
- Directions now occupy a permanent toolbar inside the map frame, outside lazy Leaflet.
  The anchor is visible in initial server HTML and in a JavaScript-disabled browser.
- Real street tiles and clickable directions checked at widths 320, 360, 768 and 1440;
  hit testing confirms the link is not covered by Leaflet or fixed navigation.
  Destination matches the listing coordinates and uses Google's universal directions URL.
- Welcome checked at 320x568, 360x800, 390x800, 768x1024, 1024x800 and 1440x900/1000.
  No document-level horizontal overflow. Light/dark, FAQ expansion, search navigation,
  publication signup gate, reduced motion and replay verified in Chrome.
- `pnpm lint`, `pnpm build`, 20 Node tests (including isolated auth/publishing persistence),
  and 21st review passed. Auth QA uses separate generated storage, not existing accounts.
- Optimized local server restarted on port 3000. No VPS deployment performed.
  Public-domain browser verification was blocked by ERR_CERT_AUTHORITY_INVALID.
- Captures: `output/playwright/welcome-production-desktop.png`,
  `welcome-final-light.png`, `welcome-final-dark.png`, `directions-production-dark.png`,
  `directions-fixed-mobile.png` and `directions-without-javascript.png`.
- Physical Samsung A21s/GPU compatibility remains unverified; viewport tests are not a
  claim that every physical device has been tested.

## Static family, owner flow and exchange-rate follow-up (2026-09-22)

- Supersedes the family-motion notes above: all family/home images are now static on every
  viewport. Removed the decorative key and replay control. Welcome scene stays centered.
- Removed advertising from home and the footer. The old advertising URL remains accessible;
  no Services header route was added while the user's navigation wording awaits clarification.
- Support WhatsApp floats on home/welcome with the help label, above mobile bottom navigation.
- Feature tiles now keep all four borders and theme-aware surfaces. Chrome checked at 360 and
  1440px in dark mode: bottom border 1px, dark surface, readable foreground, no overflow.
- Native FAQ answers and keyboard-accessible owner-process tabs animate briefly on interaction.
  Reduced-motion disables those animations. Family descendants have no active animation.
- Welcome checked at widths 320, 360, 768 and 1440px with no horizontal overflow. A 320px tab
  height shift was found and corrected with a narrow-viewport minimum height.
- USD creation/editing now has a validated per-property rate. Currency conversion and price
  filters use that rate; null legacy USD rates retain 7. BOB ignores the optional USD rate.
- Publication requests persist price/currency/rate with the authenticated account and photos.
  The real isolated API test verified USD rate 8.25 persistence and rejected invalid rates.
  Browser wizard checks covered a real upload, zero-rate validation, USD/BOB switching without
  losing 9.15, and the final rate summary. That UI request was not submitted.
- Editing now awaits confirmed API storage and keeps the form open on failure instead of
  falsely reporting success. Real MySQL edit persistence remains unverified.
- Migration `database/mysql/002_property_exchange_rate.sql` is idempotent and only adds a
  nullable column. Attempting `node --import tsx scripts/migrate-property-exchange-rate.ts`
  failed with ECONNREFUSED. Apply it when MySQL is reachable, before deploying this change.
- `pnpm lint`, `pnpm build`, and all 23 tests in direct-rentals, redesign, rental-routes and
  publication-auth passed (RUN_AUTH_QA=1). The auth tests used isolated generated storage.
  21st review of the four new/updated presentation components reported no findings.
- Captures include `features-fixed-dark.png`, `owners-refresh.png`,
  `owners-panel-mobile-final.png` and `exchange-rate-publish-mobile.png` under output/playwright.
- Local optimized server on port 3000 only; no VPS/Cloudflare deployment was performed.

## Pre-release icons, welcome, OAuth and upload follow-up (2026-09-23)

- No deployment. The earlier Hostinger ZIP is obsolete; PRE_RELEASE_QA.md is the current
  launch gate and HOSTINGER_DEPLOY.md records the external configuration still required.
- Branded favicon (16/32/48), SVG icon and Apple icon reuse the header Lucide House.
- Added static red brush strike-through commission examples, explicitly illustrative,
  and a direct home link to /bienvenida#sin-comisiones. The family remains static.
- Google callback now preserves local hostname/port, uses the configured public HTTPS
  origin behind a proxy, PKCE, expiring state and verified email. Existing local owner
  account/avatar reuse passed isolated integration tests without a MySQL connection.
- Real Google consent remains UNTESTED: GOOGLE_CLIENT_SECRET is absent locally.
  Provider success/cancellation/errors were tested using an isolated fetch mock, not
  real Google credentials. The real local button shows a useful configuration error.
- Server decodes actual photo pixels and rejects MIME spoofing, corrupt/animated files,
  duplicates and overflow. Staged private writes complete before success is acknowledged.
- Real browser end-to-end submission (not a mocked success): register, two JPG uploads,
  categories, cover reorder, optional unknown fields, USD price and custom rate, injected
  transient failure, then a real successful retry. Stored original bytes and order match.
- A second real submission checked duplicate selection, text draft recovery after reload,
  explicit photo re-selection, BOB pricing and receipt focus. Step transitions and final
  receipt now scroll below the sticky header rather than leaving the user at the footer.
- Receipt lists the actual photo count/reference and links to account-scoped tracking.
  Other accounts cannot read the request; anonymous users cannot read original photos.
  Admin basic-auth access to original photo bytes is covered by the integration suite.
- Removed the old in-memory-only AdminConsole from the active admin page. Receiving and
  inspecting submissions works; approval into persistent public catalog listings is NOT
  implemented and remains a launch blocker. No new requests were published automatically.
- Final lint and optimized production build passed. All 37 Node tests passed with
  RUN_AUTH_QA=1 and no skips (direct-rentals, redesign, rental-routes, publication-auth,
  google-oauth and upload-photos). Existing accounts and property data were not altered.
- 21st review of four changed components: zero errors, 17 informational hardcoded-color
  findings (including Google's brand colors). Keyboard focus regressions were fixed.
- Local production server is http://localhost:3000. Test data is isolated under output/auth-qa.
  No claims of physical-device, cloud persistence or historical MySQL account verification.
- Final welcome browser matrix: 320/360/768/1440px, light and dark, no horizontal overflow
  and zero-intermediation amounts on a single line. Home entry navigates to the right section.
- Final 360px property smoke test: full photo decodes, next image changes, object-fit contains
  the image, Escape closes the gallery, four real map tiles load, and directions preserve
  the property coordinates. No JS page errors in this smoke test.
- Final captures: commission-mobile-light-final.png, commission-mobile-dark-final.png,
  commission-desktop-final.png, release-publish-receipt-final.png and
  release-gallery-map-smoke.png in output/playwright (the older receipt capture is superseded).

## MySQL release and manual moderation (2026-09-23)

- Supersedes the earlier approval/SQL blockers: MySQL-backed accounts, sessions, requests,
  photos, public properties and owner assignment are implemented. The configured database
  is authoritative; outages return errors rather than creating local shadow accounts.
- Private admin controls approve or reject, with a required rejection reason, origin checks,
  explicit server authorization, row lock and audit. No public signup can become admin.
- A successful approval atomically creates a direct-owner listing and assignment. Originals
  remain private; public WebP derivatives strip metadata. Rejected requests have no public media.
- Requests use per-owner idempotency keys. Database/driver timezones agree on UTC.
- MariaDB 10.4.32 was started in a new isolated data directory, not the existing XAMPP data.
  Migrations 001-003 ran and reran; checked InnoDB and packet size. No production migration.
- Final 50 tests pass, no skips: previous 37, two structured-input tests and eleven real SQL
  integration tests. They cover concurrent signup/submission/approval, duplicate identity,
  simulated Google, forced second-photo rollback, access controls, UTC, edits, restart,
  session revocation and database outage without filesystem fallback.
- Chrome: real wizard submission with photo and costs to SQL, then manual admin approval,
  opening the new public listing and decoding its image. No mobile document overflow.
  A fresh browser context with HTTP credentials resolved a test-browser native auth prompt;
  the control itself required no workarounds or application event changes.
- Database backup with BLOBs was restored into a separate QA database. Real Hostinger backups,
  quotas, HTTPS and Google credentials must still be configured and checked on that hosting.
- Lint/build passed; 21st review of the two moderation components found no issues.
- Captures: sql-admin-mobile.png, sql-approved-mobile.png. QA accounts/data are excluded from ZIP.
