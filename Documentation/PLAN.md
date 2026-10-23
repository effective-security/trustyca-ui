# Trusty CA Console Execution Plan

Status: proposed. The design is in [DESIGN.md](DESIGN.md); the backend it
targets is `../trustyca` (its `Documentation/design/DESIGN.md`,
`Documentation/PLAN.md` and `ROADMAP.md`). Phases are ordered by
dependency; each one ends with a working, tested console that is a strict
superset of the previous one. Order is suggested, not a delivery
commitment. Sizes are rough: S under a day, M a few days, L a week or more.

## Where we are

The repository holds the phase 0 scaffold of `INTENT.md` (Angular 22,
Material 3, standalone lazy pages, a preview login flag, Dashboard,
Issuers, Certificates, Account and Settings placeholders, brand assets,
router tests under Vitest) plus, uncommitted on `dissoupov`: the `Makefile`
with the `proto` target, the generated clients for `auth`, `ca`, `cis`,
`orgs`, `pkix`, `types` under `src/services/trustyca/protogen`, the generated
`rpc/enums.ts`, and the `libts`, `models`, `types` folders copied from
`secdi-ui`, with the Documentation and the copied folders staged.

`npx tsc -p tsconfig.app.json --noEmit` failed when the folders were copied;
phase 0 fixed every row of this table on 2026-10-23:

| Error                                                                 | Cause                                                      |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Cannot find module 'src/libts/logging'` and every other `src/...` import | no `paths` mapping in `tsconfig.json`                   |
| `This member must have an 'override' modifier` in every `protogen/*.ts` | `noImplicitOverride: true` versus protobuf-ts output     |
| `Cannot find module 'moment'` (`libts/datetime`)                      | dependency of the `secdi` copy, not installed              |
| `Cannot find module '@sentry/react'` (`libts/json/fromJson`)          | same                                                       |
| `Cannot find module 'src/services/secdi_v2/protogen/types'` (`libts/exposure`) | `secdi` specific file that does not belong here    |
| `jest.fn` in `Log.spec.ts`, `fromJson.spec.ts`                        | Jest specs under a Vitest runner                           |

The server side is ready for the console since the signing plane split
(`trustyca` commits `1cd22a8` and `0c02438`, "Refactor Backend service"):
the `wfe` listener serves `pb.Auth`, `pb.Orgs`, `pb.CA`, `pb.CIS` and
`pb.Status` to tenant tokens over gRPC-Web, its `ca` service forwards every
CA call to `privpb.Backend` on the backend listener with the org of the
token, the public `pb.CA` requests carry no `OrgID`, and the dev CORS
configuration admits the Angular dev server and the gRPC-Web headers
(DESIGN.md §2 and §2.1). The stubs under `protogen` were regenerated from
`0c02438` on 2026-10-23 and every check passes against them. Nothing on
the server gates the first live call. Development runs against the
all-in-one process (`wfe`, `backend` and `aia` listeners in one
`trustycasvc`), since a web-only process answers every `pb.CA` call with
`UNAVAILABLE`.

## Backend prerequisites

Tracked here, done in `trustyca`. The console phases name the ones they
need.

| ID   | Change                                                                                                  | Size | Blocks        |
| ---- | ------------------------------------------------------------------------------------------------------- | ---- | ------------- |
| BE-0 | Done (`0c02438`): the `wfe` CORS allows `http://localhost:4200`, the gRPC-Web and console headers, and exposes the gRPC trailers; deployed origins are added per environment | done | nothing |
| BE-1 | Done (`1cd22a8`, `0c02438`): `pb.CA` on the `wfe` for tenant tokens, every call forwarded to `privpb.Backend` with the org of the token; the backend roadmap still lists a two-app integration test through the `wfe` with a tenant token | done | nothing |
| BE-2 | REST `SelectOrg` that re-sets the auth and CSRF cookies (cookie mode)                                   | S    | cookie mode only |
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
- [ ] Commit the scaffold additions on `dissoupov`.
- [x] CI workflow (`.github/workflows/ci.yml`): `npm ci`, lint, format check,
      typecheck, test, build. Open: the `make proto && git diff --exit-code`
      step needs a checkout of `trustyca` at a pinned commit (a deploy key or
      a token for the private repository) and docker for the enum image.
- [ ] Document how to run the dev server (`make start-sql`, `trustycasvc`,
      `TRUSTYCA_DP_SEED`) in `README.md`; the pinned backend commit is there
      (`0c02438`).

Verification: clean clone, `nvm use && npm ci && make proto && make test &&
npm run build` succeed; `git status` clean after `make proto`.

## Phase 1: platform and API foundation (M)

Goal: the framework-free layer is complete and tested; Angular can inject a
working transport and services against the dev server.

- [ ] `src/services/runtimeConfig.ts`: `window.__TRUSTYCA_RUNTIME_CONFIG__`
      from `public/config.js`, fallback to `environment.ts`, then
      `https://localhost:8880`; `getApiUrl()`, `getLoginResponseType()`.
- [ ] Port `AppPlatform/PlatformInfo.ts`, `AppPlatform/AppPlatform.ts`,
      `storage/StorageService.ts` (keys renamed `trustyca_*`; PKCE helpers
      with Web Crypto `SubtleCrypto.digest` instead of `crypto-es`, so no new
      dependency), `AppUser/AppUser.ts` (`projectId` per org instead of
      `cloudId` and `batchId`; `isAdmin` from `OrgRole` with the role names of
      `enums.ts`). Port their specs to Vitest.
- [ ] `src/services/trustyca/rpc`: `AuthService` (providers, exchangeCode,
      getUserToken, selectOrg over gRPC in bearer mode and over REST in
      cookie mode once BE-2 exists, getCallerScope, getAllowedMethods,
      revokeToken and removeCookie over REST), `OrgsService`, `CaService`
      (fills `ProjectID` from the project selection when a page passes
      none; a longer deadline on the key operations and the `UNAVAILABLE`
      mapping, DESIGN.md §2.1), `CisService`, `StatusService`
      (`GET /v1/status/version`). Each with an `I*Service` interface, the
      `$rpc` client, logging, and a spec that mocks the generated client
      (`vi.mock`). Redact `KeyPem`, `Secret`, `Request` in debug logs.
- [ ] `src/app/core/api`: `tokens.ts` (injection tokens), `providers.ts`
      (`provideTrustyApi()`: platform, storage, user, transport with the auth
      and device interceptors, services), `errors.ts` (`RpcError` to
      `UiError`, DESIGN.md §10.4), `paged-resource.ts` (cursor paging over
      `resource()`).
- [ ] `src/app/core/auth/auth.store.ts`: signals over `AppUser.observable`
      (`user`, `isAuthenticated`, `orgId`, `orgRole`, `sessionExpired`,
      `callerScope`, `can(method)`); expiry timer.
- [ ] Wire `provideTrustyApi()` into `app.config.ts`; show the server
      version from `StatusService` in the footer as the first live call.
- [ ] A `public/config.js` for development pointing at
      `https://localhost:8880`; note the self-signed certificate step for
      Chrome in the README (`trustyca_root.pem`).

Verification: unit tests for every service and store; `npm start` shows the
server build in the footer; a `GetProviders` call from the browser console
returns the dev providers over gRPC-Web with no CORS error, and
`CA.ListIssuers` with a token from the CLI login returns the issuers of the
org.

## Phase 2: authentication and session (M)

Goal: real sign-in replaces the preview flag; the shell shows the signed-in
user and org.

- [ ] `/login`: provider buttons from `GetProviders` (GitHub, Google, Local
      in dev); email field for enterprise domains (`GetProviders{Email}`);
      remember me (`StorageService.setRememberUser`); error banner from
      `?error`; builds the authorize URL per DESIGN.md §4.1 with PKCE and
      `device_id`; stores the after-auth route.
- [ ] `/auth/authenticated`: parse query and fragment; dedupe the code in
      memory storage; `replaceState` first; `code` → `ExchangeCode` →
      `GetUserToken`; `cookie_set` → store the CSRF cookie name →
      `GetUserToken`; `error` → notice and back to `/login`. Then
      `GetCallerScope` and route by `OrgID` and `Orgs`.
- [ ] `/auth/select-org` (list from `UserInfo.Orgs` and `GetUserOrgs`,
      `SelectOrg`), `/auth/noorg`, `/auth/norole`.
- [ ] `authGuard` and `orgGuard` replace `previewGuard`; delete
      `PreviewSession`; the preview badge and "Local workspace" labels go.
- [ ] Shell: profile menu with name, email, provider; Sign out
      (`RevokeToken`, cookie removal in cookie mode, `AppUser.logout`); the
      session-expired bar; `UNAUTHENTICATED` handling in the error mapper.
- [ ] Account page: profile, memberships (`GetUserMemberships`), token
      expiry, sign out everywhere.
- [ ] Tests: router harness for the redirects (unauthenticated deep link,
      after-auth route, external URL rejected, no org, expired session);
      `AuthService` cookie and bearer branches; the landing page state
      machine with a fake `IAuthService`.

Verification: sign in with the `local` provider against the dev server,
land on the dashboard, reload and stay signed in (session and remembered
variants), sign out and be bounced from `/issuers` to `/login`.

## Phase 3: console shell, tenancy and shared components (M)

Goal: the org and project context is in place and every page after this one
is built from the same parts. Needs only `pb.Orgs`.

- [ ] `TenantStore`: org (`GetOrg`), projects (`ListProjects`), caller scope,
      issuer label map (filled in phase 4); reset on org change; invalidation
      helpers.
- [ ] Toolbar: org switcher (`GetUserOrgs`, `SelectOrg`), project selector
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
- New services have specs with the generated client mocked; new pages have
  a spec with fake services; router changes have a harness test.
- Every request field the page fills is named in the page's design section;
  every action is gated by `can()` and the server's error is shown when the
  gate is bypassed.
- No token, key or secret is logged, placed in a URL, or kept beyond the
  dialog that shows it.
- The phase is exercised once against the dev `trustycasvc` as described in
  its Verification paragraph, and the backend prerequisites it used are
  recorded as done above.

## Decisions and notes

- gRPC-Web goes straight to the `wfe` listener: porto handles the content
  type and CORS in process, so no proxy is deployed with the console.
- Bearer `code` mode is the default session mode; cookie mode stays
  supported and is selected by configuration when the console is served
  under the cookie domain, and needs BE-2 for org switching.
- `noImplicitOverride` is disabled because of the generated code; the rest
  of the strict flags, `strictTemplates` and the Angular strict injection
  flags stay on.
- `moment`, `crypto-es` and `@sentry/react` are not adopted: `Intl`, Web
  Crypto and the console's own error reporting cover the needs, which keeps
  the bundle small and the framework-free layer dependency-free.
- `Resource` and `StoreV2` of `secdi` are replaced by Angular `resource()`
  signals and `TenantStore`; `AppUser.observable` remains a `BehaviorSubject`
  so the framework-free layer stays RxJS-only.
- The console does not generate private keys in v1. Issuance takes a CSR;
  client-side key generation with Web Crypto is an open item once the
  operators ask for it.
- The console calls `pb.CA` over gRPC-Web on the `wfe` and does not need the
  JSON route the backend plan lists as a follow-up for the Web UI.
- Awareness of the signing plane is confined to `CaService` (the deadline of
  the key operations, the `UNAVAILABLE` mapping, `ProjectID` defaults) and
  one shared unavailable-state component; pages do not know that the `wfe`
  forwards their calls.
