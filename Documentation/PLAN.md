# Trusty CA Console Execution Plan

Status: in progress, phases 0 to 2 done. The design is in [DESIGN.md](DESIGN.md); the backend it
targets is `../trustyca` (its `Documentation/design/DESIGN.md`,
`Documentation/PLAN.md` and `ROADMAP.md`). Phases are ordered by
dependency; each one ends with a working, tested console that is a strict
superset of the previous one. Order is suggested, not a delivery
commitment. Sizes are rough: S under a day, M a few days, L a week or more.

## Where we are

Phases 0, 1 and 2 are done (2026-10-23, uncommitted on `dissoupov` on top of
`450854b`): the toolchain is clean, the framework-free layer (runtime
configuration, platform, storage, `AppUser`, the rpc services and the
gRPC-Web transport) is ported and tested, and the console signs users in
against the server in both session modes and replaces the preview flag of
the scaffold. `npm run typecheck`, `npm run lint`, `npm run format`,
`npm test` (150 tests) and `npm run build` pass; the initial bundle is
448 kB.

The stubs under `protogen` are regenerated from `trustyca` commit `f869a50`
(`make proto` leaves the tree unchanged). The backend changes since
`0c02438` that the console uses: BE-2 (`POST /v1/auth/org` re-sets the
cookies of a cookie session, `c28383e`), the sign-out of a cookie session
(`DELETE /pb.Auth/RevokeToken` revokes the token and removes both cookies),
token revocation that refuses a revoked token at once, the `provider` claim
of the login token, OAuth errors landing on the redirect URI with `error`
and `error_description`, the CORS origin `https://app.local.trustyca.io:4200`
of the cookie session, and the renumbered fields of the `pb.CA` requests
(field 1 is the reserved `OrgID`).

Phase 1 and 2 verification ran against the dev `trustycasvc`
(`v0.1.12-denis-ku128`, all-in-one) on 2026-10-23 with the framework-free
services from Node (the browser extension was not connected): `Status.Version`,
`GetProviders` (`local`, `github`), the `local` sign-in through
`/v1/auth/authorize` and the callback to `/auth/authenticated?code=…`,
`ExchangeCode` with the PKCE verifier, `GetUserToken`, `GetCallerScope`,
`GetOrg`, `GetUserOrgs`, `GetUserMemberships`, `SelectOrg`, `CA.ListIssuers`
(empty: the default org has no issuer before `trustycactl ca org bootstrap`),
`CIS.GetRoots`, `RevokeToken`, and `UNAUTHENTICATED` on the next call. A
`curl` of the CORS preflight from `http://localhost:4200` with the headers
the transport sends is admitted. Still to do by hand in a browser: the login
page, reload, remember me, and the cookie session on
`https://app.local.trustyca.io:4200` (needs the `/etc/hosts` entries of
README.md).

## Backend prerequisites

Tracked here, done in `trustyca`. The console phases name the ones they
need.

| ID   | Change                                                                                                  | Size | Blocks        |
| ---- | ------------------------------------------------------------------------------------------------------- | ---- | ------------- |
| BE-0 | Done (`0c02438`): the `wfe` CORS allows `http://localhost:4200`, the gRPC-Web and console headers, and exposes the gRPC trailers; deployed origins are added per environment | done | nothing |
| BE-1 | Done (`1cd22a8`, `0c02438`): `pb.CA` on the `wfe` for tenant tokens, every call forwarded to `privpb.Backend` with the org of the token; the backend roadmap still lists a two-app integration test through the `wfe` with a tenant token | done | nothing |
| BE-2 | Done (`c28383e`): `POST /v1/auth/org` selects the org of a cookie session and re-sets the auth and CSRF cookies; `DELETE /pb.Auth/RevokeToken` signs a cookie session out | done | nothing |
| BE-3 | `Orgs.ListEvents` over the existing `Event` and `EventsResponse` messages                               | M    | phase 9 activity |
| BE-4 | Tenant summary RPC (counts by status, expiry buckets, CRLs due) for the dashboard                       | M    | phase 9 exact tiles |
| BE-5 | `ProjectID` on `UpdateIssuerRequest`, `ActivateIssuerRequest`, `DeleteProfileRequest` (ROADMAP RM-004) | S    | project Admins in phases 4, 5 |
| BE-7 | Confirm the request timeouts of the `wfe` and `backend` listeners (`timeout.request: 3s` in dev) cover a forwarded key generation in the crypto provider, or raise them for the forwarded methods | S | phase 4 |
| BE-8 | Done (`0c02438`, ROADMAP RM-009): `OrgID` dropped from the public `pb.CA` requests; the stubs are regenerated | done | nothing |
| BE-9 | Done (`0c02438`): the `service CA` comment describes the tenant API on the `wfe` | done | nothing |

The JSON route for `pb.CA` on the `wfe` that the backend plan lists as a
follow-up "for the Web UI" is not needed by this console, which calls the
CA over gRPC-Web like every other service (DESIGN.md §2.1).

## Phase 0: toolchain and repository hygiene (S)

Goal: the copied code compiles, tests run under one runner, formatting is
one style, and the generated code is reproducible.

- [x] `tsconfig.json`: `"paths": { "src/*": ["./src/*"] }`; `noImplicitOverride`
      set to `false` with a comment pointing at the protobuf-ts output (one
      TypeScript program cannot relax it for one folder). Every other strict
      flag stays on.
- [x] `libts`: `exposure.ts` and its spec deleted; `datetime.ts` rewritten
      without `moment` (local-time formatting with English month names and
      moment's relative-time thresholds, same outputs); `json/fromJson.ts`
      without `@sentry/react` (`fromJsonSafe<T>` replaces the Sentry
      variants); `Log.spec.ts` and `fromJson.spec.ts` ported to `vi.*`; the
      copied specs made strict-mode clean; `Token` takes `Date | string` and
      keeps Dates; `Log.to` takes an `ILogTarget`. Open: the helpers of
      `libts` still accept `any` by design, so `no-explicit-any` is off for
      `src/libts/**` only, until they are typed with `unknown`.
- [x] `Makefile`: `status.proto` in the `proto` target, `auth.proto` in the
      enum generation (the `IDP` names), `npm run format:fix` after
      generation; `typecheck`, `format` and `lint` targets; npm scripts
      `format`, `format:fix`, `typecheck`, and `lint` from `angular-eslint`
      (installed with `ng add`, generated code and build output ignored).
- [x] Prettier: the scaffold's `.prettierrc` for the whole tree; the copied
      folders and `rpc/enums.ts` formatted; `.prettierignore` for `protogen`,
      build output and `Documentation`.
- [x] `npm run typecheck`, `npm test`, `npm run lint`, `npm run format` and
      `npm run build` green on Node 26 (the only version installed under nvm;
      `.nvmrc` still names 22.22.3, which `nvm use` cannot select here).
- [x] Commit the scaffold additions on `dissoupov` (`450854b`, PR #2).
- [x] CI workflow (`.github/workflows/ci.yml`): `npm ci`, lint, format check,
      typecheck, test, build. Open: the `make proto && git diff --exit-code`
      step needs a checkout of `trustyca` at a pinned commit (a deploy key or
      a token for the private repository) and docker for the enum image.
- [x] `README.md` documents the dev server (`make start-sql`, `trustycasvc`,
      `TRUSTYCA_DP_SEED`), the dev root in Chrome, both session modes and the
      pinned backend commit (`f869a50`).

Verification: clean clone, `nvm use && npm ci && make proto && make test &&
npm run build` succeed; `git status` clean after `make proto`.

## Phase 1: platform and API foundation (M)

Goal: the framework-free layer is complete and tested; Angular can inject a
working transport and services against the dev server.

- [x] `src/services/runtimeConfig.ts`: `resolveRuntimeConfig(window,
      fallback)` reads `window.__TRUSTYCA_RUNTIME_CONFIG__` (`API_URL`,
      `LOGIN_RESPONSE_TYPE`) from `public/config.js`, then the Angular
      environment passed by `provideTrustyApi()`, then
      `https://localhost:8880` in bearer mode. One resolved `RuntimeConfig`
      is injected (`RUNTIME_CONFIG`) instead of global getters.
- [x] Ported `AppPlatform/PlatformInfo.ts`, `AppPlatform/AppPlatform.ts`
      (plus `redirect` and `replaceHistoryUrl`, so the login and the landing
      are testable), `storage/StorageService.ts` (keys `trustyca_*`; PKCE
      S256 with Web Crypto, `pkceChallenge` checked against an independent
      implementation; a login in progress moves with "Remember me"),
      `AppUser/AppUser.ts` (`projectId` per org, preferences per user, org
      and project, `isAdmin` from `OrgRole`, the CSRF cookie name of a cookie
      session). `AppUser` has no RxJS: `subscribe(listener)` returns the
      unsubscribe function and `AuthStore` turns it into signals.
- [x] `src/services/trustyca/rpc`: `AuthService` (providers, the authorize
      URL, exchangeCode, getUserToken, selectOrg over gRPC in bearer mode and
      `POST /v1/auth/org` in cookie mode, getCallerScope, getAllowedMethods,
      revokeToken over gRPC in bearer mode and `DELETE /pb.Auth/RevokeToken`
      in cookie mode, which also removes the cookies, so `removecookie` is
      not needed), `OrgsService`, `CaService` (the list requests and
      `PublishCrls` take the project selection when the page names no
      `ProjectID`; 60 s deadline on the key operations; `UNAVAILABLE` becomes
      `CaUnavailableError`), `CisService`, `StatusService` (`pb.Status/Version`
      over gRPC-Web, not REST: every call to the `wfe` is gRPC-Web). The
      requests are logged with `KeyPem`, `Secret`, `Request`, `AccessToken`,
      `Code` and `Verifier` redacted. The specs run the generated clients
      against `rpc/testing/fake-transport.ts`: Angular's unit-test builder
      bundles the specs and refuses `vi.mock` of project files, and the fake
      transport doubles as the contract test of DESIGN.md §14 (a renamed
      method fails a spec).
- [x] `src/app/core/api`: `tokens.ts`, `providers.ts` (`provideTrustyApi()`:
      configuration, platform, storage with the API host as prefix, user,
      transport with the device and auth interceptors, Auth, Orgs, Status),
      `ca-providers.ts` (`provideCaApi()` for CA and CIS on the lazy CA routes
      of `features/ca/ca.routes.ts`, which keeps the CA messages out of the
      initial bundle: 548 kB with them, 448 kB without), `errors.ts`
      (`toUiError`, DESIGN.md §10.4), `paged-resource.ts` (cursor paging with
      signals; the answer of a page for older params is dropped).
- [x] `src/app/core/auth/auth.store.ts`: signals over `AppUser` (`profile`,
      `token`, `isAuthenticated`, `orgId`, `orgRole`, `projectId`,
      `sessionExpired`, `callerScope`, `org`, `can(method)`), `loadSession()`
      once per org, `completeSignIn()`, `selectOrg()`, `signOut()`, and the
      expiry timer a minute before the token expires.
- [x] `provideTrustyApi(environment)` in `app.config.ts` (the log goes to
      the console in development builds); the footer shows the server build
      from `StatusService`, the first live call.
- [x] `public/config.js` is the runtime hook with an empty object; the dev
      values are in `src/environments/environment.development.ts` (bearer,
      `https://localhost:8880`) and `environment.cookie.ts` (cookie,
      `https://api.local.trustyca.io:8880`, `npm run start:cookie` on
      `https://app.local.trustyca.io:4200`). README.md has the dev root step
      for Chrome.

Verification: done on 2026-10-23 (see "Where we are"); unit tests for every
service and store; the server build in the footer and the calls of the
browser itself still to be watched by hand.

## Phase 2: authentication and session (M)

Goal: real sign-in replaces the preview flag; the shell shows the signed-in
user and org.

- [x] `/login`: provider buttons from `GetProviders`; email field with
      `GetProviders{Email}` for the provider of the domain (`idpuser.email`
      binds the login to that address); the `local` provider signs in the
      typed address (`local+user1@trustyca.io`); remember me; error banner
      from `?error` and `?error_description`; the session-expired notice;
      the authorize URL of DESIGN.md §4.1 with PKCE, `device_id` and `nonce`
      on the API host of the console; stores the after-auth route.
      `loginGuard` sends a signed-in user to the requested page.
- [x] `/auth/authenticated`: query and fragment; `replaceState` first; the
      code deduplicated in memory storage; `code` → `ExchangeCode` →
      `GetUserToken`; `cookie_set` → the CSRF cookie name → `GetUserToken`;
      `error` or a failed call → sign the user out and back to
      `/login?error=…`. Then `completeSignIn()`: no `OrgID` → `GetUserOrgs`
      (the profile of `GetUserToken` carries no `Orgs`) → select-org or
      noorg; `GetCallerScope` with no org role and no project role → norole;
      else the after-auth route or `/dashboard`.
- [x] `/auth/select-org` (`GetUserOrgs` with roles, `SelectOrg`; also the
      "Switch organization" of the profile menu), `/auth/noorg` (check
      again, sign out), `/auth/norole`; all on a shared `app-auth-layout`.
- [x] `authGuard` and `orgGuard` replace `previewGuard`; `PreviewSession`
      is deleted; the preview badge and "Local workspace" labels are gone.
- [x] Shell: the org and role in the sidebar and toolbar, the profile menu
      with name, email and provider, Switch organization, Sign out
      (`RevokeToken`, whatever its outcome `AppUser.logout`); the
      session-expired bar; a call refused with `UNAUTHENTICATED` signs the
      user out with the expired flag (auth interceptor).
- [x] Account page: profile, provider, session kind and expiry, the role and
      grants of the org (`GetUserMemberships`), sign out. "Sign out
      everywhere" is not offered: `RevokeToken` revokes the token of the
      call, and the server has no call that revokes every token of a user.
- [x] Tests: router harness for the redirects (unauthenticated deep link,
      after-auth route, external URL rejected, reload, signed-in login, no
      org, org switch, sign out with and without a working revoke, expired
      token, session-expired bar); `AuthService` cookie and bearer branches;
      the landing state machine with a fake `IAuthService`; the login page;
      `AuthStore`.

Verification: the sign-in, the session calls and the revoke ran against the
dev server from Node (see "Where we are"). By hand in a browser: sign in with
the `local` provider, land on the dashboard, reload and stay signed in
(session and remembered variants), sign out and be bounced from `/issuers`
to `/login`; the same on `https://app.local.trustyca.io:4200` in cookie mode.

## Phase 3: console shell, tenancy and shared components (M)

Goal: the org and project context is in place and every page after this one
is built from the same parts. Needs only `pb.Orgs`.

- [ ] `TenantStore`: projects (`ListProjects`), issuer label map (filled in
      phase 4); reset on org change; invalidation helpers. The org (`GetOrg`)
      and the caller scope are in `AuthStore` since phase 2, loaded once per
      org by `loadSession()`.
- [ ] Toolbar: org switcher menu (`GetUserOrgs`, `SelectOrg`; phase 2 has
      the `/auth/select-org` page behind "Switch organization"), project selector
      ("All projects" when the caller has an org-wide role; granted projects
      only otherwise), persisted per org in `AppUser`.
- [ ] Navigation entries of DESIGN.md §7 with routes and lazy stubs;
      `can()` hides the organization entries a Viewer cannot open.
- [ ] Shared: `app-data-table` with cursor paging, `app-status-chip`,
      `app-pem-viewer` (copy, download `.pem`; DER later), `app-kv-list`,
      `app-confirm-dialog` (typed confirmation), `enumName`, `relativeTime`,
      `rfc3339Date`, `expiresIn`, `fingerprint` pipes; Go duration, OID and
      PEM validators; snackbar service for `UiError`.
- [ ] Organization page: General (view, `UpdateOrg`, `DeleteOrg` with typed
      confirmation), Projects (list, register, update, delete).
- [ ] Tests: store invalidation on org switch; table paging with a fake
      paged service; pipes and validators; organization forms with a fake
      `IOrgsService`.

Verification: switch between two orgs of the dev database and see the
project selector and the organization page follow; create and rename a
project.

## Phase 4: issuers and trust anchors (L)

Goal: the CA side of the console starts. Needs the all-in-one dev process
with the `backend` listener (every `pb.CA` call is forwarded there), BE-7
verified, and BE-5 for project Admins.

- [ ] Issuers list with filters and the issuer label cache in `TenantStore`.
- [ ] Issuer details: Overview, Chain (PEM viewer, downloads), Profiles,
      Configuration (`IssuerConfig` form, `UpdateIssuer{Config}`), actions
      Archive and Destroy with confirmations that spell the consequences.
- [ ] Register issuer stepper (`RegisterIssuer`): scope and label, type,
      subject and SAN, key spec and provider, signing (self-signed, parent in
      scope, platform parent by label with CA profile, external CSR),
      configuration defaults, review; Pending result with the CSR.
- [ ] Activate pending issuer (`ActivateIssuer`): paste or drop the signed
      certificate, intermediates and root.
- [ ] Import issuer (`ImportIssuer`) with the key URI or PEM, marked
      sensitive.
- [ ] Trust anchors page: org roots (`ListRoots`), platform roots
      (`CIS.GetRoots`), `RegisterRoot`.
- [ ] CA availability handling (DESIGN.md §2.1): the issuer pages show the
      "CA service unavailable" state on `UNAVAILABLE`; register, import,
      activate, archive and destroy carry the longer deadline with a progress
      state and render a 409 conflict inline; the shared state component is
      reused by every CA page in phases 5 to 9.
- [ ] Tests: stepper validation (subject required, parent required unless
      Root, CA profile required with a parent), request building per shape,
      status transitions offered per status, forms with a fake `ICaService`,
      the unavailable state on an `UNAVAILABLE` error.

Verification: against the dev server with an org bootstrapped by
`trustycactl ca org bootstrap`, list the issuing CA, register a subordinate
Issuing CA under it, archive it; register an externally signed issuer and
activate it with a certificate signed by `hsm-tool` or `openssl`.

## Phase 5: certificate profiles (M)

Goal: profiles are managed from the console. Profile methods are forwarded
like every `pb.CA` call, so the all-in-one dev process is needed; no key
operation is involved.

- [ ] Profiles list with issuer and scope filters.
- [ ] Profile editor: form for the common fields, JSON editor for
      extensions and policies, client-side validation, `RegisterProfile`
      create and replace, delete with confirmation; "duplicate" action that
      pre-fills from an existing profile; import from a YAML or JSON file of
      the `etc/dev/profiles` shape.
- [ ] Issuer page Profiles tab links both ways.
- [ ] The save confirmation notes that a remote signing backend applies a
      changed profile within `ca.issuer_cache_ttl` (RM-007).
- [ ] Tests: form to `CertProfile` mapping round trip; duration and OID
      validators; delete confirmation.

Verification: register the `server` template profile for the issuing CA
from the console and sign with it in phase 6.

## Phase 6: certificates (L)

Goal: the daily work of a tenant: find, issue, label, revoke. Every method
is forwarded to the backend; `SignCertificate` is the key operation, with
the longer deadline.

- [ ] Certificates list with issuer, profile, status and expiry filters,
      newest first, cursor paging, issuer labels from the cache.
- [ ] Certificate details with the parsed summary (client-side X.509 decode:
      subject, SAN, validity, key usages, extensions, AIA and CRL URLs),
      metadata editor (`UpdateCertificateLabel`), downloads (leaf, chain,
      bundle), live status (`CIS.GetCertificateStatus`).
- [ ] Issue certificate (`SignCertificate`): profile and issuer selection,
      CSR paste or file (PEM or DER), SAN, subject override, validity within
      the profile, label and metadata; result with downloads; the longer
      deadline and the conflict handling of phase 4.
- [ ] Revoke dialog with the RFC 5280 reasons (without `RemoveFromCRL`),
      note, confirmation; `RevokeCertificate`.
- [ ] Lookup page (CIS): by ID, SKID, SHA-256 or issuer and serial; issuer
      chain with AIA, CRL and OCSP URLs.
- [ ] Tests: filter to request mapping, `ExpiringBefore` computation,
      X.509 decode of fixtures (RSA, ECDSA, with SAN and policies), revoke
      dialog reasons, issue form with a fake service.

Verification: generate a CSR with `openssl`, issue a certificate with the
`server` profile, find it by serial in Lookup, revoke it, see it Revoked in
the list and in `GetCertificateStatus`.

## Phase 7: revocation and CRLs (S)

Goal: CRL state is visible and publishable. `PublishCrls` is the key
operation with the longer deadline; `GetCRL` and the revoked list are plain
reads.

- [ ] Revocation page: CRLs per issuer (`GetCRL`, due and overdue from the
      issuer's `CrlRenewal` and `NextUpdate`), download, publish one or all
      due (`PublishCrls`, `Force`); revoked certificates list
      (`ListRevokedCertificates`).
- [ ] Issuer page Revocation tab reuses the same components.
- [ ] Tests: due and overdue computation; publish request per scope (org,
      project, one issuer).

Verification: revoke a certificate, publish the CRL, download it, and
verify with `openssl crl -text` that the serial is listed.

## Phase 8: organization administration (M)

Goal: members, invites and API keys are managed from the console. Needs
only `pb.Orgs`, so it can run in parallel with phases 4 to 7.

- [ ] Members tab: memberships and invites with scope and role; add member
      (email, role, org-wide or project), change role, remove, delete invite;
      the server's grantability errors surfaced inline.
- [ ] API keys tab: list with status, scopes, expiry and usage; create with
      the known scopes and wildcards, project and expiry; the secret in a
      copy-once dialog; delete.
- [ ] Settings page: preferences in `AppUser` (page size, default project,
      date format) per user and per org.
- [ ] Tests: member actions with a fake service; the secret dialog never
      renders twice; scope chips.

Verification: invite a new email, sign in with it through the `local`
provider, see the invite accepted and the role in the members list; create
an API key and call `Auth.AuthenticateAPIKey` with it from the CLI.

## Phase 9: dashboard (M)

Goal: the landing page reports the health of the tenant's PKI.

- [ ] Tiles from the lists (DESIGN.md §9) with "100+" when `NextPage` is
      set; expiring certificates panel; pending issuers panel; CRLs due
      panel; the trust map built from `ParentID`.
- [ ] Charts behind a `ChartComponent` interface (SVG first; Chart.js only
      if a chart needs it).
- [ ] When BE-4 lands: replace the derived tiles with the summary RPC. When
      BE-3 lands: the recent activity panel from `ListEvents` and an Audit
      tab under Organization.
- [ ] Tests: tile derivation from fixture pages; due computations shared
      with phase 7.

Verification: a bootstrapped org with a few issued, one revoked and one
expiring certificate shows the right numbers and the right "needs
attention" rows.

## Phase 10: hardening and deployment (M)

- [ ] Dockerfile (node build, nginx serve), `docker-entrypoint.d` writing
      `config.js` from `TRUSTYCA_APP_*`, SPA fallback, cache headers, CSP;
      `make docker`.
- [ ] Accessibility pass: focus order in the stepper and dialogs, table
      headers, chip contrast, keyboard paging.
- [ ] Performance: lazy chunks per feature, bundle budgets kept, cursor
      paging only, no full-list loads except the issuer label cache (and
      BE-6 when it exists).
- [ ] Playwright smoke suite against a dev server with the `local` provider:
      sign in, select org, register issuer, register profile, issue, revoke,
      publish CRL, sign out.
- [ ] Docs: README for developers and operators, `Documentation/` updated,
      `CHANGELOG`.

Verification: the image runs with only `TRUSTYCA_APP_API_URL` set and the
smoke suite passes against it.

## Verification checklist per phase

- `npm run typecheck`, `npm run lint`, `npm run format`, `npm test` and
  `npm run build` pass; `make proto` leaves the tree unchanged.
- New services have specs that run the generated client against
  `FakeTransport`; new pages have a spec with the fake services of
  `src/app/testing/test-api.ts`; router changes have a harness test.
- Every request field the page fills is named in the page's design section;
  every action is gated by `can()` and the server's error is shown when the
  gate is bypassed.
- No token, key or secret is logged, placed in a URL, or kept beyond the
  dialog that shows it.
- The phase is exercised once against the dev `trustycasvc` as described in
  its Verification paragraph, and the backend prerequisites it used are
  recorded as done above.

## Decisions and notes

- Every call to the `wfe` is gRPC-Web, straight to the listener: porto
  handles the content type and CORS in process, so no proxy is deployed with
  the console. That includes `pb.Status` (the footer) and `pb.CA`, which
  needs no JSON route. The exceptions are not calls but the browser cookie
  model: the sign-in is a navigation to `/v1/auth/authorize`, and a cookie
  session switches org with `POST /v1/auth/org` and signs out with
  `DELETE /pb.Auth/RevokeToken`, because a gRPC response cannot replace or
  remove the HttpOnly cookie.
- Bearer `code` mode is the default session mode: no cookie is used, and
  `npm start` serves the console on `http://localhost:4200`. The cookie mode
  is a configuration of its own, `npm run start:cookie`: the console on
  `https://app.local.trustyca.io:4200` and the API on
  `https://api.local.trustyca.io:8880`, so the page and the server share the
  cookie domain `.local.trustyca.io` (README.md, "Cookie session").
- `noImplicitOverride` is disabled because of the generated code; the rest
  of the strict flags, `strictTemplates` and the Angular strict injection
  flags stay on.
- No React dependency, and none of `moment`, `crypto-es` and `@sentry/react`:
  `Intl`, Web Crypto and the console's own error reporting cover the needs.
  Error reporting with Sentry's Angular SDK (`@sentry/angular`) is an open
  item for phase 10.
- Modern Angular throughout: signals, `resource()`, standalone components
  and the new control flow. `Resource` and `StoreV2` of `secdi` become
  `resource()` and the signal stores (`AuthStore`, `TenantStore`); `AppUser`
  drops the `BehaviorSubject` and RxJS for a plain `subscribe(listener)`,
  which keeps the framework-free layer without Angular and without RxJS,
  and `AuthStore` exposes it as signals. RxJS stays where Angular's own APIs
  hand out observables (router events, the breakpoint observer), converted
  with `toSignal`.
- The console does not generate private keys in v1. Issuance takes a CSR;
  client-side key generation with Web Crypto is an open item once the
  operators ask for it.
- Awareness of the signing plane is confined to `CaService` (the deadline of
  the key operations, the `UNAVAILABLE` mapping, `ProjectID` defaults) and
  one shared unavailable-state component; pages do not know that the `wfe`
  forwards their calls.
- The CA pages are lazy routes under `features/ca/ca.routes.ts`, which
  provide `CA_SERVICE` and `CIS_SERVICE` (`provideCaApi()`); phases 4 to 7
  add their pages there, and phase 9 moves the dashboard there when its
  tiles call the CA. Code the login loads never imports a CA module.
- Services are tested against `FakeTransport`, pages and stores against the
  fakes of `src/app/testing/test-api.ts`; `vi.mock` of project files is not
  available under Angular's unit-test builder.
