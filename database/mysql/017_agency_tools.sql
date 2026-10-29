-- Agency tools, part 2. Additive and re-runnable. Run after 016.
-- agency_clients.first_contact_at: when somebody first answered the client, to measure how fast
--   the agency responds.
-- agency_agents.login_account_id: the agent's own user (client_accounts.kind = 'agente'); they see
--   only the clients assigned to them.
-- agency_share_links: read-only report of one home for its owner, opened with a secret link.
-- google_calendar_links / google_calendar_events: Zentro copies the account's calendar into its
--   Google Calendar. The refresh token is stored encrypted.
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='agency_clients' AND column_name='first_contact_at')=0,
  'ALTER TABLE agency_clients ADD COLUMN first_contact_at DATETIME NULL AFTER last_contact_at', 'SELECT 1');
PREPARE patch FROM @ddl; EXECUTE patch; DEALLOCATE PREPARE patch;
UPDATE agency_clients SET first_contact_at = last_contact_at WHERE first_contact_at IS NULL AND last_contact_at IS NOT NULL;

SET @ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='agency_agents' AND column_name='login_account_id')=0,
  'ALTER TABLE agency_agents ADD COLUMN login_account_id VARCHAR(64) NULL AFTER color, ADD UNIQUE KEY agency_agents_login_unique (login_account_id)', 'SELECT 1');
PREPARE patch FROM @ddl; EXECUTE patch; DEALLOCATE PREPARE patch;

CREATE TABLE IF NOT EXISTS agency_share_links (
  token CHAR(43) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL,
  property_slug VARCHAR(180) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  KEY agency_share_links_account_idx (account_id, property_slug),
  CONSTRAINT agency_share_links_agency_fk FOREIGN KEY (account_id) REFERENCES agencies(account_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS google_calendar_links (
  account_id VARCHAR(64) PRIMARY KEY,
  google_email VARCHAR(190) NULL,
  refresh_token VARCHAR(1024) NOT NULL,
  connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_sync_at DATETIME NULL,
  last_error VARCHAR(255) NULL,
  CONSTRAINT google_calendar_links_account_fk FOREIGN KEY (account_id) REFERENCES client_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS google_calendar_events (
  account_id VARCHAR(64) NOT NULL,
  zentro_id VARCHAR(120) NOT NULL,
  google_id VARCHAR(64) NOT NULL,
  fingerprint CHAR(64) NOT NULL,
  starts_at DATETIME NOT NULL,
  PRIMARY KEY (account_id, zentro_id),
  CONSTRAINT google_calendar_events_link_fk FOREIGN KEY (account_id) REFERENCES google_calendar_links(account_id) ON DELETE CASCADE
) ENGINE=InnoDB;
