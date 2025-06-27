-- CAG-Chains Database Initialization
-- This script initializes the PostgreSQL database for CAG-Chains

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS cag_chains;

-- Set default search path
ALTER DATABASE cag_chains SET search_path TO cag_chains, public;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA cag_chains TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cag_chains TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA cag_chains TO postgres;

-- Enable row level security
ALTER DATABASE cag_chains SET row_security = on;

-- Create initial tables will be handled by Drizzle migrations
-- This script just sets up the basic database structure 