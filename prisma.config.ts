import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // prisma generate doesn't need a real DB; use env var for migrate
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/dummy',
  },
  migrations: {
    path: 'prisma/migrations',
  },
});
