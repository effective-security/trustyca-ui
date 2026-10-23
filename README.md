# Trusty CA Console

An Angular Material dashboard and management console for Trusty Certification
Authority. This first phase is a standalone UI scaffold with no backend binding.

## Run locally

Requires Node.js **22.22.3+** on the Node 22 line, **24.15+** on the Node 24 line,
or **26+**, and npm. The pinned development version is in `.nvmrc`.

```sh
nvm install
nvm use
npm ci
npm start
```

Open <http://localhost:4200>. Click **Login** to enter the console. No credentials
are required. Preview access survives reloads in the same browser tab; **Logout**
clears it and returns to the login page.

```sh
npm run build       # production output: dist/trustyca-ui/browser
npm test            # run the Vitest navigation tests once
npm run test:watch  # development test watcher
```

## Included

- Responsive Material toolbar, navigation drawer, and profile dropdown.
- Dashboard, Issuers, and Certificates routes with empty states.
- Account and Settings placeholder pages, opened through the profile menu.
- Original shield/check logo, SVG wordmark, and multi-resolution `favicon.ico`.
- Lazy-loaded standalone pages, signals, strict TypeScript and template checks,
  and a custom Material 3 theme. Fonts and icons are local, with no CDN requests.

## Project structure

```text
public/
  brand/              SVG mark and full wordmark
  favicon.ico         16, 32, 48, and 64 px icon
src/app/
  core/
    auth/             Preview session and route guard
    api/              Reserved transport boundary; integration notes inside
  layout/             Console toolbar, profile menu, and responsive navigation
  features/
    login/
    dashboard/
    issuers/
    certificates/
    account/
    settings/
  shared/             Brand, SVG icons, page heading, and empty-state components
  app.routes.ts       Application routes and lazy loading
src/libts/            Framework-free utilities: logging, JSON, strings, dates, storage
src/models/           Token and UserInfo models
src/types/            Interfaces shared by the layers (IAppUser, IAppPlatform, ...)
src/services/trustyca/
  protogen/           Generated protobuf messages and gRPC-Web clients (make proto)
  rpc/                Hand-written service wrappers; enums.ts is generated
src/styles.scss       Material theme and shared presentation styles
```

## API clients

`make proto` regenerates the TypeScript clients from the protos of the `trustyca`
checkout next to this repository (`TRUSTYCA_PROJ`, default `../trustyca`):
`@protobuf-ts/protoc` writes the messages and gRPC-Web clients to
`src/services/trustyca/protogen`, the `effectivesecurity/protoc-gen-go` image
writes the enum display names to `src/services/trustyca/rpc/enums.ts`, and
`npm run format:fix` formats the result. Generated files are committed and never
edited by hand; `protogen` is excluded from Prettier and ESLint. The committed
clients match `trustyca` commit `0c02438`; regenerate after pulling the backend
and commit the result.

`npm run lint`, `npm run format` and `npm run typecheck` (together: `make lint`)
check the sources, the formatting and the types. The design and the execution
plan are in [Documentation/DESIGN.md](Documentation/DESIGN.md) and
[Documentation/PLAN.md](Documentation/PLAN.md).

The session-storage flag and route guard only simulate the login flow. Replace
them with real authentication and server-side authorization before connecting
protected services. Counts are shown as unavailable rather than populated with
sample production data.

For static hosting, configure SPA fallback to `index.html` so deep links such as
`/certificates` work on refresh. This is a client-rendered application; SSR is not
enabled.
