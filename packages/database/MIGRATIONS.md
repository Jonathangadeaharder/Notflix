# Database Migrations Guide

This package uses [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) for database migrations.

## Commands

```bash
# Generate a new migration from schema changes
pnpm --filter @notflix/database db:generate

# Apply pending migrations
pnpm --filter @notflix/database db:migrate

# Push schema directly (development only - no migration files)
pnpm --filter @notflix/database db:push

# Open Drizzle Studio (database GUI)
pnpm --filter @notflix/database db:studio

# Check migration status
pnpm --filter @notflix/database db:check
```

## Workflow

### Development (Quick Iteration)

Use `db:push` for rapid prototyping:

```bash
pnpm --filter @notflix/database db:push
```

### Production (Tracked Migrations)

1. Make changes to `schema.ts`
2. Generate migration:
   ```bash
   pnpm --filter @notflix/database db:generate
   ```
3. Review the generated SQL in `migrations/`
4. Apply migration:
   ```bash
   pnpm --filter @notflix/database db:migrate
   ```

## Migration Files

Migrations are stored in `packages/database/migrations/`.
Each migration is a SQL file with a timestamp prefix.

## Configuration

See `drizzle.config.ts` for database connection settings.
Uses `DATABASE_URL` environment variable or defaults to local dev database.
