# Database Migrations Guide

This package uses [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) for database migrations.

## Commands

```bash
# Generate a new migration from schema changes
npm run db:generate --workspace=@notflix/database

# Apply pending migrations
npm run db:migrate --workspace=@notflix/database

# Push schema directly (development only - no migration files)
npm run db:push --workspace=@notflix/database

# Open Drizzle Studio (database GUI)
npm run db:studio --workspace=@notflix/database

# Check migration status
npm run db:check --workspace=@notflix/database
```

## Workflow

### Development (Quick Iteration)

Use `db:push` for rapid prototyping:

```bash
npm run db:push --workspace=@notflix/database
```

### Production (Tracked Migrations)

1. Make changes to `schema.ts`
2. Generate migration:
   ```bash
   npm run db:generate --workspace=@notflix/database
   ```
3. Review the generated SQL in `migrations/`
4. Apply migration:
   ```bash
   npm run db:migrate --workspace=@notflix/database
   ```

## Migration Files

Migrations are stored in `packages/database/migrations/`.
Each migration is a SQL file with a timestamp prefix.

## Configuration

See `drizzle.config.ts` for database connection settings.
Uses `DATABASE_URL` environment variable or defaults to local dev database.
