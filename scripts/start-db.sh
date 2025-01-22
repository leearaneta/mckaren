#!/bin/bash

# Default values
DB_NAME="mckaren"
DB_USER="mckaren"
DB_PASSWORD="mckaren"
CONTAINER_NAME="mckaren-postgres"
PORT="5433"

# Check if container exists
if [ ! "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    if [ "$(docker ps -aq -f status=exited -f name=$CONTAINER_NAME)" ]; then
        # Cleanup if container exists but is stopped
        echo "Removing stopped container..."
        docker rm $CONTAINER_NAME
    fi
    
    # Start new container
    echo "Starting new Postgres container..."
    docker run --name $CONTAINER_NAME \
        -e POSTGRES_DB=$DB_NAME \
        -e POSTGRES_USER=$DB_USER \
        -e POSTGRES_PASSWORD=$DB_PASSWORD \
        -e TZ=America/New_York \
        -p $PORT:5432 \
        -d postgres:15
    
    echo "Waiting for database to start..."
    # Wait for PostgreSQL to be ready
    for i in {1..30}; do
        if docker exec $CONTAINER_NAME pg_isready -U $DB_USER; then
            # Add a small delay even after pg_isready returns success
            sleep 3
            break
        fi
        echo "Waiting for postgres... (attempt $i/30)"
        sleep 1
    done
else
    echo "Container already running"
fi

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Get the root directory of the project
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." &> /dev/null && pwd )"
# Path to migrations
MIGRATIONS_DIR="$PROJECT_ROOT/migrations"

# Initialize schema
echo "Initializing database schema..."
for migration in "$MIGRATIONS_DIR"/*.sql; do
    echo "Running migration: $migration"
    if ! docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < "$migration"; then
        echo "Failed to run migration: $migration"
        echo "Retrying in 5 seconds..."
        sleep 5
        if ! docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < "$migration"; then
            echo "Migration failed after retry. Exiting."
            exit 1
        fi
    fi
done

# Print connection info
echo "PostgreSQL is running on localhost:$PORT"
echo "Database: $DB_NAME"
echo "Username: $DB_USER"
echo "Password: $DB_PASSWORD" 