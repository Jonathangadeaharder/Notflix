import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './schema.ts',
    out: './migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'postgres://admin:password@127.0.0.1:5432/main_db',
    },
});
