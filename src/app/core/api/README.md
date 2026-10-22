# Future gRPC-web integration

This folder reserves the transport boundary. There is no server connection, HTTP
provider, API configuration, or generated protobuf code in this phase.

When adding the generator:

1. Put generated TypeScript messages and gRPC-web stubs in `generated/` (create it
   as part of code generation). Keep generated files separate from handwritten code.
2. Add injectable client adapters here to own transport setup and configuration.
3. Expose feature-facing services to the pages in `features/`. Keep generated
   transport types out of shared presentation components where practical.
4. Replace `core/auth/PreviewSession` and `previewGuard` with real authentication.
   The current session flag and guard are navigation conveniences, not security.

Choose the protobuf generator and runtime together in the next phase; no transport
dependency is installed yet.
