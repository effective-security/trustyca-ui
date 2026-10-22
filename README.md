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
src/styles.scss       Material theme and shared presentation styles
```

## Next phase: gRPC-web

Keep generated protobuf messages and client stubs under `src/app/core/api/generated/`
when introducing code generation. Add handwritten injectable adapters beside that
directory, then feature services for the views. See
[the integration notes](src/app/core/api/README.md). No protobuf generator,
transport runtime, API URL, or backend dependency is configured yet.

The session-storage flag and route guard only simulate the login flow. Replace
them with real authentication and server-side authorization before connecting
protected services. Counts are shown as unavailable rather than populated with
sample production data.

For static hosting, configure SPA fallback to `index.html` so deep links such as
`/certificates` work on refresh. This is a client-rendered application; SSR is not
enabled.
