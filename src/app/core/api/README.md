# API boundary

The transport and the services live outside Angular, in `src/services/trustyca`
(generated `protogen/`, hand-written `rpc/`, `transport.ts`), with the platform,
storage and user state in `src/services` and the shared interfaces in
`src/types`. This folder holds the Angular side of that boundary
(`Documentation/DESIGN.md` sections 3.1 and 10):

- `tokens.ts`: the injection tokens pages use, typed by the `I*Service`
  interfaces.
- `providers.ts`: `provideTrustyApi()`, the configuration, platform, storage,
  user, transport and the services of the session (Auth, Orgs, Status), once per
  application.
- `ca-providers.ts`: `provideCaApi()`, the CA and CIS services, provided by the
  lazy CA routes (`features/ca/ca.routes.ts`) so the CA messages stay out of the
  initial bundle. Import CA code from its own module
  (`src/services/trustyca/rpc/CaService`), never through a barrel the login loads.
- `errors.ts`: `toUiError()`, an `RpcError` or REST failure as the console shows
  it.
- `paged-resource.ts`: cursor paging over a list RPC with signals; `app-data-table`
  takes one as `[paged]` and drives "Load more" from it.

The stores next to this folder build on it: `core/auth/AuthStore` (the session, the
org and the caller scope) and `core/tenant/TenantStore` (the projects, the project
selection persisted per org in `AppUser`, and the issuer labels the CA pages collect).
Pages read the stores; only the stores and the pages that mutate call the services.

Pages inject the interfaces, never the generated clients, so a page test gets a
fake service (`src/app/testing/test-api.ts`) and the generated code is exercised
by the service specs against the `FakeTransport` only.
