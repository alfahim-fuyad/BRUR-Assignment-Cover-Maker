# BRUR Assignment Cover Maker

Responsive Begum Rokeya University cover-page builder for creating, previewing, saving, printing, and downloading assignment covers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/brur-cover-maker/src/App.tsx` — cover maker flow, local data catalogs, live preview, draft persistence, and download actions.
- `artifacts/brur-cover-maker/src/index.css` — BRUR-derived visual theme and responsive layout styles.
- `attached_assets/BRUR_Logo_1789044011278.svg` — official BRUR logo used by the cover preview and downloaded cover.

## Architecture decisions

- The first version is frontend-only and stores drafts in browser localStorage so students can use it without account setup.
- Cover output is generated from the same live form state as the preview, so print and downloads stay aligned with the selected template.
- DOCX downloads start from the supplied original template and update only existing text runs in `word/document.xml`; template fonts, bold/colour settings, sizes, spacing, images, and layout are not recreated in code.
- The CSE teacher list is seeded from the supplied roster and course data is filtered by selected department.

## Product

- Students choose a department and course, search/select or edit a teacher, enter individual or group information, choose Simple/Professional/Modern templates, and see an A4-like live preview.
- Students can save drafts locally, copy the previous assignment, print directly, or download an original-format DOCX plus HTML/text alternatives.

## User preferences

- The interface must be usable on mobile and desktop.

## Gotchas

- Artifact builds expect `PORT` and `BASE_PATH` from the managed workflow when running Vite directly.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
