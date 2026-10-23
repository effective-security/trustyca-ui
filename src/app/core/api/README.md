# API boundary

The transport and the services live outside Angular, in `src/services/trustyca`
(generated `protogen/`, hand-written `rpc/`), with the platform, storage and user
state in `src/services` and the shared interfaces in `src/types`. This folder
holds the Angular side of that boundary: the injection tokens,
`provideTrustyApi()`, the error mapping and the resource helpers
(`Documentation/DESIGN.md` sections 3.1 and 10).

Pages inject the `I*Service` interfaces, never the generated clients, so a page
test gets a fake service and the generated code is exercised in the service
tests only. `core/auth/PreviewSession` and `previewGuard` are the placeholder
login of the scaffold; phase 2 of `Documentation/PLAN.md` replaces them with the
real authentication.
