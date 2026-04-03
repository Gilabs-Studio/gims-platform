#!/bin/bash

# Script untuk import timezone data dari TimezoneDB ke PostgreSQL
# Usage: ./import_timezone_data.sh

set -e

echo "Importing TimezoneDB data..."

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql is not installed"
    exit 1
fi

# Database connection parameters
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-gims}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# SQL file path
SQL_FILE="apps/api/data/geodata/time_zone.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "Error: SQL file not found at $SQL_FILE"
    exit 1
fi

echo "Connecting to database: $DB_NAME@$DB_HOST:$DB_PORT"

# Create tables first
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
-- Drop existing tables if exist
DROP TABLE IF EXISTS time_zones CASCADE;
DROP TABLE IF EXISTS countries CASCADE;

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
    country_code CHAR(2) PRIMARY KEY,
    country_name VARCHAR(45)
);

-- Create time_zones table
CREATE TABLE IF NOT EXISTS time_zones (
    id SERIAL PRIMARY KEY,
    zone_name VARCHAR(35) NOT NULL,
    country_code CHAR(2) REFERENCES countries(country_code),
    abbreviation VARCHAR(6) NOT NULL,
    time_start BIGINT NOT NULL,
    gmt_offset INT NOT NULL,
    dst CHAR(1) NOT NULL
);

-- Create indexes
CREATE INDEX idx_time_zones_zone_name ON time_zones(zone_name);
CREATE INDEX idx_time_zones_country_code ON time_zones(country_code);
CREATE INDEX idx_time_zones_time_start ON time_zones(time_start);
"

echo "Tables created successfully"

# Convert and import data
# Note: This is a simplified version. The actual SQL file from TimezoneDB is for MySQL
# and needs conversion for PostgreSQL

# For now, let's insert Indonesia timezones manually as fallback
echo "Inserting Indonesia timezone data..."

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
-- Insert Indonesia country
INSERT INTO countries (country_code, country_name) VALUES ('ID', 'Indonesia')
ON CONFLICT (country_code) DO NOTHING;

-- Insert Indonesia timezones (simplified, no DST)
INSERT INTO time_zones (zone_name, country_code, abbreviation, time_start, gmt_offset, dst) VALUES
('Asia/Jakarta', 'ID', 'WIB', 0, 25200, '0'),
('Asia/Makassar', 'ID', 'WITA', 0, 28800, '0'),
('Asia/Jayapura', 'ID', 'WIT', 0, 32400, '0')
ON CONFLICT DO NOTHING;
"

echo "Timezone data imported successfully!"
echo ""
echo "To import full TimezoneDB data, please convert the MySQL SQL file to PostgreSQL format."
echo "You can use tools like:"
echo "  - mysql2pgsql: https://github.com/philipsouthwell/mysql2pgsql"
echo "  - ora2pg (supports MySQL to PostgreSQL)"
echo "  - Manual conversion with sed/awk"
