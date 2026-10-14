-- Login account of each team member: an aliado signs in with their own user and sees only the
-- "Aliado" panel in /cliente (their visits and homes), never the admin. Additive and re-runnable.
-- Run after 008_team_and_visits.
SET @team_account_ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='team_members' AND column_name='account_id')=0,
  'ALTER TABLE team_members ADD COLUMN account_id VARCHAR(64) NULL AFTER status, ADD UNIQUE KEY team_members_account_unique (account_id)', 'SELECT 1');
PREPARE team_account_migration FROM @team_account_ddl;
EXECUTE team_account_migration;
DEALLOCATE PREPARE team_account_migration;
