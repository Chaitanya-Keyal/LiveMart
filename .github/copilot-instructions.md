# LiveMart AI Coding Guidelines

## Architecture Overview

LiveMart is a full-stack e-commerce platform with role-based access control:

- **Backend**: FastAPI + SQLModel + PostgreSQL with JWT authentication and multi-role support (customer/retailer/wholesaler/delivery_partner)
- **Frontend**: React 19 + TanStack Router/Query + Chakra UI v3 with auto-generated TypeScript client
- **Infrastructure**: Docker Compose with Traefik reverse proxy for development and production

### Key Structural Decisions

**Multi-role system**: Users can have multiple roles simultaneously via `UserRole` many-to-many relationship. The `active_role` field tracks which role is currently active. Use `user.has_role()` to check permissions and `require_role()` dependency for endpoint protection.

**Auto-generated frontend client**: The TypeScript API client in `frontend/src/client/` is generated from OpenAPI schema. Never edit these files manually. Run `./scripts/generate-client.sh` after backend schema changes.

**Separation of concerns**: Backend follows CRUD pattern (`app/crud/`), route handlers (`app/api/routes/`), and models (`app/models/`). Dependencies are injected via FastAPI's `Depends()` - see `app/api/deps.py` for `SessionDep`, `CurrentUser`, `require_role()`, etc.

## Development Workflows

### Backend Development

**Start services**: `docker compose watch` (auto-reloads on code changes)

**Database migrations**:
```bash
docker compose exec backend bash
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

**Models**: Define in `app/models/` inheriting from `TimestampModel` (provides `id`, `created_at`, `updated_at`, `deleted_at`). Update both SQLModel table definitions AND Pydantic schemas.

**Email templates**: Edit `.mjml` files in `app/email-templates/src/`, use MJML VS Code extension to export to `build/` directory as HTML.

**Testing locally without Docker**: Stop service with `docker compose stop backend`, then `cd backend && fastapi dev app/main.py`

### Frontend Development

**Start dev server**: `cd frontend && npm run dev` (runs outside Docker at localhost:5173)

**Routing**: TanStack Router uses file-based routing. Routes export `createFileRoute()`. Protected routes inherit from `_layout.tsx` which checks `isLoggedIn()`.

**API calls**: Use generated client from `@/client`. TanStack Query handles caching/refetching. Example:
```tsx
const { data } = useQuery({
  queryKey: ["users"],
  queryFn: () => UsersService.readUsers()
})
```

**Theme customization**: Chakra UI v3 uses `createSystem()` in `theme.tsx`. Define custom recipes in `theme/` directory (see `button.recipe.ts`).

**ChakraUI**: For all UI components, use Chakra UI v3 components and hooks. Use the connected MCP tools to learn about Chakra UI v3 features and components available.

### Critical Regeneration Step

After ANY backend model/route/schema change:
1. Ensure backend is running
2. Run `./scripts/generate-client.sh` (extracts OpenAPI schema and regenerates TypeScript client)
3. Commit generated `frontend/src/client/` changes with your backend changes

## Project Conventions

### Code Style

**Backend**: Uses `ruff` for linting/formatting (configured in `pyproject.toml`). Pre-commit hooks enforce this automatically.

**Frontend**: Uses `biome` for linting/formatting. Run `npm run lint` or let pre-commit handle it.

**Pre-commit**: Install with `uv run pre-commit install`. Runs ruff, biome, YAML/TOML checks before each commit.

### Authentication Patterns

**JWT tokens**: Access tokens expire in 8 days (`ACCESS_TOKEN_EXPIRE_MINUTES`). Token endpoint: `/api/v1/login/access-token`

**Dependencies**:
- `CurrentUser`: Requires authenticated + email-verified user
- `CurrentUserUnverified`: Authenticated but email not yet verified
- `require_role(*roles)`: Checks `active_role` matches allowed roles
- `require_admin`: Shorthand for admin-only endpoints

**Email verification**: New users get `email_verified=False`. OTP sent via email. Login blocked until verified (except endpoints using `CurrentUserUnverified`).

Admin user role only exists for superusers. Regular users cannot have admin role assigned. This role is essentially meant for system-level tasks, like managing payments between parties, resolving disputes, etc. This role does not need separate frontend UI, its functionality is accessed through superuser privileges, not a distinct "admin" interface. Essentially, the admin role is a backend-only role for elevated system management tasks. There would rarely, if ever, be a need to add separate api endpoints specifically for the admin role.

### Database Patterns

**Base model**: All tables extend `TimestampModel` from `app/models/common.py` (UUID primary key, created/updated/deleted timestamps)

**Relationships**: Use SQLModel `Relationship()` with `back_populates`. Set `cascade_delete=True` for dependent records. Example in `User.items` and `User.user_roles`.

**Queries**: Use SQLModel's `select()` for type-safe queries. Get DB session via `SessionDep` dependency. Always commit after modifications.

### Environment Configuration

**Settings**: `app/core/config.py` reads from `.env` file one level above backend. Uses Pydantic's `BaseSettings` with validation.

**Required secrets**: Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"` for `SECRET_KEY`, `POSTGRES_PASSWORD`, `FIRST_SUPERUSER_PASSWORD`.

**CORS**: Configure via `BACKEND_CORS_ORIGINS` (comma-separated URLs). `FRONTEND_HOST` automatically included.

## Integration Points

**Email sending**: Conditional on `settings.emails_enabled` (requires SMTP config). Use utilities from `app/utils/email.py`. Templates in `app/email-templates/build/`.

**OAuth**: Google OAuth supported via Authlib. Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.

**Sentry**: Auto-configured if `SENTRY_DSN` set and `ENVIRONMENT != "local"` (see `app/main.py`).

**Traefik routing**: Production uses subdomain routing (`api.domain.com`, `dashboard.domain.com`). Development can simulate with wildcard domains (e.g., `127.0.0.1.nip.io`) by setting `DOMAIN` in `.env`.

## Common Tasks

**Add new role**: Update `RoleEnum` in `app/models/role.py`, create migrations, update signup/registration flows to handle new role.

**Add protected endpoint**: Use `dependencies=[Depends(require_role(RoleEnum.ADMIN))]` in route decorator. Active role is checked, not just role existence.

**Add new model**: Create in `app/models/`, inherit `TimestampModel`, generate migration, update CRUD in `app/crud/`, add route handlers, regenerate frontend client.

**Update frontend UI**: Edit components in `frontend/src/components/`. Use Chakra UI v3 components. Check `system` theme from `theme.tsx` for custom tokens/recipes.

**Switch user's active role**: Use `crud.switch_active_role()` or the `/api/v1/users/me/roles/switch` endpoint. User must already have the role.


## Workflow Rules for Copilot to follow if an entire feature is requested

1. First start with the backend, and confirm with the user if all changes are alright.
2. The user will create alembic migrations, if any, and lint the backend code. You do not need to do this.
3. The user will also generate the frontend client.
4. Now if there are any specific changes needed in the migration file created, make those changes.
5. Finally, move on to the frontend, and keeping in mind the changes made to the backend, make the necessary changes to the frontend. Following the project conventions mentioned above, with a clean UI.
