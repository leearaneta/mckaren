#!/bin/bash

# Check if connection string is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <connection-string>"
    echo "Example: $0 'postgres://user:password@host:5432/dbname'"
    exit 1
fi

CONNECTION_STRING="$1"

# Extract database name from connection string
DB_NAME=$(echo "$CONNECTION_STRING" | sed -n 's/.*\/\([^?]*\).*/\1/p')
if [ -z "$DB_NAME" ]; then
    echo "Error: Could not extract database name from connection string"
    exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Get the root directory of the project
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." &> /dev/null && pwd )"
# Path to migrations
MIGRATIONS_DIR="$PROJECT_ROOT/migrations"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "Error: psql is not installed. Please install PostgreSQL client tools."
    exit 1
fi

# Initialize migrations table first
echo "Ensuring migrations table exists..."
psql "$CONNECTION_STRING" << EOF
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
EOF

if [ $? -ne 0 ]; then
    echo "Error: Failed to connect to database or create migrations table"
    exit 1
fi

# Run pending migrations
echo "Running pending migrations..."
for migration in "$MIGRATIONS_DIR"/*.sql; do
    migration_name=$(basename "$migration")
    
    # Check if migration has already been applied
    migration_exists=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM migrations WHERE name = '$migration_name';")
    if [ "$migration_exists" -eq "0" ]; then
        echo "Running migration: $migration_name"
        
        # Run migration with database name variable
        if PGOPTIONS="--client-min-messages=warning" psql "$CONNECTION_STRING" -v DBNAME="$DB_NAME" < "$migration"; then
            # Record successful migration
            psql "$CONNECTION_STRING" -c "INSERT INTO migrations (name) VALUES ('$migration_name');"
            echo "Migration successful: $migration_name"
        else
            echo "Migration failed: $migration_name"
            exit 1
        fi
    else
        echo "Skipping already applied migration: $migration_name"
    fi
done

echo "All migrations completed successfully!" 