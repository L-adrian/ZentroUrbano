-- CRM for real-estate agencies in Mi cuenta. Additive and re-runnable. Run after 015.
-- agencies: an owner account that the admin turned into an agency (inmobiliaria). Only these
-- accounts see Clientes; a regular owner keeps the simple panel. Turning it off (active = 0) keeps
-- the clients, so turning it on again brings them back.
-- agency_agents: the agency's people. They do not sign in yet; the agency assigns clients to them.
-- agency_clients: each person interested in renting, with the stage of the funnel they are in.
-- Times are UTC, like the rest of the site.
CREATE TABLE IF NOT EXISTS agencies (
  account_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT agencies_account_fk FOREIGN KEY (account_id) REFERENCES client_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agency_agents (
  id CHAR(36) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  whatsapp VARCHAR(32) NULL,
  color VARCHAR(16) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY agency_agents_account_idx (account_id),
  CONSTRAINT agency_agents_agency_fk FOREIGN KEY (account_id) REFERENCES agencies(account_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agency_clients (
  id CHAR(36) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  whatsapp VARCHAR(32) NULL,
  stage VARCHAR(20) NOT NULL DEFAULT 'nuevo',
  source VARCHAR(20) NOT NULL DEFAULT 'otro',
  budget_bob INT NULL,
  wants VARCHAR(160) NULL,
  property_slug VARCHAR(180) NULL,
  agent_id CHAR(36) NULL,
  next_step VARCHAR(160) NULL,
  next_step_at DATETIME NULL,
  last_contact_at DATETIME NULL,
  lost_reason VARCHAR(20) NULL,
  note VARCHAR(1000) NULL,
  stage_changed_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY agency_clients_account_idx (account_id, stage),
  KEY agency_clients_agent_idx (agent_id),
  CONSTRAINT agency_clients_agency_fk FOREIGN KEY (account_id) REFERENCES agencies(account_id) ON DELETE CASCADE,
  CONSTRAINT agency_clients_agent_fk FOREIGN KEY (agent_id) REFERENCES agency_agents(id) ON DELETE SET NULL
) ENGINE=InnoDB;
