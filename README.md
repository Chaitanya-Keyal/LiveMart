# LiveMart

LiveMart is a full-stack e-commerce platform that pairs a FastAPI backend with a React dashboard. The project includes Docker-based tooling, automated API client generation, and production-ready deployment guidance so you can focus on building features instead of plumbing.

## Tech Stack

- FastAPI, SQLModel, and Pydantic for the backend API layer.
- PostgreSQL as the relational datastore.
- React 19 with TypeScript, Vite, Chakra UI, and TanStack Query/Router on the frontend.
- JWT authentication with secure password hashing and password recovery emails.
- Traefik-powered reverse proxy configuration and Docker Compose workflows.
- GitHub Actions workflows prepared for continuous deployment environments.

## Highlights

- Unified local development with Docker Compose or native tooling.
- Auto-generated TypeScript client powered by `@hey-api/openapi-ts` to keep the UI in sync with the API schema.
- Admin-facing dashboard with responsive layout and dark mode support.
- Infrastructure scripts for database migrations, email templates, and container image builds.

## Quick Start

1. Install the prerequisites: Docker, Docker Compose, Node.js 20+, and the [uv](https://docs.astral.sh/uv/) Python tool.
2. Copy `.env.example` to `.env` and adjust the secrets (see below).
3. Start the stack with `docker compose watch` or follow the alternative flows in `development.md` for running services directly.
4. When backend schemas change, run `./scripts/generate-client.sh` to refresh the generated frontend client.
5. Visit `http://localhost:5173` for the frontend and `http://localhost:8000/docs` for the API explorer.

## Secrets

Several environment variables default to placeholder values. Generate unique secrets before deploying:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Update `SECRET_KEY`, `FIRST_SUPERUSER_PASSWORD`, `POSTGRES_PASSWORD`, and any SMTP credentials in `.env` or your deployment environment.

## Project Docs

- Backend guide: [backend/README.md](backend/README.md)
- Frontend guide: [frontend/README.md](frontend/README.md)
- Local development reference: [development.md](development.md)
- Deployment reference: [deployment.md](deployment.md)
