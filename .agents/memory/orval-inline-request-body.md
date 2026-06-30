---
name: Orval inline request bodies break codegen
description: Why POST/PUT request bodies in openapi.yaml must use a named component $ref, not an inline schema
---

When adding a write endpoint to `lib/api-spec/openapi.yaml`, define the request body as a `$ref` to a **named** component in `components/schemas`, never as an inline `schema:` block under `requestBody.content`.

**Why:** Orval generates a value (camelCase zod const) and a type (PascalCase) from each operation. An inline request body makes orval emit an extra body schema whose generated name collides with another generated export, producing a duplicate-export error (TS2308) at client typecheck. A named component avoids the clash because the camelCase const vs PascalCase type names don't collide.

**How to apply:** For any new `requestBody`, add e.g. `BulkCustomerImport` under `components/schemas`, then reference it with `$ref: "#/components/schemas/BulkCustomerImport"`. After editing the spec, run `pnpm --filter @workspace/api-spec run codegen` before typechecking any client. The generated zod body schema (e.g. `BulkCreateCustomersBody`) is what the Express route should `safeParse` against, and it carries array `minItems`/`maxItems` bounds straight through to server validation.
