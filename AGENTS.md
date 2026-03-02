# AGENTS.md

Guidance for coding agents working in `C:\Users\Mark Barela\Dev\estimator`.

## Project Snapshot

- Stack: Wails v2 + Go backend + React/TypeScript frontend (Vite).
- Go module: `cabinet-estimator`.
- Frontend package root: `frontend/`.
- Generated Wails bridge code lives in `frontend/wailsjs/`.
- Persistent app data is a SQLite DB under user home: `~/.cabinet-estimator/cabinet_estimator.db`.

## Repository Layout

- `main.go`: Wails app bootstrap and runtime options.
- `app.go`: Wails-bound methods exposed to frontend.
- `internal/database/*`: GORM models and DB initialization.
- `internal/services/*`: business logic and data access.
- `internal/types/dto.go`: backend DTOs for Wails request payloads.
- `frontend/src/components/*`: UI components by feature.
- `frontend/src/types/index.ts`: frontend shared interfaces.
- `frontend/src/lib/utils.ts`: utility helpers.

## Source of Truth for Rules

- Checked for Cursor rules: no `.cursorrules` and no files under `.cursor/rules/`.
- Checked for Copilot instructions: no `.github/copilot-instructions.md`.
- Therefore, this file is the primary agent guidance in this repository.

## Environment and Tooling

- Go version in module: `go 1.23`.
- Frontend scripts are npm-based.
- No ESLint/Prettier config is currently present.
- No test files currently exist (`*_test.go`, `*.test.tsx`, `*.spec.tsx` not found).

## Build / Dev / Test Commands

Run from repo root unless noted.

### Install

```bash
npm --prefix frontend install
```

### Live Development

```bash
wails dev
```

Notes:
- `wails dev` starts the Go app + Vite dev server.
- Frontend-only dev server can be run with:

```bash
npm --prefix frontend run dev
```

### Build

Full desktop app build:

```bash
wails build
```

Frontend production bundle + TS typecheck:

```bash
npm --prefix frontend run build
```

Backend compile check:

```bash
go build ./...
```

### Lint / Static Checks

There is no dedicated lint script yet. Use these checks:

```bash
go vet ./...
```

```bash
go test ./...
```

```bash
npm --prefix frontend run build
```

### Tests

Current state:
- No committed tests at time of writing.
- Go test command is still valid and should run cleanly.

Run all Go tests:

```bash
go test ./...
```

Run a single Go package:

```bash
go test ./internal/services
```

Run a single Go test by name (important for agent workflows):

```bash
go test ./internal/services -run TestEstimateService_Create -count=1
```

Run a single Go subtest:

```bash
go test ./internal/services -run 'TestEstimateService_Create/invalid_customer' -count=1
```

If frontend tests are added later, prefer adding a script (e.g. `test`) and document exact single-test invocation in `frontend/package.json`.

## Code Style Guidelines

Follow existing code patterns over personal preference.

### Cross-Cutting

- Keep diffs focused and minimal; do not refactor unrelated areas.
- Preserve current architecture: Wails bind layer (`app.go`) delegates to services.
- Do not edit generated files under `frontend/wailsjs/` manually.
- Use explicit, domain-oriented names (`EstimateJob`, `CreatePriceListItemRequest`).
- Favor small, composable helpers over deeply nested logic.

### Go Style

- Use `gofmt` formatting and standard import grouping.
- Package names are lowercase, no underscores (`services`, `database`, `types`).
- Exported symbols: PascalCase; unexported: camelCase.
- Keep service structs thin (`type XService struct { db *gorm.DB }`).
- Constructor pattern: `NewXService() *XService`.
- Methods should return typed values plus `error` (`(*Model, error)`, `[]Model, error`).
- Pass IDs as `uint` to match models and Wails bindings.
- For multi-write operations, use DB transactions (`db.Transaction(...)`).
- Prefer early returns on errors; avoid deeply nested `if` blocks.
- Avoid panics except for startup-fatal initialization paths (current DB init behavior).
- Keep SQL order/filter strings explicit and simple.

### Go Error Handling

- Always check `.Error` from GORM operations.
- Return raw errors unless there is clear value in wrapping/context.
- In transaction loops, return immediately on first failing update.
- In app lifecycle hooks, close resources in shutdown (`database.CloseDB()`).

### Data Models and DTOs

- Keep backend JSON tags aligned with frontend field names (`sortOrder`, `jobId`).
- Keep DTO types in `internal/types/dto.go` and frontend interfaces in `frontend/src/types/index.ts` synchronized.
- Use request structs named `CreateXRequest` / `UpdateXRequest`.
- Add fields in both backend and frontend types in the same change.

### TypeScript / React Style

- TypeScript is strict (`frontend/tsconfig.json` has `strict: true`); keep it that way.
- Prefer typed state: `useState<Type[]>([])`, `useState<Type | null>(null)`.
- Component files and component names: PascalCase.
- Local variables/functions: camelCase.
- Event handlers use `handleX` naming (`handleAddCategory`, `handleDelete`).
- Define prop interfaces near component declarations.
- Prefer `import type { ... }` for type-only imports.
- Keep UI shared primitives under `frontend/src/components/ui/`.
- Keep feature-specific UI under feature folders (`customers`, `estimates`, `pricelist`).

### Frontend Error Handling and UX

- Wrap async calls in `try/catch` and keep loading state consistent.
- On failure, log actionable messages (`console.error('Failed to ...', error)`).
- Keep optimistic UI updates reversible where appropriate (see reorder handlers).
- Validate user input before backend calls (`trim`, numeric parsing, required checks).
- Use guard clauses for missing required state (`if (!currentEstimate) return`).

### Imports and Module Boundaries

- Frontend import order should be consistent:
  1) React/external libs
  2) internal components/utils/types
  3) Wails bridge imports
- Avoid circular dependencies across feature folders.
- Backend `app.go` should orchestrate only; business logic stays in `internal/services`.

### Formatting and Readability

- Keep functions at a manageable size; extract helpers for repeated blocks.
- Prefer clear naming over comments; add comments only for non-obvious behavior.
- Maintain existing semicolon/style conventions within touched files.
- Keep Tailwind class lists readable and grouped logically.

## Agent Workflow Checklist

Before coding:
- Identify whether change touches backend, frontend, or both.
- If API shapes change, plan synchronized updates in Go DTOs + TS types + callers.

After coding:
- Run relevant checks:
  - `go test ./...`
  - `go vet ./...`
  - `npm --prefix frontend run build`
- If behavior changed materially, run `wails dev` for quick manual validation.

Before finalizing:
- Confirm no generated bridge files were manually modified.
- Confirm naming/typing consistency between `internal/types/dto.go` and `frontend/src/types/index.ts`.
- Keep commits focused and message the user-facing intent.
