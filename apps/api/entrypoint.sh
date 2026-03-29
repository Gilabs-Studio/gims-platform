#!/bin/sh

# Fail immediately if a command exits with a non-zero status
set -e

echo "Starting deployment entrypoint script..."

CURRENT_ENV="${APP_ENV:-$ENV}"
if [ "$CURRENT_ENV" = "development" ] || [ "$CURRENT_ENV" = "staging" ] || [ -z "$CURRENT_ENV" ]; then
    echo "Environment is $CURRENT_ENV (or development default). Running full reset and seeding..."

    echo "Reset DB (Migrate & Drop all tables if logic applies in migrate tool)..."
    # Actually, the user's migrate tool needs an argument 'reset' based on prompt: `go run migrate.go reset` or `./migrate reset`
    ./migrate reset

    echo "Run migration..."
    ./migrate

    echo "Run full seeder..."
    ./seed

    echo "Clear cache..."
    if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
        if [ -n "$REDIS_PASSWORD" ]; then
            redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" FLUSHALL
        else
            redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" FLUSHALL
        fi
        echo "Cache cleared."
    else
        echo "REDIS_HOST or REDIS_PORT not set. Skipping Redis clear."
    fi
else
    echo "Environment is $CURRENT_ENV. Skipping Database wipe, seeding, and cache clear..."
fi

echo "Start app..."
exec ./server
