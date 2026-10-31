# Trusty CA Console Design

Status: design for v1 of the Trusty CA management console and dashboard;
sections 3, 4, 10 and 12 are implemented (phases 0 to 2 of PLAN.md). Companion documents: [PLAN.md](PLAN.md) (execution plan), the
backend design in `../trustyca/Documentation/design/DESIGN.md` and the API
in `../trustyca/api/pb/protos`. The repository `trustyca` is expected next to
this one, as the `Makefile` assumes (`TRUSTYCA_PROJ`).

## 1. Scope

The console is the browser front end of Trusty CA for the people of a
tenant organization: it signs them in through the identity providers of the
server, lets them pick an organization and a project, and gives them the
management views of the CA: issuers and their chains, trust anchors,
certificate profiles, issued and revoked certificates, CRLs, and the
organization itself (projects, members, API keys). A dashboard summarizes
the state of the tenant's PKI.

Non-goals for v1: the platform operator views (`privpb.Admin`, served to
`trustyca-admin` only), the signing plane API (`privpb.Backend`, service
identities over mTLS only), the Registration Authority product policy, OCSP
and AIA (binary routes for verifiers), key ceremonies, and mobile packaging. The
code is structured so a mobile wrapper (Capacitor or Cordova) can be added
later without touching the pages, which is what `IAppPlatform` is for.

## 2. The backend surface

The console talks to one host, the `wfe` listener of `trustycasvc`
(`https://localhost:8880` in the dev configuration). Every call is gRPC-Web.
The sign-in is a browser navigation to `/v1/auth/authorize`, and a cookie
session makes two REST calls because a gRPC response cannot replace or
remove its HttpOnly cookie: `POST /v1/auth/org` (switch org) and
`DELETE /pb.Auth/RevokeToken` (sign out).
Since the signing plane split of `trustyca` (commits `1cd22a8` and
`0c02438`, "Refactor Backend service"), the `wfe` serves the whole public CA
API to tenant tokens as a proxy of `privpb.Backend`; the issuer keys and the
CA tables stay behind the `backend` listener, which the browser never
reaches. Public `pb.CA` requests carry no `OrgID`: the org is the org of the
token.

| Service     | Transport from the browser                  | Used for                                                          |
| ----------- | ------------------------------------------- | ----------------------------------------------------------------- |
| `pb.Auth`   | gRPC-Web; the two calls of a cookie session above over REST | providers, code exchange, user token, org selection, caller scope, revoke |
| `pb.Orgs`   | gRPC-Web                                    | org, projects, members and invites, API keys                      |
| `pb.CA`     | gRPC-Web                                    | issuers, roots, profiles, certificates, revocation, CRLs; every call is forwarded by the `wfe` to the signing plane with the org of the token |
| `pb.CIS`    | gRPC-Web                                    | public lookups by IKID, serial, SKID or SHA-256; platform roots   |
| `pb.Status` | gRPC-Web (`Status.Version`, open to guests) | server version in the footer and the About dialog                 |

Not for the console: `privpb.Backend` (the same CA methods with an explicit
`OrgID`, for the RA, the operator and the `wfe` itself, holding the issuer
keys) and `privpb.Admin` (the operator's cross-org views) are served on the
`backend` listener to mTLS service identities only.

Facts of the server that shape the design:

- porto's `gserver` serves gRPC-Web natively on the HTTPS listener: a request
  with `Content-Type: application/grpc-web+proto` is upgraded to gRPC in
  process, and its `Origin` is checked against `cors.allowed_origins`. No
  Envoy or grpcwebproxy is needed. The dev configuration allows the Angular
  dev server (`http://localhost:4200`, and `https://app.local.trustyca.io:4200`
  for the cookie session), the headers the transport and the
  console send (`X-Grpc-Web`, `Grpc-Timeout`, `X-User-Agent`,
  `X-CSRF-Token`, `X-Device-ID`, `X-Correlation-ID`) and exposes the gRPC
  trailers (`Grpc-Status`, `Grpc-Message`) and `X-Correlation-ID`; deployed
  origins are added per environment.
- `pb.CA` is served on the `wfe` (`services: ca`, `/pb.CA` under
  `authz.allow_any_role`) and every method requires its `allowed_roles` and
  `ca:*`/`certs:*` scopes through `authctx.CheckAccess`. The `wfe` `ca`
  service is a proxy: it holds no issuer key, no issuer registry and reads
  no CA table. It copies every request into its `privpb.Backend`
  counterpart, sets `OrgID` to the org of the caller's token, and calls the
  `backend` listener with the caller's context, where the caller is
  authorized again and the method runs as that user (backend design §2.1).
  The console sees one API; what it has to handle is in section 2.1 below.
- No tenant request carries `OrgID`: `pb.Orgs` and `pb.CA` take the org
  from the token. The two exceptions name an org on purpose: `Auth.SelectOrg`
  switches to it, and `CIS.GetRoots` looks up the public anchors of an org
  (empty for the platform anchors). `ProjectID` is optional everywhere and
  selects project scope.
- Authorization is role-based with a hierarchy (Owner > Admin > Security,
  Support, Billing > User > Viewer; `APIKey` is a machine role). The server
  resolves roles from the grants in the database; the console never decides
  access itself, it only hides or disables what `Auth.GetCallerScope` reports
  as not allowed.
- Lists page with `Limit`, `Offset` (max 10000) or `Cursor` ("initial", then
  the returned cursor) and answer `NextPage{Offset, Cursor}`. There is no
  total count.
- Timestamps are RFC 3339 strings; IDs are strings; enums are `*_Enum`
  numbers with display names generated into `rpc/enums.ts`.

### 2.1 What the signing plane split means for the console

| Behaviour of the server                                                                                   | Console response                                                                                              |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Every `pb.CA` method fails with `UNAVAILABLE` ("CA is not available", "CA is not configured") when the `wfe` cannot reach a backend; the next call tries again | the CA pages (issuers, roots, profiles, certificates, revocation, the dashboard tiles) show a "CA service unavailable" state with Retry instead of a generic error; sign-in, the organization pages and the CIS lookup keep working |
| Every CA call crosses to the backend; the key operations (`RegisterIssuer`, `ImportIssuer`, `ActivateIssuer`, `UpdateIssuer`, `SignCertificate`, `PublishCrls`) add the crypto provider, and a KMS key generation can take seconds | the key operations carry a longer `grpc-timeout` and a progress state on the button; the reads keep the default deadline |
| A `FailedPrecondition` from the backend comes back as HTTP 409 `conflict` (a label in use, an inactive org or issuer, a parent that signs no CA) | shown as a conflict notice with the server text next to the form, not as a failure of the console |
| The issuer registry of a remote backend sees a profile replaced through the `wfe` after `ca.issuer_cache_ttl` (ROADMAP RM-007) | the profile editor says that signing with a changed profile may take up to the TTL to apply on a multi-pod deployment |
| `pb.CA` requests carry no `OrgID` (field 1 is reserved; commit `0c02438`): the `wfe` sets the org of the token on the forwarded copy | the console never sends tenancy to the CA; `CaService` fills `ProjectID` from the project selection when a page passes none |
| The `wfe` registers no JSON route for `pb.CA` (an open follow-up of the backend plan "for the Web UI") | not needed: the console speaks gRPC-Web, which porto upgrades to gRPC on the same path and authorizes with the same rules; a JSON route would serve `curl` and REST clients only |

## 3. Architecture

```
┌───────────────────────────────── Angular 22 application ─────────────────────────────────┐
│  features/            pages: login, auth callback, dashboard, issuers, roots, profiles,   │
│                       certificates, revocation, organization, account, settings           │
│  layout/              console shell: sidenav, toolbar, org and project switcher, profile  │
│  shared/              Material based building blocks: data table, status chips, PEM       │
│                       viewer, key-value list, confirm dialog, enum pipes, empty states    │
│  core/                Angular boundary: DI tokens and providers, AuthStore and            │
│                       TenantStore (signals), guards, error mapping, runtime config        │
├──────────────────────────────── framework-free TypeScript ───────────────────────────────┤
│  services/AppUser     user state: token, profile, selected org, preferences, persistence  │
│  services/AppPlatform platform facts: window, host, device id, network, embedding         │
│  services/storage     memory, session and local storage with a per-host prefix            │
│  services/trustyca/   rpc/: AuthService, OrgsService, CaService, CisService, StatusService│
│                       protogen/: generated messages and clients (never edited by hand)    │
│  models/, types/      Token, UserInfo and the I* interfaces the layers share              │
│  libts/               logging, json, strings, objects, datetime, storage primitives       │
├──────────────────────────────────── transport ───────────────────────────────────────────┤
│  @protobuf-ts GrpcWebFetchTransport (binary, device and auth interceptors)               │
│  fetch for the two calls of a cookie session: POST /v1/auth/org, DELETE RevokeToken       │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Two rules keep the layers honest:

1. Everything under `src/services`, `src/models`, `src/types` and `src/libts`
   is plain TypeScript with no Angular import. It is the part shared with a
   future mobile shell and it is unit tested with Vitest alone. This is the
   same split `secdi-ui` has, and the folders were copied from it.
2. Pages never import generated clients. They inject the `I*Service`
   interfaces (or the stores built on them) through DI tokens, so a page test
   gets a fake service and the generated code is only exercised in the service
   tests.

### 3.1 Dependency injection

`core/api/providers.ts` exports `provideTrustyApi()` which builds, once per
application:

| Token             | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| `RUNTIME_CONFIG`  | `{ apiUrl, loginResponseType, appVersion }` (section 12.3)          |
| `APP_PLATFORM`    | `AppPlatformService` over `PlatformInfo(window)`                    |
| `STORAGE`         | `StorageService(platform, apiHost + '_')`                           |
| `APP_USER`        | `AppUser(storage, document)`                                        |
| `RPC_TRANSPORT`   | `GrpcWebFetchTransport` with the device and auth interceptors       |
| `AUTH_SERVICE`, `ORGS_SERVICE`, `STATUS_SERVICE` | the services of the session         |

`provideCaApi()` adds `CA_SERVICE` and `CIS_SERVICE` on the lazy routes of
the CA pages (`features/ca/ca.routes.ts`), so the CA messages (about 125 kB)
load with the first CA page and not with the login; a service an injector
above already provides (the fakes of a spec) is reused.

`AuthStore` and `TenantStore` are `providedIn: 'root'` Angular services that
turn `AppUser.subscribe` and the discovery calls into signals, so templates
and guards read `auth.profile()`, `auth.isAuthenticated()`, `auth.can(…)`,
`tenantStore.projectId()` without subscriptions.

## 4. Authentication and session

### 4.1 The server's flow

The server implements the same OAuth front door as `secdi`:

| Step | Call | Notes |
| ---- | ---- | ----- |
| providers | `Auth.GetProviders{Email?}` → `{AuthURL, ProviderNames}` | with an email the server answers the one provider of its domain, or refuses an address that is neither in an allowed domain nor invited; without, every configured provider (`local`, `github` in dev) |
| authorize | browser navigates to `<apiUrl>/v1/auth/authorize?client_id=trustyca&provider=<name>&redirect_uri=<origin>/auth/authenticated&response_type=code&response_mode=query&scope=openid email profile&code_challenge=<S256>&code_challenge_method=S256&device_id=<id>&idpuser.email=<email>&login_hint=<email>&remember_me=<bool>&nonce=<random>` | built on the API URL of the console, not `AuthURL`: the callback that sets the cookies of a cookie session runs on the host of this request, and `auth.auth_url` stays on localhost for the CLI. `idpuser.email` binds the login to an address (the email flow, and the `local` provider, which signs `local+user1@x` in as `user1@x`); `redirect_uri` host must be in `auth.allowed_redirect_domains` (`localhost`, `app.local.trustyca.io`, `app.dev.trustyca.io`) |
| callback | the IdP returns to `/v1/auth/callback`; the server creates the user on first login, accepts pending invites, selects the first accessible org (or creates the default org when configured), signs the token | |
| landing | the server redirects to `redirect_uri` with the result | `code`: `?code=<otc>&expires_in=30`; `cookie`: `?cookie_set=true&csrf=<csrf cookie name>&expires_in=…` and sets the cookies; `token`: `?token=<jwt>` (CLI only, never for the SPA); failure after the state decoded: `?error=<RFC 6749 code>&error_description=…` |
| exchange | `Auth.ExchangeCode{Code, Verifier}` → `Token{AccessToken, ExpiresIn}` | the one-time code lives 30 s and is bound to the PKCE verifier |
| profile | `Auth.GetUserToken` with `Authorization: Bearer` (or the cookie and `x-csrf-token`) → `UserTokenResponse{Token, UserInfo}` | `OrgID`, `OrgRole`, `OrgRoleSource` describe the selected org; `UserInfo.Orgs` is empty here (only `SelectOrg` fills it), so the console lists the orgs with `Orgs.GetUserOrgs`; `Token.Provider` names the IdP; `Token.AccessToken` is empty in cookie mode |
| switch org | bearer: `Auth.SelectOrg{OrgID, RememberMe}` → `UserTokenResponse`; cookie: `POST /v1/auth/org` with the same JSON, which re-sets both cookies | the only tenant request that carries `OrgID`; returns a new token with the same expiry |
| sign out | bearer: `Auth.RevokeToken`; cookie: `DELETE /pb.Auth/RevokeToken`, which removes both cookies whatever the outcome and revokes the token | a revoked token is refused at once by the process that revoked it, by the others within 5 minutes; `/v1/auth/removecookie` is not needed |

### 4.2 Two session modes

The console supports both modes of `secdi-ui`, selected by the runtime
configuration `loginResponseType`:

- **`code` (default): bearer token.** PKCE code exchange, token kept by
  `AppUser` in `sessionStorage`, or in `localStorage` when the user ticks
  "Remember me". Every gRPC-Web call carries `authorization: Bearer <token>`
  through the interceptor. Works from any origin the server lists under
  `allowed_redirect_domains` and `cors.allowed_origins`, including
  `http://localhost:4200`. `SelectOrg` simply replaces the stored token.
- **`cookie`: HttpOnly session cookie.** The server sets
  `avn_trustyca_access_token` (HttpOnly) and `avn_trustyca_csrf_token`
  (readable) on `identity_map.cookies.domain` (`.local.trustyca.io` in dev),
  `SameSite=None; Secure`. The console stores only the CSRF cookie *name*
  from the `csrf` query parameter, reads the cookie on every call and sends
  `x-csrf-token` (without it the server ignores the cookie and the caller
  is a guest); the transport uses `credentials: 'include'`. This mode needs
  the console and the API on hosts under that cookie domain, over https:
  `npm run start:cookie` serves the console on
  `https://app.local.trustyca.io:4200` against
  `https://api.local.trustyca.io:8880` (both in `/etc/hosts`; the server
  certificate names `api.local.trustyca.io`). The org switch and the
  sign-out are the REST calls of section 4.1 (BE-2, done).

`AppUser.isAuthenticated` is the single source of truth: a bearer token
with a non-empty `AccessToken`, or a `cookie` token, both unexpired. A
bearer session never sends cookies (`credentials: 'same-origin'`).

### 4.3 Client flow and routes

```
/login ──(GetProviders, store PKCE verifier and after-auth route)──▶ AuthURL (server) ──▶ IdP
                                                                                            │
/auth/authenticated?code=… ◀────────────────────────────────────────────────────────────────┘
   │ dedupe the code (memory storage), clean the address bar
   │ ExchangeCode ──▶ GetUserToken ──▶ AppUser.setToken(token, profile)
   │
   ├─ profile.OrgID set         ──▶ GetCallerScope and GetOrg, then the after-auth route or /dashboard
   │                                (no org role and no project role: /auth/norole)
   ├─ no OrgID, GetUserOrgs     ──▶ /auth/select-org (pick, SelectOrg, then as above)
   ├─ no OrgID, no orgs at all  ──▶ /auth/noorg  ("ask an administrator to invite you")
   └─ error or failed call      ──▶ sign out locally, /login?error=…&error_description=…
```

| Route                 | Guard         | Purpose                                                              |
| --------------------- | ------------- | -------------------------------------------------------------------- |
| `/login`              | `loginGuard`  | provider buttons (from `ProviderNames`), email for enterprise domains, remember me, error banner from `?error`; a signed-in user goes to the requested page |
| `/auth/authenticated` | none          | landing for `code`, `cookie_set` and `error`; exchange and profile load; never renders the token |
| `/auth/select-org`    | authenticated | org list from `UserInfo.Orgs` and `Orgs.GetUserOrgs` with roles; `SelectOrg` |
| `/auth/noorg`         | authenticated | no accessible org; sign out                                          |
| `/auth/norole`        | authenticated | org selected but every method denied (an `APIKey`-only or disabled role); sign out |
| everything else       | `authGuard` then `orgGuard` | the console shell                                     |

`authGuard` replaces today's `previewGuard`: unauthenticated users go to
`/login?returnUrl=…` and the return URL is stored as the after-auth route
(same origin, not `/login`, as the scaffold already validates). `orgGuard`
sends an authenticated user without `OrgID` to `/auth/select-org` or
`/auth/noorg`, and a user whose caller scope has no org role and no project
role to `/auth/norole` on every console navigation, not only after the
sign-in (the scope loads once per org; when it cannot load, the page opens
and shows its own failures).

### 4.4 Expiry and sign-out

- `AppUser` knows `ExpiresAt`; `AuthStore` schedules a timer that signs
  the user out with the expired flag (`AppUser.logout(true)`) a minute
  before. The shell shows a "session expired" bar with a sign-in link that
  returns to the page, and the login a notice; a call refused with gRPC
  `UNAUTHENTICATED` (16) on the session does the same (auth interceptor).
- Sign-out calls `RevokeToken` (REST in cookie mode so the cookies are
  cleared, gRPC otherwise), then `AppUser.logout()`, which clears the
  persisted token, the per-org data and the in-memory caches, and routes to
  `/login`.
- `PERMISSION_DENIED` (7) is not a sign-out: it is shown as "not allowed"
  and the capability is re-read, except on `GetUserToken` and `SelectOrg`,
  where it means the token is no good and the user is signed out.

## 5. Authorization in the UI

The console asks the server once per org selection: `Auth.GetCallerScope`
returns the resolved org role, the project roles, the token scopes and, for
every public method, the roles it requires and `Allowed` at org scope.
`AuthStore.can(method)` reads that map, and templates use it as
`@if (auth.can('/pb.CA/RegisterIssuer'))`. The verdict is at org scope; for a
member whose grant is only in a project, `CallerScope.ProjectRoles` tells
which project, and the shell offers only those projects in the selector.

Rules the pages follow (from the proto options):

| Area          | Read (list, get)      | Change                                                           |
| ------------- | --------------------- | ---------------------------------------------------------------- |
| Issuers, roots, profiles | Viewer     | Admin (register, import, activate, update, archive, destroy, delete profile) |
| Certificates  | Viewer                | User: issue, label and metadata; User or Security: revoke        |
| CRLs          | Viewer                | Admin or Security: publish                                       |
| Org           | Viewer                | Admin: update; Owner: delete                                     |
| Projects      | Viewer                | Admin                                                            |
| Members       | Support or Security   | Admin; Owner for the Owner role                                  |
| API keys      | Admin                 | Admin                                                            |

Hidden is not secure: the server re-checks every call, and the console
shows the server's error when a hidden action is reached by URL.

## 6. Tenancy: organization and project

- The **organization** is the token. The org switcher in the toolbar lists
  `Orgs.GetUserOrgs` (name, alias, resolved role, source) and calls
  `SelectOrg`. Switching clears every cached resource (`TenantStore.reset()`).
- The **project** is a client-side filter persisted per org in `AppUser`
  (`perOrg[orgId].projectId`, the way `secdi` keeps `cloudId`). The project
  selector offers "All projects" plus `Orgs.ListProjects`; a member with
  project grants only gets the granted projects and no "All". The selected
  `ProjectID` goes into every CA list and create request and into
  `ListAPIKeys`, `GetMembers` and the project-scoped member actions.
- Resources show their scope: an issuer or profile with an empty `ProjectID`
  is "Org-wide" and inherited by every project; a project one shows the
  project name resolved from the project list.

## 7. Navigation

The scaffold's three entries stay first. The rest groups the CA and the
organization:

```
Dashboard
Issuers                 /issuers
Certificates            /certificates
Profiles                /profiles
Trust anchors           /roots
Revocation              /revocation            (CRLs per issuer, revoked certificates)
Lookup                  /lookup                (CIS: status of any certificate by serial, SKID, SHA-256)
Organization            /org                   (General, Projects, Members, API keys)
---
profile menu            Account, Settings, Switch organization, Sign out
```

The sidebar shows the entries in two groups, "Workspace" (the CA pages) and
"Administration" (Organization); an entry names the method it needs and is
hidden once the caller scope denies it (the Organization tabs Members and
API keys do the same with `GetMembers` and `ListAPIKeys`). The org switcher
is the organization block at the top of the sidebar: a menu of
`GetUserOrgs` (read when it first opens) that calls `SelectOrg` and lands
on the home of the new org; "All organizations" opens the selection page.
The toolbar shows the breadcrumb (org and section), the project selector,
the role and the profile menu. The footer shows the server build from
`Status.Version` and the console version.

## 8. Pages

Every list page has the same shape: a heading with the primary action, a
filter row, a Material table with server-side cursor paging ("Load more"
and a page size), row click to the details page, status chips, and empty,
loading and error states. Every details page has a header with identity
and status, action buttons gated by `can()`, and tabs. Every CA page shares the
unavailable state of section 2.1 through one component, and the key
operations (register, import, activate and update an issuer; issue a
certificate; publish CRLs) get the longer deadline `CaService` sets.

### 8.1 Issuers

- **List** `CA.ListIssuers{ProjectID, Status, Type, Limit, Cursor}`:
  label, type, status, subject, scope, not after, CRL number; filters by
  status and type; actions: Register, Import.
- **Details** `CA.GetIssuer{ID}` with tabs:
  - Overview: subject, issuer, type, status, SKID, IKID, serial, SHA-256,
    validity, key provider, parent (link), scope, timestamps.
  - Chain: PEM viewer for `Certificate`, `Intermediates`, `Root` with copy
    and download (`.pem`, `.crt`), and for `Csr` while Pending.
  - Profiles: the `Profiles` labels and `Config.AllowedProfiles`, linking to
    the profile pages.
  - Revocation: `CrlNumber`, the current CRL (`CA.GetCRL{IKID}`: number,
    this and next update, download), "Publish CRL" (`PublishCrls{IKID,
    Force}`), and the revoked certificates of the issuer.
  - Configuration: `IssuerConfig` form (AIA, OCSP and CRL URL templates with
    `${ISSUER_ID}`, CRL expiry and renewal, OCSP expiry, delegated OCSP
    profile, allowed profiles, omit disabled extensions), saved with
    `UpdateIssuer{Config}`.
  - Actions: Activate (Pending: paste the signed certificate and chain,
    `ActivateIssuer`), Archive and Destroy (`UpdateIssuer{Status}`, with a
    confirm dialog that spells out the consequences: Archived keeps CRL and
    OCSP, Destroyed removes the key).
- **Register** (`RegisterIssuer`), a stepper: scope and label; type (Root,
  Intermediate, Issuing, Shaken, Shaken delegated); subject (`X509Subject`
  fields, SAN); key (`KeySpec` ECDSA P-256 default, RSA 2048 to 4096,
  P-384; key provider); signing (self-signed for Root; parent issuer from the
  Active issuers of the scope, plus a platform issuer by the ID an operator
  hands out, since a tenant cannot list the platform issuers (BE-10), with
  the CA profile label; or "external: create a CSR" for a Pending issuer);
  configuration (`IssuerConfig` defaults from the parent); review. The
  result page shows the CSR for a Pending issuer.
- **Import** (`ImportIssuer`): label, type, certificate, intermediates and
  root PEM paste or file drop, key as a provider URI or PEM (warned as
  sensitive, sent once, never stored client-side), configuration.

### 8.2 Trust anchors

`CA.ListRoots{}` for the org's anchors and `CIS.GetRoots{OrgID: ''}` for the
platform roots, in two sections: subject, SKID, SHA-256, trust, validity,
PEM download. `RegisterRoot{Pem, Trust}` for an external anchor.

### 8.3 Profiles

- **List** `CA.ListProfiles{ProjectID, IssuerLabel}`: label, issuer
  label (`*` shown as "any allowed issuer"), description, expiry, usages,
  scope, status.
- **Details and edit**: `CertProfile` is the YAML profile shape of the CA
  configuration. The editor is a form for the common fields (label, issuer
  label, description, expiry and backdate, usages, CA constraint, allowed
  names, DNS, email and URI patterns, allowed CSR fields, OCSP no-check,
  allowed and denied roles) and a raw JSON editor for extensions, policies
  and anything else, with client-side validation of durations and OIDs.
  Saved with `RegisterProfile` (create or replace by label); the save
  confirmation notes that a remote signing backend picks the change up
  within `ca.issuer_cache_ttl` (section 2.1). Delete with a confirm dialog.
- Profiles the issuer may sign are cross-linked to the issuer pages.

### 8.4 Certificates

- **List** `CA.ListCertificates{ProjectID, IKID, Profile, Status,
  ExpiringBefore, Limit, Cursor}`, newest first: label or subject, issuer
  (label resolved by IKID: `ListIssuers{IKIDs}` for the IKIDs of the page
  that the cache does not hold, BE-6), profile, serial, status,
  not after with an "expires in" hint, project. Filters: issuer, profile,
  status, expiring within 7, 30, 90 days. Action: Issue certificate.
- **Details** `CA.GetCertificate{ID}`: subject, issuer, serial, SKID, IKID,
  SHA-256, validity, profile, label, metadata (editable key-value list,
  `UpdateCertificateLabel`), locations, status with the revocation reason
  and time when revoked (`CIS.GetCertificateStatus`), PEM viewer for the
  certificate and the chain (download leaf, chain, full bundle), parsed
  extensions (SAN, key usages, basic constraints, AIA and CRL URLs) decoded
  client-side from the PEM.
- **Revoke**: dialog with the `ReasonCode` list (RFC 5280; `RemoveFromCRL`
  omitted, since the server refuses it), free text, confirm;
  `RevokeCertificate{ID, Reason, ReasonText, ProjectID}`.
- **Issue** (`SignCertificate`): profile (from the list, with its issuer; an
  issuer selector when the profile binds to `*`), CSR paste or file (PEM or
  DER), optional SAN, subject override, not before and not after within the
  profile expiry, label and metadata. The result shows the certificate with
  download buttons. Writing the private key for the user is out of scope:
  the console signs requests, it does not generate keys.

### 8.5 Revocation

- **CRLs**: one row per Active or Archived issuer with the current CRL
  (`GetCRL`): number, this update, next update, "due" when inside the
  issuer's renewal window, download; "Publish" per issuer and "Publish due
  CRLs" for the scope (`PublishCrls{ProjectID?, Force}`).
- **Revoked certificates**: `ListRevokedCertificates{ProjectID, IKID}`: certificate, revoked at, reason, note; links to the certificate.

### 8.6 Lookup (CIS)

A support view that works across tenants, since the CIS carries no tenancy:
find by ID, SKID, SHA-256, or issuer key ID and serial
(`CIS.GetCertificate`, `CIS.GetCertificateStatus`), show the issuer chain
and its AIA, CRL and OCSP URLs (`CIS.GetIssuer{IKID}`), fetch a CRL
(`CIS.GetCRL`). Results carry no org, profile, label or metadata.

### 8.7 Organization

Tabs under `/org`:

- **General**: `Orgs.GetOrg` as the shell loaded it, name and description
  edited in place (`UpdateOrg`, Admin, the server's refusal next to the
  form); Delete (Owner, the alias typed to confirm). `DeleteOrg`
  deactivates the org, so the console then opens the org selection: the
  token still names the deleted org, and the next org selection issues a
  new one.
- **Projects**: the list of the `TenantStore` (every page of
  `ListProjects`), register (alias, name, description) and edit (name,
  description) in a dialog that keeps the server's refusal, delete
  (deactivate) with the alias typed to confirm; the store reloads and the
  project selector follows, and a deleted selection goes back to all
  projects. The inactive projects stay in the list and leave the selector.
- **Members**: `GetMembers{ProjectID?, Scope?}` as memberships and pending
  invites, with scope (org-wide or project) and role; add (email, role,
  scope) with the server deciding invite versus grant; change role; remove;
  delete invite. The roles offered follow `CanGrant` rules server-side, so
  errors are surfaced, not pre-empted.
- **API keys**: `ListAPIKeys{ProjectID?, Status}`, create (label, scopes
  from the known list `org:read`, `project:read`, `ca:read`, `ca:write`,
  `certs:read`, `certs:issue`, `certs:revoke`, wildcards; project; expiry,
  90 days default) with the secret shown exactly once in a copy dialog;
  delete.

### 8.8 Account and settings

Account: the profile from `UserInfo` (name, email, verified, provider), the
memberships from `Orgs.GetUserMemberships`, the token expiry, "Sign out
everywhere" (revoke). Settings: console preferences kept in `AppUser`
preferences (theme, default project, page size, date format), per user and
per org, as `secdi` scopes them.

## 9. Dashboard

The dashboard answers "is my PKI healthy and what needs attention". Tiles
first, then detail panels:

| Tile                   | Fallback source, without `CA.GetSummary` (see below)                |
| ---------------------- | ------------------------------------------------------------------- |
| Issuers                | `ListIssuers` by status: active, pending (needs activation), archived |
| Certificates           | `ListCertificates{Status: Active}` first page and the issuance of the last 24 h and 7 days from `CreatedAt` of the newest pages |
| Expiring               | `ListCertificates{ExpiringBefore: now + 30d, Status: Active}`, with 7 and 90 day buckets |
| Revoked                | `ListRevokedCertificates` newest page                               |
| CRLs                   | per issuer `GetCRL`: next update, due and overdue count             |

Panels: expiring certificates (table with "renew by"), pending issuers with
"Activate", CRLs due with "Publish", the trust map of the scaffold filled
with the real chain (roots → intermediates → issuing, from `ParentID`),
recent activity.

The tiles read `CA.GetSummary` (BE-4, done in `trustyca`): one call per
dashboard load, for the org or the selected project as `ProjectID`, which
returns the issuers by status, the certificates by status, the Active
certificates expiring within 7, 30 and 90 days (cumulative) and the
issuers that publish CRLs by the state of their CRL (current, due, overdue,
missing), with `At`, the time of the counts; a member with project grants
only gets the org-wide rows and those of its projects. The counts are
exact: every status and bucket is present, with zero when empty. Deriving
the numbers from pages, with "100+" when `NextPage` is set, stays the
fallback of a `wfe` without the method. The activity panel reads
`Orgs.ListEvents` (BE-3, done in `trustyca`):
the newest page of the org, or of the selected project as `ProjectID`, with
`Type`, `After` and `Before` filters and cursor paging; a member with project
grants only gets the org-wide events and those of its projects.

Charts (issuance per day, expiry timeline) use a small SVG or Chart.js
component behind an interface, so the chart library is a build-time choice.

## 10. Data access layer

### 10.1 Transport

```ts
new GrpcWebFetchTransport({
  baseUrl: config.apiUrl,
  format: 'binary',
  fetchInit: { credentials: cookieMode ? 'include' : 'same-origin' },
  timeout: 15_000,
  interceptors: [deviceInterceptor(deviceId), authInterceptor(user)],
})
```

The auth interceptor is `secdi`'s: unless the call already sets
`authorization`, it merges `AppUser.rpcMetadata()` (bearer header, or
`x-csrf-token` in cookie mode), and a call refused with `UNAUTHENTICATED`
on the session signs the user out with the expired flag. The device
interceptor adds `x-device-id`. The two REST calls of a cookie session use
`fetch` with `credentials: 'include'` and `X-CSRF-Token`, and map an HTTP
failure to an `RpcError` with the matching gRPC code, so the error mapping
is one.

`CaService` passes a longer `timeout` option on the key operations (section
2.1), which protobuf-ts sends as `grpc-timeout` (the `wfe` CORS allows the
header); the server sets no deadline of its own on a forwarded call, so that
deadline is the only bound of a key operation (BE-7).

### 10.2 Services

One handwritten class per proto service under `src/services/trustyca/rpc`,
each with an `I*Service` interface, a `$rpc` generated client, `log.debug`
on entry and `log.error` on failure, returning `Promise<Response>` (the
`secdi` pattern, which keeps the services testable with a mocked client).
`pb.CA` requests carry no tenancy but `ProjectID`; `CaService` fills it from
the project selection in the list requests and `PublishCrls` when the page
names none (an explicit `''` asks for every project), while create, revoke
and label requests name their project themselves. It owns the longer
deadline of the key operations (60 s) and turns `UNAVAILABLE` into
`CaUnavailableError` (section 2.1). `AuthService` owns the authorize URL,
the REST cookie calls and the `setToken` into `AppUser`, as `secdi`'s
`AuthService` does. Requests are logged with `KeyPem`, `Secret`, `Request`,
`AccessToken`, `Code` and `Verifier` redacted.

### 10.3 Resources and caching

Angular's `resource()` and `rxResource()` are the page-level primitive: a
request signal (filters, cursor, project) drives a loader that calls the
service, and the template reads `value()`, `isLoading()`, `error()`.
Cursor paging accumulates pages in a small `PagedResource<T>` helper
(`items`, `nextCursor`, `loadMore()`, `reload()`).

`AuthStore` keeps the session: the user, the selected org (`GetOrg`) and
its caller scope, loaded once per org. `TenantStore` keeps what every page
of the org needs and what is costly to re-fetch: the projects (every page
of `ListProjects`, as a resource keyed by the org, so an org switch reloads
it and `invalidateProjects()` refreshes it after a mutation), the project
selection (persisted per org in `AppUser`; a member with project grants
only is kept on one of its projects), and the issuer labels by IKID that
the CA pages collect (the issuer list of the filters and the trust map,
and `ListIssuers{IKIDs}` per page of certificates, BE-6). The labels are
dropped when the org changes. This replaces `secdi`'s `StoreV2` and its
`Resource` class; the behaviour is the same, the mechanism is signals.

### 10.4 Errors

`RpcError` from protobuf-ts carries the gRPC `code` string and message.
`core/api/errors.ts` maps it to a `UiError{kind, title, detail, retry}`:

| gRPC code                  | UI                                                        |
| -------------------------- | --------------------------------------------------------- |
| UNAUTHENTICATED            | session expired, sign-in bar                              |
| PERMISSION_DENIED          | "not allowed" notice; on auth calls a sign-out            |
| NOT_FOUND                  | inline empty state ("no such issuer in this project")     |
| INVALID_ARGUMENT           | form errors next to the field named in the message        |
| FAILED_PRECONDITION, ABORTED | conflict notice with the server text (a label in use, an inactive org or issuer, a parent that signs no CA); the backend answers these with HTTP 409 |
| UNAVAILABLE on a `pb.CA` method ("CA is not available", "CA is not configured") | "CA service unavailable" state on the CA pages with Retry; the other services are unaffected |
| UNAVAILABLE, DEADLINE_EXCEEDED, network | retry snackbar                               |
| everything else            | error snackbar with the message and a correlation hint    |

### 10.5 Generated code

`make proto` regenerates `src/services/trustyca/protogen` (protobuf-ts,
`long_type_string`, `use_proto_field_name`) and `rpc/enums.ts` (display
names and parsers from the `es.api.enum_display` options). Generated files
are committed, never edited, and excluded from lint and format. The
`status.proto` is added to the target so `StatusService` is typed too.

## 11. Shared UI

- **Theme**: the scaffold's Material 3 theme (green primary) stays. Status
  colors are tokens: `active` green, `pending` amber, `archived` grey,
  `destroyed` and `revoked` red, `expired` orange, with the same palette in
  chips, tiles and charts.
- **`app-data-table`**: wraps `MatTable`; the columns are projected
  `*appColumn` templates (`of` names the rows so the row is typed), the rows
  come from an array or from a `PagedResource`, which also drives the
  loading state, the failure and "Load more"; sticky header, row click,
  page size, loading skeleton, empty state with an action slot, error state
  with Retry. No sort in v1 (the API has none).
- **`app-status-chip`**: one chip for every enum, with the display name
  from `enums.ts` (`enumName`) and a tone (`active`, `pending`, `archived`,
  `destroyed`, `revoked`, `expired`, `neutral`) that `status-tone.ts` derives
  from the issuer, certificate and item statuses.
- **`app-pem-viewer`**: monospace block, copy, download (`.pem` and DER via
  client-side decode), optional parsed summary (`pkijs` or a small ASN.1
  parser) for subject, SAN, validity, key usages.
- **`app-kv-list`** for metadata and claims, editable variant for
  certificate metadata.
- **`app-confirm-dialog`** (`ConfirmService.confirm()`) with typed
  confirmation for destructive actions; `NotifyService` shows a `UiError`
  as a snackbar with Retry when trying again may help.
- **Pipes**: `enumName` (a number or a name the server hands out, such as
  the `OrgRole` of the token), `relativeTime`, `rfc3339Date`, `expiresIn`,
  `fingerprint` (groups hex pairs), `scopeName` (the project name of a
  `ProjectID`, "Org-wide" when empty).
- **Forms**: typed reactive forms; durations validated as Go durations
  (`168h`, `30m`); OIDs as dotted numbers; PEM blocks by header
  (`parsePemBlocks` also feeds the PEM viewer). `app-pem-input` is the PEM
  field: paste, choose a file or drop one, the blocks found and the errors
  by name. A requirement that depends on another field (the parent of a
  signing mode, the key of an import) is set on the control when the mode
  changes, since `mat-error` shows only for the field's own control.
- **CA state** (`shared/ca-state`): `app-ca-unavailable` is the state of
  section 2.1 with the server's text and Retry; `app-request-error` renders
  a failure next to the form that sent it, a conflict as a notice with the
  server's text; `Operation` holds the busy state and the failure of one
  request, for the key operations with the longer deadline.
- **`app-stepper`** (`shared/stepper`): a linear stepper of the console's
  own, `StepperState` and the rail; the page renders the open step.
  Material's stepper imports `MatIcon` and with it `HttpClient` into the
  initial bundle.
- **`app-pem-dialog`**: a PEM viewer in a dialog, for the rows of a list that
  hold a certificate.

## 12. Platform, storage and configuration

### 12.1 AppPlatform

`PlatformInfo(appVersion, window)` and `AppPlatformService(storage,
platform)` are ported unchanged from `secdi` (`src/types/IAppPlatform.ts`,
`IPlatformInfo.ts` are already in place). In Angular the `window` comes
from `DOCUMENT.defaultView`, which keeps the services testable under jsdom.
`openUrl` and the embedding flags are where a mobile shell plugs in.

### 12.2 AppUser and storage

`AppUser` is ported with its persistence (`trustyca_user` in session or
local storage, chosen by "Remember me"), per-org data (`projectId` instead
of `cloudId`), user, org and project preferences, PKCE helpers (Web Crypto
S256) and `rpcMetadata`. The per-org data and the preferences are kept per
user ID (`trustyca_user_data`) and leave memory on sign-out, so another
account on the same browser inherits neither. It has no RxJS:
`subscribe(listener)` returns the function that removes the listener, and
`AuthStore` holds the signals. A refused session ends only when the token
that made the call is still the current one.

`StorageService` prefixes keys with the API host, so two environments in
one browser do not share sessions, and falls back to memory when the
browser refuses its storage (reading `window.localStorage` throws
`SecurityError` when site data is blocked). The values of a login in
progress, the `otc_binding` verifier and the after-auth route, always live
in the session storage of the tab: they survive the redirect to the
identity provider, and a login in another tab cannot overwrite them. The
`csrf_token_name` key follows the persisted storage.

### 12.3 Runtime configuration

The container writes `config.js` at start from environment variables
(`TRUSTYCA_APP_API_URL`, `TRUSTYCA_APP_LOGIN_RESPONSE_TYPE`), as
`secdi-ui`'s `docker-entrypoint.d` does:

```js
window.__TRUSTYCA_RUNTIME_CONFIG__ = { API_URL: 'https://localhost:8880', LOGIN_RESPONSE_TYPE: 'code' }
```

`index.html` loads it before the bundle; the committed `public/config.js`
assigns an empty object. `RUNTIME_CONFIG` falls back to the Angular
environment (`environment.development.ts` for `npm start`: bearer on
`https://localhost:8880`; `environment.cookie.ts` for `npm run start:cookie`;
none in production) and then to `https://localhost:8880` in bearer mode.

## 13. Project layout

```
Documentation/           DESIGN.md, PLAN.md
public/                  brand, favicon, config.js (dev default)
src/
  app/
    core/                api/ (providers, ca-providers, tokens, errors, paged resource), auth/ (guards, AuthStore), tenant/ (TenantStore)
    layout/              console shell: navigation, org switcher, project selector, profile menu
    features/            login, auth, ca (lazy routes of the CA pages), dashboard, issuers, roots, profiles,
                         certificates, revocation, lookup, org (lazy routes of the tabs), account, settings
    testing/             fakes of the services for the specs
    shared/              components, pipes, forms, theme tokens
  libts/                 framework-free utilities (from secdi, trimmed)
  models/, types/        Token, UserInfo, I* interfaces
  services/
    AppPlatform/, AppUser/, storage/, runtimeConfig.ts
    trustyca/protogen/   generated
    trustyca/rpc/        AuthService, OrgsService, CaService, CisService, StatusService, enums.ts (generated),
                         testing/fake-transport.ts
    trustyca/transport.ts  gRPC-Web transport, auth and device interceptors
  environments/          build-time fallback of the runtime configuration
```

TypeScript resolves `src/...` imports through `paths` in `tsconfig.json`,
which the copied folders already use.

## 14. Testing

- **Unit (Vitest, jsdom, `ng test`)**: `libts`, `models`, `AppUser`,
  `StorageService`, every rpc service running its generated client against
  `rpc/testing/fake-transport.ts` (Angular's unit-test builder bundles the
  specs and refuses `vi.mock` of project files, so the `secdi` pattern does
  not apply), error mapping, guards and stores with the fakes of
  `src/app/testing/test-api.ts`, pipes.
- **Component**: pages with `TestBed` and fake `I*Service` providers (the
  CA pages with `FakeCaService` and `FakeCisService`, which keep the issuers
  and the roots in memory with the server's rules the pages rely on);
  router harness tests as in `app.spec.ts` for the auth redirects and the
  org and project switching.
- **Contract**: the service specs reach every method through the generated
  clients and the fake transport, so a proto regeneration that renames a
  method fails a spec, not the user.
- **End to end (later)**: Playwright against a dev `trustycasvc` with the
  `local` provider, covering login, org selection, register issuer, issue
  and revoke a certificate, publish a CRL.

## 15. Build and deployment

- `npm start` serves on `http://localhost:4200` against the dev server,
  whose CORS allows that origin and whose redirect domains include
  `localhost`.
- `npm run build` produces `dist/trustyca-ui/browser`; a multi-stage
  Dockerfile serves it with nginx (SPA fallback to `index.html`, `config.js`
  from the entrypoint, `Cache-Control` for hashed assets, CSP). The
  alternative of embedding the bundle in the `trustycasvc` `ui` service is
  possible once RM-005 (serve the UI under a listed prefix) is done, and is
  not needed for v1.
- CI: `npm ci`, `npm run lint`, `npm run format` check, `npm test`,
  `npm run build`, and `make proto` followed by `git diff --exit-code` so
  the generated code matches the protos of the pinned backend commit.

## 16. Security

- The SPA never receives a token in the URL: the `code` flow exchanges a
  30-second one-time code bound to a PKCE verifier; the landing page replaces
  the history entry before doing anything else.
- Bearer tokens live in `sessionStorage` unless the user asks to be
  remembered; nothing is written to `localStorage` on a shared device
  (`StorageService.persisted` decides).
- Cookie mode is HttpOnly plus CSRF header, `SameSite=None; Secure`, and
  needs the shared cookie domain.
- Imported keys (`ImportIssuer.KeyPem`) and API key secrets are shown or
  sent once and never cached or logged; `log.debug` of requests redacts
  `KeyPem`, `Secret` and `Request` (CSR bytes).
- CSP without inline scripts (Material 3 and the SVG icons need no inline
  styles beyond Angular's emulated encapsulation), no CDN assets (fonts are
  local, as today).
- The UI gates by the server's `CallerScope` and shows server errors; it
  does not implement the role hierarchy.

## 17. Backend prerequisites and open items

| ID   | Change in `trustyca`                                                                                       | Needed by           |
| ---- | ---------------------------------------------------------------------------------------------------------- | ------------------- |
| BE-0 | Done in `trustyca` commit `0c02438`: the `wfe` CORS allows `http://localhost:4200`, the gRPC-Web and console headers, and exposes the gRPC trailers; deployed origins are added per environment | done |
| BE-1 | Done in `trustyca` commits `1cd22a8` and `0c02438` ("Refactor Backend service"): `pb.CA` on the `wfe` for tenant tokens, every call forwarded to `privpb.Backend` with the org of the token | done |
| BE-2 | Done in `trustyca` commit `c28383e`: `POST /v1/auth/org` selects the org of a cookie session and re-sets both cookies | done |
| BE-3 | Done in `trustyca` (2026-10-31): `Orgs.ListEvents{ProjectID?, Type?, After?, Before?, Limit, Cursor}` returning `EventsResponse`, cursor only, `Viewer,APIKey` with `org:read` | done |
| BE-4 | Done in `trustyca`: `CA.GetSummary`, the issuers by status, the certificates by status and by expiry bucket (7, 30, 90 days), the CRLs by state (current, due, overdue, missing), for the org or a `ProjectID` | exact dashboard tiles |
| BE-5 | Done in `trustyca` (2026-10-30, ROADMAP RM-004 closed): optional `ProjectID` on `UpdateIssuerRequest`, `ActivateIssuerRequest` and `DeleteProfileRequest`, so a project Admin acts on the rows of its project; the console sets it from the project selection as it does for `UpdateCertificateLabel` | done |
| BE-10 | Open: a tenant cannot discover a platform issuer (`ParentID` is an ID; `GetIssuer` and `ListIssuers` answer the org's rows only). A `ParentLabel` resolved in the platform scope, or a `CA.ListPlatformIssuers` with label, subject and allowed profiles, would let the stepper offer the platform parents by label | the parent selector of the Register stepper |
| BE-6 | Done in `trustyca`: `ListIssuers{IDs, IKIDs}` and `ListProfiles{IDs, Labels}`, at most 500 each, resolve the issuers and profiles of a page of certificates in one call each | large tenants |
| BE-7 | Done (verified 2026-10-30, no change): `timeout.request` is porto's shutdown drain timeout and the listeners set no write deadline; the gRPC server takes the console's `grpc-timeout` as the deadline the `ca` proxy forwards | done |
| BE-8 | Done in `0c02438` (ROADMAP RM-006): `OrgID` dropped from the public `pb.CA` requests (field 1 reserved); the stubs are regenerated | done |
| BE-9 | Done in `0c02438`: the `service CA` comment describes the tenant API on the `wfe` | done |

The console does not need the JSON route of `pb.CA` on the `wfe` that the
backend plan lists as a follow-up for the Web UI (section 2.1).

Open items of the console itself: client-side CSR and key generation (Web
Crypto, download of a PKCS#8 key), delta views of CRLs, an audit page once
BE-3 lands, dark theme, and the mobile shell.
