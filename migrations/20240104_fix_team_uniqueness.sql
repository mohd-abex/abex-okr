-- Migration: Scope team name uniqueness to organization
-- Description: Changes the unique constraint on 'teams' table from just (name) to (organization_id, name).

-- 1. Drop the existing global unique constraint
-- Note: The default name for a unique constraint on 'name' is 'teams_name_key'. 
-- If your constraint has a different name, you may need to check the exact name in your database.
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_name_key;

-- 2. Add the new composite unique constraint
ALTER TABLE teams ADD CONSTRAINT teams_organization_id_name_key UNIQUE (organization_id, name);
