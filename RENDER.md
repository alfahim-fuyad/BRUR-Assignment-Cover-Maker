# Render + Neon deployment

This repository is prepared as a Render Blueprint with two services:

- `brur-assignment-cover-maker` — static Vite frontend
- `brur-assignment-api` — Node/Express API with `/api/healthz`

## Deploy from GitHub

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and select the GitHub repository.
3. Render will read `render.yaml` and create both services.
4. After the Blueprint is created, complete the prompted secret values for the API service.

## Environment variables

Set these on **`brur-assignment-api`**, not on the static frontend:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon’s pooled PostgreSQL connection string |
| `NODE_ENV` | `production` |

`DATABASE_URL` must be added as a Render secret. Do not commit it to GitHub or place it in `render.yaml`.

`ADMIN_USERNAME` and `ADMIN_PASSWORD` are reserved placeholders in the Blueprint. The current project does not contain an admin authentication flow, so these values are not read or used until that feature is implemented.

The frontend currently works client-side and does not call the API or database. The API/Neon service is deployed and health-checked so it is ready for future server-backed features.

## Manual commands

If the services are created separately instead of using the Blueprint:

- Frontend build: `pnpm install --frozen-lockfile && PORT=10000 BASE_PATH=/ pnpm --filter @workspace/brur-cover-maker run build`
- Frontend publish directory: `artifacts/brur-cover-maker/dist/public`
- API build: `pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build`
- API start: `pnpm --filter @workspace/api-server run start`
- API health check: `/api/healthz`