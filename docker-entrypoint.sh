#!/bin/sh
set -e

# ==============================================================================
# Coaching Center Management System - Container Runtime Entrypoint
# Responsibilities:
# 1. Wait for database readiness if running migrations
# 2. Automatically apply Prisma migrations (when RUN_MIGRATIONS=true)
# 3. Gracefully execute container command with proper signal forwarding
# ==============================================================================

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "==> [Entrypoint] RUN_MIGRATIONS is set to true. Verifying PostgreSQL connectivity..."

  node --input-type=module -e "
    import pg from 'pg';
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 3000,
    });
    let attempts = 0;
    const maxAttempts = 15;

    async function check() {
      while (attempts < maxAttempts) {
        try {
          const client = await pool.connect();
          await client.query('SELECT 1');
          client.release();
          await pool.end();
          process.exit(0);
        } catch {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      process.exit(1);
    }
    check();
  " || {
    echo "==> [Entrypoint] PostgreSQL probe reached timeout. Proceeding with migration attempt..."
  }

  echo "==> [Entrypoint] Applying Prisma database migrations (prisma migrate deploy)..."
  npx prisma migrate deploy
  echo "==> [Entrypoint] Database migrations applied successfully."
fi

# Execute CMD passed from Dockerfile or docker-compose
exec "$@"
