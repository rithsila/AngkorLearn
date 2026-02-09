-- Learning OS Database Initialization
-- This script runs on first postgres container start

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE learningos TO dev;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Learning OS database initialized successfully';
END $$;
