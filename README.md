# Trusty CA Console

An Angular Material dashboard and management console for Trusty Certification
Authority. It signs users in through the identity providers of the `trustyca`
server and calls the `wfe` listener over gRPC-Web. The design and the execution
plan are in [Documentation/DESIGN.md](Documentation/DESIGN.md) and
[Documentation/PLAN.md](Documentation/PLAN.md).

## Requirements

Node.js **22.22.3+** on the Node 22 line, **24.15+** on the Node 24 line, or
**26+**, and npm. The pinned development version is in `.nvmrc`. The backend is
the `trustyca` checkout next to this repository (`TRUSTYCA_PROJ`, default
`../trustyca`).

```sh
nvm install
nvm use
npm ci
```

## Run locally

### 1. The server

Start the all-in-one `trustycasvc` of the `trustyca` checkout: the `wfe`,
`backend` and `aia` listeners in one process. A process without the `backend`
listener answers every CA call with `UNAVAILABLE`. From `../trustyca`:

```sh
make start-sql          # the dev database (once)
make build
TRUSTYCA_DP_SEED=testseed bin/trustycasvc --cfg etc/dev/trustyca-config.yaml
curl -k https://localhost:8880/v1/status/version
```

`TRUSTYCA_DP_SEED` must be the seed the dev database was bootstrapped with
(`testseed` unless your shell exports another; see "Data protection seed" in the
`trustyca` README). The dev configuration offers the `local` identity provider,
which needs no external IdP and no invitation.

The browser has to trust the dev root that signed the server certificate,
`~/.trustyca/certs/trustyca_root.pem` (or `etc/dev/certs/root/trustyca_root.pem`
in `trustyca`): import it in Chrome under Settings, Privacy and security,
Security, Manage certificates, Authorities, with "Trust this certificate for
identifying websites". Without it every call fails with a network error and the
footer reads "Server unreachable".

### 2. The console, bearer session (default)

```sh
npm start
```

Open <http://localhost:4200>. The login page lists the providers of the server.
Type `local+user1@trustyca.io` and choose **Continue with a local account** (or
**Continue**) to sign in as `user1@trustyca.io`; the server creates the user and
its default org on the first login. The token lives in session storage, or in
local storage with **Remember me**. **Sign out** in the profile menu revokes it.

### 3. The console, cookie session

The cookie session keeps the token in the HttpOnly cookie of the server on the
cookie domain `.local.trustyca.io`, so the console and the API must both be
served from hosts under it, over https:

```sh
# /etc/hosts
127.0.0.1 app.local.trustyca.io api.local.trustyca.io
```

```sh
npm run start:cookie
```

Open <https://app.local.trustyca.io:4200> and accept the certificate of the dev
server (Angular generates a self-signed one). The `cookie` configuration
(`src/environments/environment.cookie.ts`) points the console at
`https://api.local.trustyca.io:8880` with `LOGIN_RESPONSE_TYPE` `cookie`. The
server certificate must name `api.local.trustyca.io`: the certificates of a
recent `make gen_test_certs` do, and the `trustyca` README ("Web UI sessions")
shows how to issue a new server certificate alone.

### Configuration

`public/config.js` is loaded before the bundle and sets
`window.__TRUSTYCA_RUNTIME_CONFIG__`; a container rewrites it at start from
`TRUSTYCA_APP_API_URL` and `TRUSTYCA_APP_LOGIN_RESPONSE_TYPE`. An empty object
keeps the values of the build: `src/environments/environment.development.ts`
for `npm start`, `environment.cookie.ts` for `npm run start:cookie`, and
`https://localhost:8880` in bearer mode otherwise.

## Scripts

```sh
npm run build       # production output: dist/trustyca-ui/browser
npm test            # Vitest unit and component tests, once
npm run test:watch  # development test watcher
npm run lint        # angular-eslint
npm run format      # Prettier check (format:fix writes)
npm run typecheck   # tsc over the app and the specs
make lint           # lint, format and typecheck together
```

## Project structure

```text
public/
  brand/              SVG mark and full wordmark
  config.js           runtime configuration, rewritten by the container
src/app/
  core/
    api/              DI tokens, provideTrustyApi(), provideCaApi(), error mapping, paged resource
    auth/             AuthStore (signals), guards, return URL rules
  layout/             console shell: toolbar, profile menu, navigation, session bar
  features/
    auth/             landing, org selection, no-org and no-role notices, auth layout
    login/            providers, email sign-in, remember me
    ca/               lazy routes of the CA pages, with the CA services
    dashboard/ issuers/ certificates/ account/ settings/
  shared/             brand, SVG icons, page heading, empty state
  testing/            fakes of the services for the specs
src/environments/     build-time fallback of the runtime configuration
src/libts/            framework-free utilities: logging, JSON, strings, dates, storage
src/models/           Token and UserInfo models
src/types/            interfaces shared by the layers (IAppUser, IAppPlatform, ...)
src/services/         framework-free: runtimeConfig, AppPlatform, AppUser, storage
src/services/trustyca/
  protogen/           generated protobuf messages and gRPC-Web clients (make proto)
  rpc/                AuthService, OrgsService, CaService, CisService, StatusService;
                      enums.ts is generated; testing/ holds the FakeTransport of the specs
  transport.ts        the gRPC-Web transport and its auth and device interceptors
src/styles.scss       Material theme and shared presentation styles
```

Nothing under `src/services`, `src/models`, `src/types` and `src/libts` imports
Angular: that layer is shared with a future mobile shell. Pages inject the
`I*Service` interfaces through the tokens of `core/api/tokens.ts`.

## API clients

`make proto` regenerates the TypeScript clients from the protos of the
`trustyca` checkout: `@protobuf-ts/protoc` writes the messages and gRPC-Web
clients to `src/services/trustyca/protogen`, the `effectivesecurity/protoc-gen-go`
image writes the enum display names to `src/services/trustyca/rpc/enums.ts`, and
`npm run format:fix` formats the result. Generated files are committed and never
edited by hand; `protogen` is excluded from Prettier and ESLint. The committed
clients match `trustyca` commit `f869a50`; regenerate after pulling the backend
and commit the result.

Every call to the `wfe` is gRPC-Web. The only REST calls are the two of a cookie
session that replace or remove the HttpOnly cookie, which gRPC cannot set:
`POST /v1/auth/org` (switch org) and `DELETE /pb.Auth/RevokeToken` (sign out).
The sign-in itself is a browser navigation to `/v1/auth/authorize`.

For static hosting, configure SPA fallback to `index.html` so deep links such as
`/certificates` work on refresh. This is a client-rendered application; SSR is
not enabled.
